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
    user = "user"

class SubscriptionTier(str, enum.Enum):
    free = "free"
    pro = "pro"
    payg = "payg"
    enterprise = "enterprise"

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    past_due = "past_due"
    trialing = "trialing"

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
    sklearn = "sklearn"


# ─── Core Documents ──────────────────────────────────────────────────────────

class User(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    email: Indexed(str, unique=True)
    hashed_password: str
    token_version: int = 1
    full_name: Optional[str] = None
    role: UserRole = UserRole.user
    is_active: bool = True
    is_verified: bool = False
    is_2fa_enabled: bool = False
    verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    slug: Indexed(str, unique=True)
    username: Optional[Indexed(str, unique=True)] = None
    avatar_url: Optional[str] = None
    is_public: bool = False
    bio: Optional[str] = None
    website: Optional[str] = None
    github_url: Optional[str] = None
    kaggle_url: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    badges_public: bool = True  # master toggle for badge visibility on public profile
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "users"


class PricingConfig(Document):
    """Singleton document to store platform-wide pricing and tier limits."""
    id: str = Field(default="default_config", alias="_id")
    tier_limits: Dict[str, Any]
    gpu_pricing: Dict[str, Any]
    payg_unit_pricing: Dict[str, Any]
    pricing_info: List[Dict[str, Any]]
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "pricing_config"


class Dataset(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    collaborator_ids: List[uuid.UUID] = Field(default_factory=list)
    is_public: bool = False
    name: str
    description: Optional[str] = None
    readme: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    dataset_type: DatasetType
    file_size_bytes: int
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    columns_metadata: Optional[Dict[str, Any]] = None
    profile_report: Optional[Dict[str, Any]] = None
    minio_path: str
    status: str = "processing"
    quality_score: Optional[float] = None
    version: int = 1
    star_count: int = 0
    fork_count: int = 0
    download_count: int = 0
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
    gpu_enabled: bool = False
    gpu_type: Optional[str] = None  # "T4", "A10G", "A100"
    compute_cost: float = 0.0  # cost in INR for PAYG users
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "training_jobs"


class MLModel(Document):
    model_config = ConfigDict(protected_namespaces=())

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    collaborator_ids: List[uuid.UUID] = Field(default_factory=list)
    is_public: bool = False
    training_job_id: uuid.UUID
    name: str
    description: Optional[str] = None
    readme: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    task_type: TaskType
    framework: MLFramework
    stage: ModelStage = ModelStage.staging
    metrics: Optional[Dict[str, Any]] = None
    input_schema: Optional[Dict[str, Any]] = None
    artifact_path: str
    onnx_path: Optional[str] = None
    version: int = 1
    star_count: int = 0
    fork_count: int = 0
    download_count: int = 0
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
    key_hash: Indexed(str, unique=True)
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
    input_hash: Optional[str] = None
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


class Subscription(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    tier: SubscriptionTier = SubscriptionTier.free
    status: SubscriptionStatus = SubscriptionStatus.active
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    payu_merchant_key: Optional[str] = None  # PayU integration
    current_period_start: datetime = Field(default_factory=utcnow)
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "subscriptions"
        indexes = [[("user_id", 1)]]


class UsageRecord(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    datasets_created: int = 0
    training_jobs_run: int = 0
    models_created: int = 0
    deployments_active: int = 0
    inference_requests: int = 0
    storage_bytes_used: int = 0
    gpu_minutes_used: float = 0.0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "usage_records"
        indexes = [[("user_id", 1)]]


class UsageMeteredEvent(Document):
    """Individual metered usage events for PAYG billing."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    event_type: str  # "gpu_minute", "cpu_minute", "storage_gb", "api_call", "training_job"
    quantity: float
    unit_price: float  # price per unit in INR
    total_cost: float
    event_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "usage_metered_events"
        indexes = [[("user_id", 1), ("created_at", -1)]]


class Invoice(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    amount_due: float
    amount_paid: float
    status: str = "paid"
    billing_reason: str = "subscription_cycle"
    invoice_pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "invoices"
        indexes = [[("user_id", 1)]]


class Discussion(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    author_id: uuid.UUID
    title: str
    content: str
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None
    upvotes: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "discussions"
        indexes = [[("created_at", -1)]]


class Comment(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    discussion_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str = ""
    parent_id: uuid.UUID | None = None  # for threaded replies
    content: str
    upvotes: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "comments"
        indexes = [[("discussion_id", 1), ("created_at", 1)]]


class Vote(Document):
    """Tracks per-user upvotes to prevent duplicate voting."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    resource_type: str  # "discussion" | "comment"
    resource_id: uuid.UUID
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "votes"
        indexes = [[("user_id", 1), ("resource_type", 1), ("resource_id", 1)]]


# ─── Social Graph ────────────────────────────────────────────────────────────

class Star(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    resource_type: str  # "dataset" | "model" | "notebook"
    resource_id: uuid.UUID
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "stars"
        indexes = [[("user_id", 1), ("resource_type", 1), ("resource_id", 1)]]


class Follow(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    follower_id: uuid.UUID
    following_id: uuid.UUID
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "follows"
        indexes = [[("follower_id", 1), ("following_id", 1)]]


class Fork(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    original_id: uuid.UUID
    original_type: str  # "dataset" | "model" | "notebook"
    forked_id: uuid.UUID
    forked_by: uuid.UUID
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "forks"
        indexes = [[("original_id", 1)], [("forked_by", 1)]]


class Activity(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    action: str  # "starred", "forked", "published", "commented", "followed"
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None
    target_user_id: Optional[uuid.UUID] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "activities"
        indexes = [[("user_id", 1), ("created_at", -1)]]


# ─── Notebooks ───────────────────────────────────────────────────────────────

class Notebook(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    owner_id: uuid.UUID
    title: str = "Untitled Notebook"
    description: Optional[str] = None
    is_public: bool = False
    cells: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"type": "markdown", "source": "# My Notebook", "outputs": []},
        {"type": "code", "source": "", "outputs": []},
    ])
    tags: List[str] = Field(default_factory=list)
    star_count: int = 0
    fork_count: int = 0
    runtime_config: Dict[str, Any] = Field(default_factory=lambda: {
        "python_version": "3.11", "timeout_seconds": 30,
        "gpu_enabled": False, "gpu_type": None,
    })
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "notebooks"
        indexes = [[("owner_id", 1)], [("is_public", 1), ("created_at", -1)]]


# ─── Competitions ────────────────────────────────────────────────────────────

class Competition(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    created_by: uuid.UUID
    title: str
    description: str
    rules: Optional[str] = None
    dataset_id: uuid.UUID
    metric: str = "accuracy"
    higher_is_better: bool = True
    deadline: Optional[datetime] = None
    max_submissions_per_day: int = 5
    is_active: bool = True
    tags: List[str] = Field(default_factory=list)
    participant_count: int = 0
    prize_description: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "competitions"
        indexes = [[("is_active", 1), ("created_at", -1)]]


class Submission(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    competition_id: uuid.UUID
    user_id: uuid.UUID
    model_id: Optional[uuid.UUID] = None
    score: float = 0.0
    submission_file_path: Optional[str] = None
    status: str = "pending"
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "submissions"
        indexes = [[("competition_id", 1), ("score", -1)], [("user_id", 1)]]


# ─── Organizations ───────────────────────────────────────────────────────────

class Organization(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    slug: Indexed(str, unique=True)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    owner_id: uuid.UUID
    is_public: bool = True
    # Enterprise features
    allowed_email_domains: List[str] = Field(default_factory=list)  # e.g. ["iitb.ac.in", "company.com"]
    whitelabel_config: Optional[Dict[str, Any]] = None  # {"brand_name", "logo_url", "primary_color", "accent_color", "welcome_message", "custom_domain"}
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "organizations"


class OrgMembership(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    org_id: uuid.UUID
    user_id: uuid.UUID
    role: str = "member"
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "org_memberships"
        indexes = [[("org_id", 1), ("user_id", 1)]]


class OrgInvite(Document):
    """Pending organization invitations with email domain validation."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    org_id: uuid.UUID
    email: str
    role: str = "member"
    invited_by: uuid.UUID
    token: Indexed(str, unique=True)
    accepted: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "org_invites"
        indexes = [[("org_id", 1), ("email", 1)]]


class Notification(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID           # recipient
    type: str                    # training_complete, training_failed, new_follower, starred, forked, system
    title: str
    message: str = ""
    link: str | None = None      # optional navigation link
    is_read: bool = False
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "notifications"
        indexes = [[("user_id", 1), ("created_at", -1)]]

# ─── Contact Messages ────────────────────────────────────────────────────────

class ContactMessage(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    email: str
    subject: str = ""
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "contact_messages"
        indexes = [[("created_at", -1)]]


# ─── Profile Badges & Achievements ──────────────────────────────────────────

class UserBadge(Document):
    """Achievement badges earned by users."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    badge_type: str       # "first_model", "10_datasets", "gpu_pioneer", etc.
    badge_name: str       # "First Model", "Data Curator", etc.
    badge_icon: str       # emoji
    badge_tier: str       # "bronze", "silver", "gold", "platinum"
    description: str
    is_public: bool = True
    earned_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "user_badges"
        indexes = [[("user_id", 1), ("badge_type", 1)]]
