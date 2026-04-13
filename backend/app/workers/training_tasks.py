"""Celery training tasks — dispatches to the appropriate ML engine pipeline."""
import json
import uuid
from datetime import datetime, timezone
from celery import Task
from app.workers.celery_app import celery_app
from app.core.config import settings
import structlog

log = structlog.get_logger()


def _publish_progress(redis_client, job_id: str, event: str, payload: dict):
    """Publish a progress event to the Redis pub/sub channel for SSE streaming."""
    message = json.dumps({"event": event, "job_id": job_id, **payload})
    redis_client.publish(f"training:{job_id}", message)


@celery_app.task(bind=True, max_retries=0, name="app.workers.training_tasks.run_training_job")
def run_training_job(
    self: Task,
    job_id: str,
    dataset_id: str,
    task_type: str,
    target_column: str | None,
    config: dict,
    owner_id: str,
):
    """Main training task dispatched to Celery workers."""
    import asyncio

    r = sync_redis.from_url(settings.REDIS_URL)

    async def _run():
        from app.models.models import TrainingJob, JobStatus, MLModel, MLFramework, ModelStage, Dataset, TaskType, User
        from motor.motor_asyncio import AsyncIOMotorClient
        from beanie import init_beanie
        
        # Initialize Beanie for the Celery worker process
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=client[settings.MONGODB_DB_NAME],
            document_models=[TrainingJob, MLModel, Dataset, User]
        )

        # ── Update job to running ──────────────────────────────────────
        job = await TrainingJob.get(uuid.UUID(job_id))
        if not job:
            return

        job.status = JobStatus.running
        job.started_at = datetime.now(timezone.utc)
        await job.save()

        _publish_progress(r, job_id, "started", {"message": "Training pipeline started"})

        # ── Load dataset ──────────────────────────────────────────────
        dataset = await Dataset.get(uuid.UUID(dataset_id))

        from app.services.storage_service import StorageService
        storage = StorageService()
        file_bytes = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)

        _publish_progress(r, job_id, "progress", {"message": "Dataset loaded from storage", "pct": 10})

        metrics: dict = {}
        artifact_path: str = ""
        onnx_path: str | None = None
        framework = MLFramework.flaml
        input_schema: dict = {}

        try:
            tt = TaskType(task_type)

            if tt in (TaskType.classification, TaskType.regression):
                from ml_engine.tabular.trainer import train_tabular
                result_data = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: train_tabular(
                        file_bytes=file_bytes,
                        file_path=dataset.minio_path,
                        target_column=target_column,
                        task_type=task_type,
                        config=config,
                        job_id=job_id,
                        progress_cb=lambda msg, pct: _publish_progress(r, job_id, "progress", {"message": msg, "pct": pct}),
                    )
                )
                metrics = result_data["metrics"]
                artifact_path = result_data["artifact_path"]
                framework = MLFramework.flaml
                input_schema = result_data["input_schema"]

            elif tt == TaskType.image_classification:
                from ml_engine.vision.trainer import train_image_classifier
                result_data = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: train_image_classifier(
                        file_bytes=file_bytes,
                        config=config,
                        job_id=job_id,
                        progress_cb=lambda msg, pct: _publish_progress(r, job_id, "progress", {"message": msg, "pct": pct}),
                    )
                )
                metrics = result_data["metrics"]
                artifact_path = result_data["artifact_path"]
                onnx_path = result_data.get("onnx_path")
                framework = MLFramework.pytorch
                input_schema = result_data["input_schema"]

            elif tt in (TaskType.sentiment, TaskType.text_classification):
                from ml_engine.nlp.trainer import train_text_classifier
                result_data = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: train_text_classifier(
                        file_bytes=file_bytes,
                        task_type=task_type,
                        config=config,
                        job_id=job_id,
                        progress_cb=lambda msg, pct: _publish_progress(r, job_id, "progress", {"message": msg, "pct": pct}),
                    )
                )
                metrics = result_data["metrics"]
                artifact_path = result_data["artifact_path"]
                framework = MLFramework.huggingface
                input_schema = result_data["input_schema"]

            # ── Store model ───────────────────────────────────────────
            from python_slugify import slugify
            model_name = f"{task_type}-model-{job_id[:8]}"
            base_slug = slugify(model_name)
            slug = base_slug
            counter = 1
            while True:
                existing = await MLModel.find_one(MLModel.slug == slug)
                if not existing:
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1

            model = MLModel(
                owner_id=uuid.UUID(owner_id),
                training_job_id=uuid.UUID(job_id),
                name=model_name,
                task_type=tt,
                framework=framework,
                stage=ModelStage.staging,
                metrics=metrics,
                input_schema=input_schema,
                artifact_path=artifact_path,
                onnx_path=onnx_path,
                slug=slug,
            )
            await model.insert()

            job.status = JobStatus.completed
            job.completed_at = datetime.now(timezone.utc)
            job.metrics = metrics
            await job.save()

            _publish_progress(r, job_id, "completed", {"message": "Training complete!", "pct": 100, "metrics": metrics})

            # Send completion email
            user = await User.get(uuid.UUID(owner_id))
            if user:
                from app.services.email_service import send_training_complete_email
                await send_training_complete_email(user.email, model_name, metrics)

        except Exception as exc:
            log.error("training.failed", job_id=job_id, error=str(exc))
            job.status = JobStatus.failed
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            await job.save()
            _publish_progress(r, job_id, "failed", {"message": str(exc)})
            raise

    import asyncio
    asyncio.run(_run())
