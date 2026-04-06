"""Celery app configuration."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "nocode_ai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.training_tasks"],
)

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
)
