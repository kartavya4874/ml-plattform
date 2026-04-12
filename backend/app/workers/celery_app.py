"""Celery app configuration."""
import ssl
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "nocode_ai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.training_tasks"],
)

# TLS configuration for Upstash / rediss:// connections
_ssl_conf = {}
if settings.REDIS_URL.startswith("rediss://"):
    _ssl_conf = {
        "broker_use_ssl": {"ssl_cert_reqs": ssl.CERT_NONE},
        "redis_backend_use_ssl": {"ssl_cert_reqs": ssl.CERT_NONE},
    }

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # one task at a time per worker
    task_routes={
        "app.workers.training_tasks.*": {"queue": "training"},
    },
    **_ssl_conf,
)

