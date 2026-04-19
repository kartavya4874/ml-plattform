"""Pydantic v2 schemas for request/response validation."""
from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.models import (
    UserRole, DatasetType, TaskType, JobStatus, ModelStage, MLFramework,
    SubscriptionTier, SubscriptionStatus,
)


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

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    username: str | None = None
    is_public: bool | None = None
    bio: str | None = None
    website: str | None = None
    github_url: str | None = None
    kaggle_url: str | None = None
    is_2fa_enabled: bool | None = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserForgotPassword(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class UserResetPassword(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("password", mode="before")
    @classmethod
    def strip_password(cls, v: Any) -> Any:
        """Strip leading/trailing whitespace — mobile keyboards often add trailing spaces."""
        if isinstance(v, str):
            return v.strip()
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    email: EmailStr
    full_name: str | None
    username: str | None = None
    avatar_url: str | None = None
    is_public: bool = False
    bio: str | None = None
    website: str | None = None
    github_url: str | None = None
    kaggle_url: str | None = None
    followers_count: int = 0
    following_count: int = 0
    role: UserRole
    is_active: bool
    is_verified: bool
    is_2fa_enabled: bool = False
    slug: str
    created_at: datetime


# ── Dataset ────────────────────────────────────────────────────────────────────

class DatasetOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    name: str
    description: str | None
    is_public: bool = False
    collaborator_ids: list[UUID] = []
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
    model_config = {"protected_namespaces": ()}
    time_limit_seconds: int = 300
    metric: str = "auto"
    presets: str = "medium_quality"
    backbone: str | None = None      # for image models
    model_name: str | None = None    # for NLP models
    epochs: int | None = None
    # ── Advanced hyperparameters (all optional, defaults = current behavior) ──
    algorithm: str = "auto"          # auto | logistic_regression | random_forest | gradient_boosting | svm | knn | linear_regression
    n_estimators: int = 100          # number of trees (for RF/GB)
    max_depth: int | None = None     # tree depth limit (None = unlimited)
    learning_rate: float = 0.1       # step size for boosting
    test_size: float = 0.2           # train/test split ratio
    random_state: int = 42           # reproducibility seed
    cross_validation: int | None = None  # None = no CV, 3/5/10 = K-fold
    excluded_columns: list[str] = [] # columns to exclude from features


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
    model_config = {"from_attributes": True, "protected_namespaces": ()}
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
    is_public: bool | None = None
    tags: list[str] | None = None


class ModelOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    name: str
    description: str | None
    is_public: bool = False
    collaborator_ids: list[UUID] = []
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
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    model_id: UUID
    endpoint_url: str
    is_active: bool
    total_requests: int
    created_at: datetime


class APIKeyOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
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


# ── Subscription & Usage ───────────────────────────────────────────────────────

class SubscriptionOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    user_id: UUID
    tier: SubscriptionTier
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime | None
    cancel_at_period_end: bool
    created_at: datetime


class UsageOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    datasets_created: int = 0
    training_jobs_run: int = 0
    models_created: int = 0
    deployments_active: int = 0
    inference_requests: int = 0
    storage_bytes_used: int = 0


class TierLimitInfo(BaseModel):
    datasets: int
    max_file_size_mb: int
    training_jobs_per_month: int
    models: int
    deployments: int
    inference_requests_per_month: int
    api_keys_per_model: int
    gpu_enabled: bool


class PricingTierInfo(BaseModel):
    tier: str
    name: str
    price_monthly: int
    price_label: str
    description: str
    limits: TierLimitInfo
    features: list[str]
    is_popular: bool = False


class SubscriptionSummary(BaseModel):
    subscription: SubscriptionOut | None
    usage: UsageOut
    limits: TierLimitInfo
    tier: str


class InvoiceOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: UUID
    user_id: UUID
    subscription_id: UUID | None
    amount_due: float
    amount_paid: float
    status: str
    billing_reason: str
    invoice_pdf_url: str | None
    created_at: datetime

