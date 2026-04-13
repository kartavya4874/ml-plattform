"""Image classification trainer — EfficientNet transfer learning with ONNX export."""
import io
import os
import uuid
import zipfile
import pickle
from typing import Any, Callable
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from torchvision.models import EfficientNet_B0_Weights, ResNet50_Weights
from PIL import Image
from sklearn.metrics import accuracy_score, f1_score, classification_report
from app.services.storage_service import StorageService
from app.core.config import settings
import structlog

log = structlog.get_logger()
ProgressCb = Callable[[str, int], None]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class ZipImageDataset(Dataset):
    """In-memory image dataset loaded from a ZIP archive."""

    def __init__(self, images: list[tuple[bytes, int]], transform=None):
        self.images = images
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_bytes, label = self.images[idx]
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def _load_zip_dataset(file_bytes: bytes) -> tuple[list[tuple[bytes, int]], dict[str, int]]:
    """Load images from a class-structured ZIP archive."""
    class_to_idx: dict[str, int] = {}
    samples: list[tuple[bytes, int]] = []

    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        for name in sorted(zf.namelist()):
            parts = [p for p in name.split("/") if p and not p.startswith(".")]
            if len(parts) < 2:
                continue
            class_name = parts[-2]
            filename = parts[-1]
            if not filename.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp")):
                continue
            if class_name not in class_to_idx:
                class_to_idx[class_name] = len(class_to_idx)
            img_bytes = zf.read(name)
            samples.append((img_bytes, class_to_idx[class_name]))

    return samples, class_to_idx


def _build_model(backbone: str, num_classes: int) -> nn.Module:
    if backbone == "resnet50":
        model = models.resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    else:  # efficientnet_b0 default
        model = models.efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model.to(DEVICE)


def _get_transforms(train: bool) -> transforms.Compose:
    if train:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def train_image_classifier(
    file_bytes: bytes,
    config: dict,
    job_id: str,
    progress_cb: ProgressCb,
) -> dict[str, Any]:
    """Transfer learning pipeline for image classification."""
    progress_cb("Loading image dataset from ZIP", 15)

    samples, class_to_idx = _load_zip_dataset(file_bytes)
    if len(samples) == 0:
        raise ValueError("No images found in the ZIP archive. Expected subdirectory-per-class structure.")

    num_classes = len(class_to_idx)
    progress_cb(f"Loaded {len(samples)} images across {num_classes} classes", 20)

    # Train/val split
    from sklearn.model_selection import train_test_split
    labels = [s[1] for s in samples]
    train_samples, val_samples = train_test_split(
        samples, test_size=0.2, random_state=42, stratify=labels
    )

    train_ds = ZipImageDataset(train_samples, _get_transforms(train=True))
    val_ds = ZipImageDataset(val_samples, _get_transforms(train=False))

    batch_size = config.get("batch_size", 16)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    backbone = config.get("backbone", "efficientnet_b0")
    model = _build_model(backbone, num_classes)
    epochs = config.get("epochs", 10)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    best_state = None
    patience = 5
    no_improve = 0

    progress_cb("Starting fine-tuning", 25)

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        for imgs, lbls in train_loader:
            imgs, lbls = imgs.to(DEVICE), lbls.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, lbls)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        scheduler.step()

        # Validation
        model.eval()
        all_preds, all_labels = [], []
        with torch.no_grad():
            for imgs, lbls in val_loader:
                imgs = imgs.to(DEVICE)
                outputs = model(imgs)
                preds = outputs.argmax(dim=1).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(lbls.numpy())

        val_acc = accuracy_score(all_labels, all_preds)
        pct = 25 + int((epoch + 1) / epochs * 50)
        progress_cb(f"Epoch {epoch + 1}/{epochs} — val_acc={val_acc:.4f}", pct)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                progress_cb(f"Early stopping at epoch {epoch + 1}", pct)
                break

    # Load best weights
    if best_state:
        model.load_state_dict(best_state)

    model.eval()

    # Final evaluation
    all_preds, all_labels_final = [], []
    with torch.no_grad():
        for imgs, lbls in val_loader:
            imgs = imgs.to(DEVICE)
            outputs = model(imgs)
            preds = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels_final.extend(lbls.numpy())

    idx_to_class = {v: k for k, v in class_to_idx.items()}
    target_names = [idx_to_class[i] for i in range(num_classes)]
    metrics: dict[str, Any] = {
        "accuracy": round(float(accuracy_score(all_labels_final, all_preds)), 4),
        "f1_weighted": round(float(f1_score(all_labels_final, all_preds, average="weighted", zero_division=0)), 4),
        "num_classes": num_classes,
        "backbone": backbone,
        "classification_report": classification_report(all_labels_final, all_preds, target_names=target_names, output_dict=True, zero_division=0),
    }

    progress_cb("Exporting to ONNX", 80)

    model_id = str(uuid.uuid4())
    model_bytes = pickle.dumps({
        "model_state": {k: v.cpu().numpy() for k, v in best_state.items()},
        "class_to_idx": class_to_idx,
        "backbone": backbone,
        "num_classes": num_classes,
    })
    artifact_path = f"vision/{model_id}/model.pkl"

    # ONNX export
    dummy_input = torch.randn(1, 3, 224, 224)
    onnx_buffer = io.BytesIO()
    torch.onnx.export(
        model.cpu(),
        dummy_input,
        onnx_buffer,
        export_params=True,
        opset_version=17,
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes={"image": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )
    onnx_bytes = onnx_buffer.getvalue()
    onnx_path = f"vision/{model_id}/model.onnx"

    # Upload both artifacts
    import asyncio as _asyncio
    storage = StorageService()
    loop = _asyncio.new_event_loop()
    loop.run_until_complete(storage.upload_bytes(settings.R2_BUCKET_MODELS, artifact_path, model_bytes))
    loop.run_until_complete(storage.upload_bytes(settings.R2_BUCKET_MODELS, onnx_path, onnx_bytes, "application/octet-stream"))
    loop.close()

    input_schema = {
        "type": "image",
        "width": 224,
        "height": 224,
        "classes": list(class_to_idx.keys()),
    }

    return {
        "metrics": metrics,
        "artifact_path": artifact_path,
        "onnx_path": onnx_path,
        "input_schema": input_schema,
    }
