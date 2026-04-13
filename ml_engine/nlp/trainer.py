"""NLP trainer — DistilBERT/BERT fine-tuning with Hugging Face Transformers."""
import io
import os
import uuid
import pickle
from typing import Any, Callable
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback
)
import torch
from torch.utils.data import Dataset
from app.services.storage_service import StorageService
from app.core.config import settings
import structlog

log = structlog.get_logger()
ProgressCb = Callable[[str, int], None]


class TextDataset(Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item


def _compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": float(accuracy_score(labels, preds)),
        "f1_weighted": float(f1_score(labels, preds, average="weighted", zero_division=0)),
    }


def train_text_classifier(
    file_bytes: bytes,
    task_type: str,
    config: dict,
    job_id: str,
    progress_cb: ProgressCb,
) -> dict[str, Any]:
    """
    Fine-tunes a transformer model for text classification.
    Expects CSV with columns: text (required), label (optional, auto-inferred for sentiment).
    """
    progress_cb("Loading text dataset", 15)

    df = pd.read_csv(io.BytesIO(file_bytes))

    # Detect text and label columns
    text_col = "text" if "text" in df.columns else df.columns[0]
    if "label" in df.columns:
        label_col = "label"
    elif "sentiment" in df.columns:
        label_col = "sentiment"
    elif len(df.columns) > 1:
        label_col = df.columns[1]
    else:
        raise ValueError("No label column found. Expected 'label' or 'sentiment' column.")

    # Encode labels
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    df["encoded_label"] = le.fit_transform(df[label_col].astype(str))
    num_labels = len(le.classes_)
    label_names = list(le.classes_)

    texts = df[text_col].astype(str).tolist()
    labels = df["encoded_label"].tolist()

    X_train_texts, X_val_texts, y_train, y_val = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    model_name = config.get("model_name", "distilbert-base-uncased")
    progress_cb(f"Loading tokenizer: {model_name}", 20)

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=num_labels)

    max_length = 128
    train_enc = tokenizer(X_train_texts, truncation=True, padding=True, max_length=max_length)
    val_enc = tokenizer(X_val_texts, truncation=True, padding=True, max_length=max_length)

    train_ds = TextDataset(train_enc, y_train)
    val_ds = TextDataset(val_enc, y_val)

    progress_cb("Starting fine-tuning", 30)

    model_id = str(uuid.uuid4())
    output_dir = f"/tmp/nlp_{model_id}"
    epochs = config.get("epochs", 3)

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        learning_rate=2e-5,
        warmup_ratio=0.1,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=50,
        report_to="none",
        dataloader_num_workers=0,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=_compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    trainer.train()
    progress_cb("Fine-tuning complete, evaluating", 75)

    # Final evaluation
    eval_result = trainer.evaluate()
    y_pred = np.argmax(trainer.predict(val_ds).predictions, axis=-1)
    report = classification_report(y_val, y_pred, target_names=label_names, output_dict=True, zero_division=0)

    metrics: dict[str, Any] = {
        "accuracy": round(eval_result.get("eval_accuracy", 0), 4),
        "f1_weighted": round(eval_result.get("eval_f1_weighted", 0), 4),
        "model_name": model_name,
        "num_labels": num_labels,
        "label_names": label_names,
        "classification_report": report,
    }

    progress_cb("Serializing model and tokenizer", 85)

    # Save model and tokenizer to bytes
    import tempfile, shutil, tarfile
    tmpdir = tempfile.mkdtemp()
    model.save_pretrained(tmpdir)
    tokenizer.save_pretrained(tmpdir)
    
    # Also save label encoder
    with open(os.path.join(tmpdir, "label_encoder.pkl"), "wb") as f:
        pickle.dump(le, f)

    # Tar the directory
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
        tar.add(tmpdir, arcname="model")
    tar_bytes = tar_buffer.getvalue()
    shutil.rmtree(tmpdir, ignore_errors=True)

    artifact_path = f"nlp/{model_id}/model.tar.gz"

    import asyncio as _asyncio
    storage = StorageService()
    loop = _asyncio.new_event_loop()
    loop.run_until_complete(
        storage.upload_bytes(settings.R2_BUCKET_MODELS, artifact_path, tar_bytes, "application/gzip")
    )
    loop.close()

    input_schema = {
        "type": "text",
        "text_column": text_col,
        "label_names": label_names,
        "model_name": model_name,
    }

    return {
        "metrics": metrics,
        "artifact_path": artifact_path,
        "input_schema": input_schema,
    }
