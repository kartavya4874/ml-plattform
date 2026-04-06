"""Inference service with LRU model cache."""
import io
import pickle
import asyncio
from collections import OrderedDict
from typing import Any
import numpy as np
import pandas as pd

from app.models.models import MLModel, TaskType
from app.services.storage_service import StorageService
from app.core.config import settings


class LRUModelCache:
    """Thread-safe LRU cache for loaded ML models."""

    def __init__(self, max_size: int = 5):
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._max = max_size

    def get(self, key: str) -> Any | None:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key: str, value: Any):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self._max:
            self._cache.popitem(last=False)


class InferenceService:
    def __init__(self):
        self._cache = LRUModelCache(max_size=settings.MODEL_CACHE_MAX_SIZE)
        self._storage = StorageService()

    async def _load_artifact(self, model_obj: MLModel) -> Any:
        """Load model artifact from MinIO into cache."""
        cache_key = str(model_obj.id)
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        artifact_bytes = await self._storage.download_bytes(
            settings.MINIO_BUCKET_MODELS, model_obj.artifact_path
        )
        loaded = pickle.loads(artifact_bytes)
        self._cache.put(cache_key, loaded)
        return loaded

    async def predict(self, model_obj: MLModel, inputs: dict[str, Any]) -> dict[str, Any]:
        """Run a single prediction."""
        task = model_obj.task_type

        if task in (TaskType.classification, TaskType.regression):
            return await self._predict_tabular(model_obj, inputs)
        elif task == TaskType.image_classification:
            return await self._predict_image(model_obj, inputs)
        elif task in (TaskType.sentiment, TaskType.text_classification):
            return await self._predict_text(model_obj, inputs)
        else:
            raise ValueError(f"Unknown task type: {task}")

    async def _predict_tabular(self, model_obj: MLModel, inputs: dict) -> dict:
        artifact = await self._load_artifact(model_obj)
        preprocessor = artifact["preprocessor"]
        automl = artifact["automl"]
        feature_names = artifact["feature_names"]

        df = pd.DataFrame([inputs])[feature_names]
        X = preprocessor.transform(df)

        pred = automl.predict(X)[0]
        result: dict[str, Any] = {"prediction": str(pred) if not isinstance(pred, (int, float)) else float(pred)}

        try:
            proba = automl.predict_proba(X)[0]
            classes = list(map(str, automl.classes_))
            result["confidence"] = float(max(proba))
            result["class_probabilities"] = {c: float(p) for c, p in zip(classes, proba)}
        except Exception:
            pass

        return result

    async def _predict_image(self, model_obj: MLModel, inputs: dict) -> dict:
        """inputs must contain 'image_b64' key (base64 encoded)."""
        import base64
        from PIL import Image
        import torch
        from torchvision import transforms, models
        from torchvision.models import EfficientNet_B0_Weights, ResNet50_Weights

        artifact = await self._load_artifact(model_obj)
        class_to_idx = artifact["class_to_idx"]
        backbone = artifact.get("backbone", "efficientnet_b0")
        num_classes = artifact["num_classes"]
        idx_to_class = {v: k for k, v in class_to_idx.items()}

        # Rebuild model in eval mode
        if backbone == "resnet50":
            from torchvision.models import resnet50
            net = resnet50(weights=None)
            net.fc = torch.nn.Linear(net.fc.in_features, num_classes)
        else:
            from torchvision.models import efficientnet_b0
            net = efficientnet_b0(weights=None)
            net.classifier[1] = torch.nn.Linear(net.classifier[1].in_features, num_classes)

        state_dict = {k: torch.tensor(v) for k, v in artifact["model_state"].items()}
        net.load_state_dict(state_dict)
        net.eval()

        transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        img_bytes = base64.b64decode(inputs.get("image_b64", ""))
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            logits = net(tensor)
            proba = torch.softmax(logits, dim=1)[0].numpy()
            pred_idx = int(np.argmax(proba))

        return {
            "prediction": idx_to_class[pred_idx],
            "confidence": float(max(proba)),
            "class_probabilities": {idx_to_class[i]: float(p) for i, p in enumerate(proba)},
        }

    async def _predict_text(self, model_obj: MLModel, inputs: dict) -> dict:
        import tarfile, tempfile, shutil
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        import torch

        cache_key = f"nlp_{model_obj.id}"
        nlp_cached = self._cache.get(cache_key)

        if not nlp_cached:
            tar_bytes = await self._storage.download_bytes(settings.MINIO_BUCKET_MODELS, model_obj.artifact_path)
            tmpdir = tempfile.mkdtemp()
            with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:gz") as tar:
                tar.extractall(tmpdir)
            model_dir = tmpdir + "/model"
            tokenizer = AutoTokenizer.from_pretrained(model_dir)
            net = AutoModelForSequenceClassification.from_pretrained(model_dir)
            le = pickle.load(open(model_dir + "/label_encoder.pkl", "rb"))
            net.eval()
            nlp_cached = {"tokenizer": tokenizer, "model": net, "label_encoder": le, "tmpdir": tmpdir}
            self._cache.put(cache_key, nlp_cached)

        tokenizer = nlp_cached["tokenizer"]
        net = nlp_cached["model"]
        le = nlp_cached["label_encoder"]

        text = inputs.get("text", "")
        enc = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
        with torch.no_grad():
            logits = net(**enc).logits
        proba = torch.softmax(logits, dim=1)[0].numpy()
        pred_idx = int(np.argmax(proba))
        label_names = list(le.classes_)

        return {
            "prediction": label_names[pred_idx],
            "confidence": float(max(proba)),
            "class_probabilities": {label_names[i]: float(p) for i, p in enumerate(proba)},
        }

    async def batch_predict(self, model_obj: MLModel, content: bytes, filename: str) -> bytes:
        """Run batch predictions on a CSV, return enriched CSV bytes."""
        df = pd.read_csv(io.BytesIO(content))
        predictions = []
        for _, row in df.iterrows():
            result = await self.predict(model_obj, row.to_dict())
            predictions.append(result.get("prediction", ""))
        df["prediction"] = predictions
        return df.to_csv(index=False).encode()
