"""Training job routes — /api/v1/training/"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import StreamingResponse

from app.models.models import User, Dataset, TrainingJob, JobStatus
from app.schemas.schemas import TrainingJobCreate, TrainingJobOut
from app.api.v1.auth import get_current_user
from app.workers.training_tasks import run_training_job
from app.core.config import settings
import redis.asyncio as aioredis
import json
import asyncio

router = APIRouter(prefix="/training", tags=["Training"])


async def get_redis():
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield r
    finally:
        await r.aclose()


@router.post("/jobs", response_model=TrainingJobOut, status_code=201)
async def create_training_job(
    body: TrainingJobCreate,
    current_user: User = Depends(get_current_user),
):
    """Submit a new training job to the Celery queue."""
    # Verify dataset ownership
    dataset = await Dataset.find_one(Dataset.id == body.dataset_id, Dataset.owner_id == current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail=f"Dataset is not ready (status={dataset.status})")

    job = TrainingJob(
        owner_id=current_user.id,
        dataset_id=body.dataset_id,
        task_type=body.task_type,
        target_column=body.target_column,
        config=body.config.model_dump(),
        status=JobStatus.queued,
        logs=[],
    )
    await job.insert()

    # Submit Celery task
    task = run_training_job.delay(
        job_id=str(job.id),
        dataset_id=str(body.dataset_id),
        task_type=body.task_type.value,
        target_column=body.target_column,
        config=body.config.model_dump(),
        owner_id=str(current_user.id),
    )
    job.celery_task_id = task.id
    await job.save()
    return job


@router.get("/jobs", response_model=list[TrainingJobOut])
async def list_jobs(
    current_user: User = Depends(get_current_user),
):
    """List all training jobs for the current user."""
    return await TrainingJob.find(TrainingJob.owner_id == current_user.id).sort(-TrainingJob.created_at).to_list()


@router.get("/jobs/{job_id}", response_model=TrainingJobOut)
async def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Get job status and metrics."""
    job = await TrainingJob.find_one(TrainingJob.id == job_id, TrainingJob.owner_id == current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return job


@router.delete("/jobs/{job_id}", status_code=204)
async def cancel_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Cancel a queued or running training job."""
    job = await TrainingJob.find_one(TrainingJob.id == job_id, TrainingJob.owner_id == current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    if job.status not in (JobStatus.queued, JobStatus.running):
        raise HTTPException(status_code=400, detail=f"Job is already {job.status.value}")

    if job.celery_task_id:
        from app.workers.celery_app import celery_app
        celery_app.control.revoke(job.celery_task_id, terminate=True)
    job.status = JobStatus.cancelled
    await job.save()


@router.get("/jobs/{job_id}/logs")
async def stream_logs(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    """Server-Sent Events stream for real-time training logs."""
    job = await TrainingJob.find_one(TrainingJob.id == job_id, TrainingJob.owner_id == current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")

    async def event_generator():
        channel = f"training:{job_id}"
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    yield f"data: {data}\n\n"
                    parsed = json.loads(data)
                    if parsed.get("event") in ("completed", "failed", "cancelled"):
                        break
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
