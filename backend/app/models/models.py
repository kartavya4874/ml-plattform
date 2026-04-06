"""Beanie ODM models for all platform entities."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import Field, ConfigDict
import enum
from beanie import Document, Indexed


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─── Enumerations ─────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    pro = "pro"
    free = "free"

class DatasetType(str, enum.Enum):
    tabular = "tabular"
    image = "image"
    text = "text"

class TaskType(str, enum.Enum):
    classification = "classification"
    regression = "regression"
    image_classification = "image_classification"
    sentiment = "sentiment"
    text_classification = "text_classification"

class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

class ModelStage(str, enum.Enum):
    training = "training"
    staging = "staging"
    production = "production"
    archived = "archived"

class MLFramework(str, enum.Enum):
    autogluon = "autogluon"
    flaml = "flaml"
    pytorch = "pytorch"
    huggingface = "huggingface"


# ─── Beanie Documents ────────────────────────────────────────────────────────

class User(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    email: Indexed(str, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.free
    is_active: bool = True
    is_verified: bool = False
    verification_token: Optional[str] = None
    slug: Indexed(str, unique=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "users"


class Dataset(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    name: str
    description: Optional[str] = None
    dataset_type: DatasetType
    file_size_bytes: int
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    columns_metadata: Optional[Dict[str, Any]] = None  # {col: {dtype, nulls, unique, ...}}
    profile_report: Optional[Dict[str, Any]] = None
    minio_path: str
    status: str = "processing"  # processing | ready | error
    quality_score: Optional[float] = None
    version: int = 1
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "datasets"


class TrainingJob(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    dataset_id: uuid.UUID
    task_type: TaskType
    target_column: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    status: JobStatus = JobStatus.queued
    celery_task_id: Optional[str] = None
    logs: List[Any] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "training_jobs"


class MLModel(Document):
    model_config = ConfigDict(protected_namespaces=())
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    training_job_id: uuid.UUID
    name: str
    description: Optional[str] = None
    task_type: TaskType
    framework: MLFramework
    stage: ModelStage = ModelStage.staging
    metrics: Optional[Dict[str, Any]] = None
    input_schema: Optional[Dict[str, Any]] = None  # expected input format
    artifact_path: str  # minio path
    onnx_path: Optional[str] = None
    version: int = 1
    slug: Indexed(str, unique=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "ml_models"


class Deployment(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    model_id: uuid.UUID
    endpoint_url: str
    is_active: bool = True
    total_requests: int = 0
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "deployments"


class APIKey(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    model_id: uuid.UUID
    owner_id: uuid.UUID
    name: str = "Default Key"
    key_hash: Indexed(str, unique=True)  # sha256 hash only
    is_active: bool = True
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "api_keys"


class InferenceLog(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    deployment_id: uuid.UUID
    latency_ms: float
    status_code: int
    input_hash: Optional[str] = None  # for dedup detection
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "inference_logs"


class AuditLog(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: Optional[uuid.UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    log_metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "audit_logs"
