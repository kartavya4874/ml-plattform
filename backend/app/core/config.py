"""Application configuration — all settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "NoCode AI Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ── Security ─────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str | List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Database ─────────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "aiplatform"

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── MinIO ────────────────────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_DATA: str = "datasets"
    MINIO_BUCKET_MODELS: str = "models"

    # ── Storage Alternative Backends ─────────────────────────────────────────
    STORAGE_BACKEND: str = "local" # options: "local", "minio", "mongodb", "firebase"
    FIREBASE_CREDENTIALS_JSON: str = "" # Path to firebase service account json
    FIREBASE_STORAGE_BUCKET: str = "" # Firebase Storage bucket name (e.g. "your-project.appspot.com")
    API_BASE_URL: str = "http://localhost:8000" # Used for local/mongodb presigned URLs


    # ── Email ────────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "noreply@nocode-ai.platform"

    # ── File Limits (bytes) ──────────────────────────────────────────────────
    MAX_FILE_SIZE_FREE: int = 100 * 1024 * 1024        # 100 MB
    MAX_FILE_SIZE_PRO: int = 2 * 1024 * 1024 * 1024    # 2 GB
    MAX_FILE_SIZE_ENTERPRISE: int = 50 * 1024 * 1024 * 1024  # 50 GB

    # ── Rate Limits ──────────────────────────────────────────────────────────
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_API: str = "100/minute"

    # ── ML ───────────────────────────────────────────────────────────────────
    DEFAULT_TRAINING_TIME_LIMIT: int = 300  # seconds
    MODEL_CACHE_MAX_SIZE: int = 5

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v


settings = Settings()
