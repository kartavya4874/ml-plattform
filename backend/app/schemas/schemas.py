"""Pydantic v2 schemas for request/response validation."""
from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.models import UserRole, DatasetType, TaskType, JobStatus, ModelStage, MLFramework


# ── Base ───────────────────────────────────────────────────────────────────────

class APIError(BaseModel):
    error: str
    code: str
    details: dict[str, Any] = {}


# ── Auth ───────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    email: EmailStr
    full_name: str | None
    role: UserRole
    is_active: bool
    is_verified: bool
    slug: str
    created_at: datetime


# ── Dataset ────────────────────────────────────────────────────────────────────

class DatasetOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    description: str | None
    dataset_type: DatasetType
    file_size_bytes: int
    row_count: int | None
    column_count: int | None
    status: str
    quality_score: float | None
    version: int
    created_at: datetime


class DatasetDetail(DatasetOut):
    columns_metadata: dict | None
    profile_report: dict | None


# ── Training Job ───────────────────────────────────────────────────────────────

class TrainingConfig(BaseModel):
    time_limit_seconds: int = 300
    metric: str = "auto"
    presets: str = "medium_quality"
    backbone: str | None = None      # for image models
    model_name: str | None = None    # for NLP models
    epochs: int | None = None


class TrainingJobCreate(BaseModel):
    dataset_id: UUID
    task_type: TaskType
    target_column: str | None = None
    config: TrainingConfig = TrainingConfig()

    @model_validator(mode="after")
    def validate_target_column(self) -> TrainingJobCreate:
        tabular_tasks = [TaskType.classification, TaskType.regression]
        if self.task_type in tabular_tasks and not self.target_column:
            raise ValueError("target_column is required for tabular tasks")
        return self


class TrainingJobOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    dataset_id: UUID
    task_type: TaskType
    target_column: str | None
    config: dict
    status: JobStatus
    metrics: dict | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


# ── ML Model ───────────────────────────────────────────────────────────────────

class ModelUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ModelOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    description: str | None
    task_type: TaskType
    framework: MLFramework
    stage: ModelStage
    metrics: dict | None
    input_schema: dict | None
    artifact_path: str
    version: int
    slug: str
    created_at: datetime
    updated_at: datetime


# ── Inference ──────────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    inputs: dict[str, Any]  # feature_name -> value


class PredictionResponse(BaseModel):
    prediction: Any
    confidence: float | None
    class_probabilities: dict[str, float] | None
    latency_ms: float


# ── Deployment ─────────────────────────────────────────────────────────────────

class DeploymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    model_id: UUID
    endpoint_url: str
    is_active: bool
    total_requests: int
    created_at: datetime


class APIKeyOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime
    # Raw key only returned on creation
    raw_key: str | None = None


# ── Explain ────────────────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    inputs: dict[str, Any] | None = None
    sample_size: int = 100


class SHAPGlobalResponse(BaseModel):
    feature_names: list[str]
    mean_abs_shap: list[float]
    shap_values_sample: list[list[float]] | None  # for beeswarm


class SHAPLocalResponse(BaseModel):
    feature_names: list[str]
    base_value: float
    shap_values: list[float]
    prediction: Any


class TokenImportanceResponse(BaseModel):
    tokens: list[str]
    importances: list[float]
    prediction: Any
