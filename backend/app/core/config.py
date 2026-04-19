"""Application configuration — all settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Parametrix AI"
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
    FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_USERS_SEED: str = "" # Comma separated list of email:password for initial superadmins

    # ── Database ─────────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "aiplatform"

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Cloudflare R2 ────────────────────────────────────────────────────────
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_DATA: str = "datasets"
    R2_BUCKET_MODELS: str = "models"

    # ── Storage Alternative Backends ─────────────────────────────────────────
    STORAGE_BACKEND: str = "local" # options: "local", "r2", "mongodb"
    API_BASE_URL: str = "http://localhost:8000" # Used for local/mongodb presigned URLs


    # ── Email ────────────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "support@parametrix.in"

    # ── Payments (PayU) ──────────────────────────────────────────────────────
    PAYU_KEY: str = "QiQU9y"
    PAYU_SALT: str = "W8XlUacGYGHciGQIUA3bWuSZ9OWBoVJ3"
    PAYU_ENV: str = "test"  # Option: "test" or "live"

    # ── File Limits (bytes) ──────────────────────────────────────────────────
    MAX_FILE_SIZE_FREE: int = 100 * 1024 * 1024        # 100 MB
    MAX_FILE_SIZE_PRO: int = 2 * 1024 * 1024 * 1024    # 2 GB
    MAX_FILE_SIZE_ENTERPRISE: int = 50 * 1024 * 1024 * 1024  # 50 GB

    # ── AI / LLM ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

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
