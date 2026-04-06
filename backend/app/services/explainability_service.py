"""Explainability service — SHAP (tabular), Grad-CAM (vision), token importance (NLP)."""
import io
import base64
import asyncio
import pickle
from typing import Any
import numpy as np
import pandas as pd

from app.models.models import MLModel
from app.services.storage_service import StorageService
from app.core.config import settings
from app.schemas.schemas import SHAPGlobalResponse, SHAPLocalResponse, TokenImportanceResponse


class ExplainabilityService:
    def __init__(self):
        self._storage = StorageService()

    async def shap_global(self, model_obj: MLModel, sample_size: int = 100) -> SHAPGlobalResponse:
        """Compute global SHAP feature importances using TreeExplainer."""
        def _compute():
            import shap
            artifact_bytes = asyncio.run(
                self._storage.download_bytes(settings.MINIO_BUCKET_MODELS, model_obj.artifact_path)
            )
            artifact = pickle.loads(artifact_bytes)
            automl = artifact["automl"]
            preprocessor = artifact["preprocessor"]
            feature_names = artifact["feature_names"]

            # We need background data — use training data summary if available
            # Create a small dummy dataset to generate shap values on
            try:
                underlying_model = automl.model.estimator
                explainer = shap.TreeExplainer(underlying_model)
                # Generate dummy transformed features for background
                bg_size = min(sample_size, 50)
                bg_data = np.zeros((bg_size, preprocessor.transform(pd.DataFrame([{f: 0 for f in feature_names}])).shape[1]))
                shap_values = explainer.shap_values(bg_data)
                if isinstance(shap_values, list):
                    shap_values = shap_values[0]
                mean_abs = np.abs(shap_values).mean(axis=0).tolist()

                # Get feature names after transformation
                all_feature_names = []
                for name, trans, cols in preprocessor.transformers_:
                    if name == "num":
                        all_feature_names.extend(cols)
                    elif name == "cat":
                        try:
                            cats = trans.named_steps["encoder"].get_feature_names_out(cols)
                            all_feature_names.extend(cats.tolist())
                        except Exception:
                            all_feature_names.extend(cols)

                # Pad or trim to match
                min_len = min(len(all_feature_names), len(mean_abs))
                return SHAPGlobalResponse(
                    feature_names=all_feature_names[:min_len],
                    mean_abs_shap=mean_abs[:min_len],
                    shap_values_sample=shap_values[:10, :min_len].tolist() if len(shap_values) >= 10 else shap_values[:, :min_len].tolist(),
                )
            except Exception as exc:
                # Fallback: return feature importances from model if available
                try:
                    importances = underlying_model.feature_importances_
                    all_feature_names = []
                    for name, trans, cols in preprocessor.transformers_:
                        if name == "num":
                            all_feature_names.extend(cols)
                        elif name == "cat":
                            try:
                                cats = trans.named_steps["encoder"].get_feature_names_out(cols)
                                all_feature_names.extend(cats.tolist())
                            except Exception:
                                all_feature_names.extend(cols)
                    min_len = min(len(all_feature_names), len(importances))
                    return SHAPGlobalResponse(
                        feature_names=all_feature_names[:min_len],
                        mean_abs_shap=importances[:min_len].tolist(),
                        shap_values_sample=None,
                    )
                except Exception:
                    return SHAPGlobalResponse(feature_names=feature_names, mean_abs_shap=[0.0] * len(feature_names), shap_values_sample=None)

        return await asyncio.get_event_loop().run_in_executor(None, _compute)

    async def shap_local(self, model_obj: MLModel, inputs: dict) -> SHAPLocalResponse:
        """Compute per-instance SHAP waterfall data."""
        def _compute():
            import shap
            artifact_bytes = asyncio.run(
                self._storage.download_bytes(settings.MINIO_BUCKET_MODELS, model_obj.artifact_path)
            )
            artifact = pickle.loads(artifact_bytes)
            automl = artifact["automl"]
            preprocessor = artifact["preprocessor"]
            feature_names = artifact["feature_names"]

            df = pd.DataFrame([inputs])[feature_names]
            X = preprocessor.transform(df)
            pred = automl.predict(X)[0]

            try:
                underlying_model = automl.model.estimator
                explainer = shap.TreeExplainer(underlying_model)
                sv = explainer.shap_values(X)
                if isinstance(sv, list):
                    sv = sv[0]
                shap_row = sv[0].tolist()
                base_value = float(explainer.expected_value if not isinstance(explainer.expected_value, np.ndarray) else explainer.expected_value[0])

                all_feature_names = []
                for name, trans, cols in preprocessor.transformers_:
                    if name == "num":
                        all_feature_names.extend(cols)
                    elif name == "cat":
                        try:
                            cats = trans.named_steps["encoder"].get_feature_names_out(cols)
                            all_feature_names.extend(cats.tolist())
                        except Exception:
                            all_feature_names.extend(cols)

                min_len = min(len(all_feature_names), len(shap_row))
                return SHAPLocalResponse(
                    feature_names=all_feature_names[:min_len],
                    base_value=base_value,
                    shap_values=shap_row[:min_len],
                    prediction=str(pred),
                )
            except Exception as exc:
                return SHAPLocalResponse(
                    feature_names=feature_names,
                    base_value=0.0,
                    shap_values=[0.0] * len(feature_names),
                    prediction=str(pred),
                )

        return await asyncio.get_event_loop().run_in_executor(None, _compute)

    async def gradcam(self, model_obj: MLModel, image_bytes: bytes) -> dict:
        """Compute Grad-CAM heatmap overlay for an image model."""
        def _compute():
            import torch
            import torch.nn.functional as F
            from torchvision import transforms, models
            from PIL import Image
            import cv2
            import numpy as np

            artifact_bytes = asyncio.run(
                self._storage.download_bytes(settings.MINIO_BUCKET_MODELS, model_obj.artifact_path)
            )
            artifact = pickle.loads(artifact_bytes)
            class_to_idx = artifact["class_to_idx"]
            backbone = artifact.get("backbone", "efficientnet_b0")
            num_classes = artifact["num_classes"]
            idx_to_class = {v: k for k, v in class_to_idx.items()}

            if backbone == "resnet50":
                net = models.resnet50(weights=None)
                net.fc = torch.nn.Linear(net.fc.in_features, num_classes)
                target_layer = net.layer4[-1]
            else:
                net = models.efficientnet_b0(weights=None)
                net.classifier[1] = torch.nn.Linear(net.classifier[1].in_features, num_classes)
                target_layer = net.features[-1]

            state_dict = {k: torch.tensor(v) for k, v in artifact["model_state"].items()}
            net.load_state_dict(state_dict)
            net.eval()

            transform = transforms.Compose([
                transforms.Resize((256, 256)),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])

            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = transform(pil_img).unsqueeze(0).requires_grad_(True)

            # Hook for activations and gradients
            activations = {}
            gradients = {}

            def forward_hook(module, inp, out):
                activations["value"] = out

            def backward_hook(module, grad_in, grad_out):
                gradients["value"] = grad_out[0]

            fwd_handle = target_layer.register_forward_hook(forward_hook)
            bwd_handle = target_layer.register_backward_hook(backward_hook)

            output = net(input_tensor)
            pred_class = output.argmax(dim=1).item()
            score = output[0, pred_class]
            net.zero_grad()
            score.backward()

            fwd_handle.remove()
            bwd_handle.remove()

            # Compute Grad-CAM
            grads = gradients["value"].detach().numpy()  # shape: [1, C, H, W]
            acts = activations["value"].detach().numpy()  # shape: [1, C, H, W]
            weights = grads.mean(axis=(2, 3), keepdims=True)  # global average pooling
            cam = (weights * acts).sum(axis=1)[0]
            cam = np.maximum(cam, 0)
            cam = cam / (cam.max() + 1e-8)
            cam = cv2.resize(cam, (224, 224))

            # Overlay on original image
            orig_arr = np.array(pil_img.resize((224, 224)))
            heatmap = cv2.applyColorMap((cam * 255).astype(np.uint8), cv2.COLORMAP_JET)
            overlay = cv2.addWeighted(orig_arr, 0.6, heatmap[:, :, ::-1], 0.4, 0)

            _, buffer = cv2.imencode(".png", overlay[:, :, ::-1])
            b64_heatmap = base64.b64encode(buffer.tobytes()).decode()

            proba = F.softmax(output, dim=1)[0].detach().numpy()
            return {
                "prediction": idx_to_class[pred_class],
                "confidence": float(max(proba)),
                "heatmap_b64": b64_heatmap,
                "class_probabilities": {idx_to_class[i]: float(p) for i, p in enumerate(proba)},
            }

        return await asyncio.get_event_loop().run_in_executor(None, _compute)

    async def token_importance(self, model_obj: MLModel, text: str) -> TokenImportanceResponse:
        """Compute token-level importance using attention weights."""
        def _compute():
            import torch
            import tarfile, tempfile, shutil

            artifact_bytes = asyncio.run(
                self._storage.download_bytes(settings.MINIO_BUCKET_MODELS, model_obj.artifact_path)
            )

            tmpdir = tempfile.mkdtemp()
            try:
                from transformers import AutoTokenizer, AutoModelForSequenceClassification
                with tarfile.open(fileobj=io.BytesIO(artifact_bytes), mode="r:gz") as tar:
                    tar.extractall(tmpdir)
                model_dir = tmpdir + "/model"
                tokenizer = AutoTokenizer.from_pretrained(model_dir)
                net = AutoModelForSequenceClassification.from_pretrained(model_dir, output_attentions=True)
                le = pickle.load(open(model_dir + "/label_encoder.pkl", "rb"))
                net.eval()

                enc = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
                tokens = tokenizer.convert_ids_to_tokens(enc["input_ids"][0])

                with torch.no_grad():
                    outputs = net(**enc)

                # Mean attention across all heads in the last layer
                attentions = outputs.attentions  # tuple of [batch, heads, seq, seq]
                last_attn = attentions[-1][0]  # [heads, seq, seq]
                cls_attn = last_attn[:, 0, :].mean(dim=0)  # [seq]
                importances = cls_attn.numpy().tolist()

                proba = torch.softmax(outputs.logits, dim=1)[0].numpy()
                pred_idx = int(np.argmax(proba))
                label_names = list(le.classes_)

                return TokenImportanceResponse(
                    tokens=tokens,
                    importances=importances,
                    prediction=label_names[pred_idx],
                )
            finally:
                shutil.rmtree(tmpdir, ignore_errors=True)

        return await asyncio.get_event_loop().run_in_executor(None, _compute)
