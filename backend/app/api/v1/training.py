"""Training job routes — /api/v1/training/"""
import uuid
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse

from app.models.models import User, Dataset, TrainingJob, JobStatus
from app.schemas.schemas import TrainingJobCreate, TrainingJobOut
from app.api.v1.auth import get_current_user, get_verified_user
from app.services.quota_service import check_quota, increment_usage
from app.core.config import settings
from app.core.security import decode_token
import redis.asyncio as aioredis
import structlog

log = structlog.get_logger()
router = APIRouter(prefix="/training", tags=["Training"])


async def get_redis_optional():
    """Return a Redis client, or None if unavailable."""
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()
        return r
    except Exception:
        return None


@router.post("/jobs", response_model=TrainingJobOut, status_code=201)
async def create_training_job(
    body: TrainingJobCreate,
    current_user: User = Depends(get_verified_user),
):
    """Submit a new training job."""
    # Check training job quota
    await check_quota(current_user.id, "training_jobs")

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

    # Run training in a background asyncio task (no Celery needed)
    asyncio.create_task(
        _run_training_background(
            job_id=str(job.id),
            dataset_id=str(body.dataset_id),
            task_type=body.task_type.value,
            target_column=body.target_column,
            config=body.config.model_dump(),
            owner_id=str(current_user.id),
        )
    )

    # Track usage
    await increment_usage(current_user.id, "training_jobs")

    return job


async def _run_training_background(
    job_id: str,
    dataset_id: str,
    task_type: str,
    target_column: str | None,
    config: dict,
    owner_id: str,
):
    """Execute training in-process as a background async task."""
    from app.services.storage_service import StorageService
    from app.services.data_profiler import profile_dataset
    from app.models.models import MLModel
    from datetime import datetime, timezone
    import io
    import pandas as pd
    import numpy as np

    redis = await get_redis_optional()

    async def publish(msg: dict):
        """Publish a training log message to Redis and save to DB."""
        try:
            job = await TrainingJob.get(uuid.UUID(job_id))
            if job:
                if not job.logs:
                    job.logs = []
                job.logs.append(msg.get("message", ""))
                await job.save()
        except Exception:
            pass

        if redis:
            try:
                await redis.publish(f"training:{job_id}", json.dumps(msg))
            except Exception:
                pass

    try:
        # Update status to running
        job = await TrainingJob.get(uuid.UUID(job_id))
        if not job:
            return
        job.status = JobStatus.running
        job.started_at = datetime.now(timezone.utc)
        await job.save()

        await publish({"message": "🚀 Training job started", "pct": 5})

        # Load dataset
        dataset = await Dataset.get(uuid.UUID(dataset_id))
        if not dataset:
            raise ValueError("Dataset not found")

        storage = await StorageService.get_instance()
        content = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)
        await publish({"message": f"📂 Loaded dataset: {dataset.name} ({dataset.row_count} rows)", "pct": 15})

        path = dataset.minio_path.lower()
        if path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif path.endswith(".parquet"):
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))

        await publish({"message": f"📊 Dataset shape: {df.shape[0]} rows × {df.shape[1]} columns", "pct": 20})

        # Determine target and features
        if target_column and target_column in df.columns:
            y = df[target_column]
            X = df.drop(columns=[target_column])
        else:
            y = df.iloc[:, -1]
            target_column = df.columns[-1]
            X = df.iloc[:, :-1]

        # Exclude user-specified columns
        excluded = config.get("excluded_columns", [])
        actually_excluded = [c for c in excluded if c in X.columns]
        if actually_excluded:
            X = X.drop(columns=actually_excluded)
            await publish({"message": f"🚫 Excluded {len(actually_excluded)} columns: {', '.join(actually_excluded)}", "pct": 23})

        await publish({"message": f"🎯 Target: {target_column} ({y.nunique()} unique values)", "pct": 25})

        # Clean data
        numeric_cols = X.select_dtypes(include="number").columns.tolist()
        cat_cols = X.select_dtypes(exclude="number").columns.tolist()

        # Fill numeric nulls with median
        for c in numeric_cols:
            if X[c].isnull().any():
                X[c] = X[c].fillna(X[c].median())

        # Fill categorical nulls with mode
        for c in cat_cols:
            if X[c].isnull().any():
                mode = X[c].mode()
                X[c] = X[c].fillna(mode.iloc[0] if len(mode) > 0 else "unknown")

        # Label encode categoricals
        label_maps = {}
        for c in cat_cols:
            X[c] = X[c].astype("category")
            label_maps[c] = dict(enumerate(X[c].cat.categories))
            X[c] = X[c].cat.codes

        await publish({"message": f"🧹 Cleaned: {len(numeric_cols)} numeric, {len(cat_cols)} categorical columns", "pct": 35})

        # Handle target encoding for classification
        if task_type in ("classification", "text_classification", "sentiment"):
            if not pd.api.types.is_numeric_dtype(y):
                y = y.astype("category").cat.codes

        # Drop remaining nulls in target
        mask = y.notna()
        X = X[mask].reset_index(drop=True)
        y = y[mask].reset_index(drop=True)

        await publish({"message": f"✅ Final training set: {len(X)} samples, {X.shape[1]} features", "pct": 40})

        # Read hyperparameters from config
        algorithm = config.get("algorithm", "auto")
        n_estimators = config.get("n_estimators", 100)
        max_depth_val = config.get("max_depth", None)
        lr = config.get("learning_rate", 0.1)
        test_sz = config.get("test_size", 0.2)
        random_st = config.get("random_state", 42)
        cv_folds = config.get("cross_validation", None)

        # Train-test split
        from sklearn.model_selection import train_test_split, cross_val_score
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_sz, random_state=random_st)
        await publish({"message": f"📐 Train/test split: {len(X_train)}/{len(X_test)} (test_size={test_sz})", "pct": 45})

        metrics = {}
        time_limit = config.get("time_limit_seconds", 120)

        if task_type in ("classification", "text_classification", "sentiment", "image_classification"):
            await publish({"message": "🔧 Training classification models...", "pct": 50})

            from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
            from sklearn.linear_model import LogisticRegression
            from sklearn.svm import SVC
            from sklearn.neighbors import KNeighborsClassifier
            from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

            all_models = {
                "logistic_regression": ("LogisticRegression", LogisticRegression(max_iter=500, random_state=random_st)),
                "random_forest": ("RandomForest", RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth_val, random_state=random_st, n_jobs=-1)),
                "gradient_boosting": ("GradientBoosting", GradientBoostingClassifier(n_estimators=n_estimators, max_depth=max_depth_val or 3, learning_rate=lr, random_state=random_st)),
                "svm": ("SVM", SVC(probability=True, random_state=random_st)),
                "knn": ("KNN", KNeighborsClassifier()),
            }

            if algorithm == "auto":
                models = [all_models["logistic_regression"], all_models["random_forest"], all_models["gradient_boosting"]]
            elif algorithm in all_models:
                models = [all_models[algorithm]]
            else:
                models = [all_models["random_forest"]]

            best_score = -1
            best_model = None
            best_name = ""

            for i, (name, model) in enumerate(models):
                pct = 55 + (i * 10)
                await publish({"message": f"  ⏳ Training {name}...", "pct": pct})
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, model.fit, X_train, y_train)
                    preds = await loop.run_in_executor(None, model.predict, X_test)
                    acc = accuracy_score(y_test, preds)
                    f1 = f1_score(y_test, preds, average="weighted", zero_division=0)

                    cv_msg = ""
                    if cv_folds:
                        cv_scores = await loop.run_in_executor(None, lambda: cross_val_score(model, X, y, cv=cv_folds, scoring="accuracy"))
                        cv_msg = f", CV({cv_folds})={cv_scores.mean():.4f}±{cv_scores.std():.4f}"
                    
                    await publish({"message": f"  ✅ {name}: accuracy={acc:.4f}, f1={f1:.4f}{cv_msg}", "pct": pct + 5})

                    if f1 > best_score:
                        best_score = f1
                        best_model = model
                        best_name = name
                except Exception as e:
                    await publish({"message": f"  ❌ {name} failed: {str(e)[:100]}", "pct": pct + 5})

            if best_model is not None:
                preds = best_model.predict(X_test)
                metrics = {
                    "accuracy": round(float(accuracy_score(y_test, preds)), 4),
                    "f1_weighted": round(float(f1_score(y_test, preds, average="weighted", zero_division=0)), 4),
                    "best_model": best_name,
                }
                # Feature importance for tree-based models
                if hasattr(best_model, "feature_importances_"):
                    fi = best_model.feature_importances_
                    feature_names = X.columns.tolist()
                    top_features = sorted(zip(feature_names, fi.tolist()), key=lambda x: x[1], reverse=True)[:15]
                    metrics["feature_importance"] = [{"feature": f, "importance": round(imp, 4)} for f, imp in top_features]
                try:
                    if len(set(y_test)) == 2:
                        proba = best_model.predict_proba(X_test)[:, 1]
                        metrics["roc_auc"] = round(float(roc_auc_score(y_test, proba)), 4)
                except Exception:
                    pass
                # Confusion matrix
                try:
                    from sklearn.metrics import confusion_matrix
                    cm = confusion_matrix(y_test, preds).tolist()
                    metrics["confusion_matrix"] = cm
                except Exception:
                    pass

        elif task_type == "regression":
            await publish({"message": "🔧 Training regression models...", "pct": 50})

            from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
            from sklearn.linear_model import LinearRegression
            from sklearn.svm import SVR
            from sklearn.neighbors import KNeighborsRegressor
            from sklearn.metrics import mean_squared_error, r2_score

            all_models = {
                "linear_regression": ("LinearRegression", LinearRegression()),
                "random_forest": ("RandomForest", RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth_val, random_state=random_st, n_jobs=-1)),
                "gradient_boosting": ("GradientBoosting", GradientBoostingRegressor(n_estimators=n_estimators, max_depth=max_depth_val or 3, learning_rate=lr, random_state=random_st)),
                "svm": ("SVR", SVR()),
                "knn": ("KNN", KNeighborsRegressor()),
            }

            if algorithm == "auto":
                models = [all_models["linear_regression"], all_models["random_forest"], all_models["gradient_boosting"]]
            elif algorithm in all_models:
                models = [all_models[algorithm]]
            else:
                models = [all_models["random_forest"]]

            best_score = -999
            best_model = None
            best_name = ""

            for i, (name, model) in enumerate(models):
                pct = 55 + (i * 10)
                await publish({"message": f"  ⏳ Training {name}...", "pct": pct})
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, model.fit, X_train, y_train)
                    preds = await loop.run_in_executor(None, model.predict, X_test)
                    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
                    r2 = float(r2_score(y_test, preds))

                    cv_msg = ""
                    if cv_folds:
                        cv_scores = await loop.run_in_executor(None, lambda: cross_val_score(model, X, y, cv=cv_folds, scoring="r2"))
                        cv_msg = f", CV({cv_folds})={cv_scores.mean():.4f}±{cv_scores.std():.4f}"

                    await publish({"message": f"  ✅ {name}: RMSE={rmse:.4f}, R²={r2:.4f}{cv_msg}", "pct": pct + 5})

                    if r2 > best_score:
                        best_score = r2
                        best_model = model
                        best_name = name
                except Exception as e:
                    await publish({"message": f"  ❌ {name} failed: {str(e)[:100]}", "pct": pct + 5})

            if best_model is not None:
                preds = best_model.predict(X_test)
                metrics = {
                    "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 4),
                    "r2": round(float(r2_score(y_test, preds)), 4),
                    "best_model": best_name,
                }
                if hasattr(best_model, "feature_importances_"):
                    fi = best_model.feature_importances_
                    feature_names = X.columns.tolist()
                    top_features = sorted(zip(feature_names, fi.tolist()), key=lambda x: x[1], reverse=True)[:15]
                    metrics["feature_importance"] = [{"feature": f, "importance": round(imp, 4)} for f, imp in top_features]

        await publish({"message": f"🏆 Best model: {metrics.get('best_model', 'N/A')}", "pct": 90})

        # Save model artifact
        import pickle
        if best_model is not None:
            model_bytes = pickle.dumps(best_model)
            model_path = f"{owner_id}/{job_id}/model.pkl"
            storage = await StorageService.get_instance()
            await storage.upload_bytes(
                bucket=settings.R2_BUCKET_MODELS,
                object_name=model_path,
                data=model_bytes,
                content_type="application/octet-stream",
            )
            await publish({"message": f"💾 Model saved ({len(model_bytes) / 1024:.1f} KB)", "pct": 95})

            # Create ML Model record
            import re, time
            slug = re.sub(r'[^a-z0-9]+', '-', f"{task_type}-{best_name}-{int(time.time())}".lower()).strip('-')
            ml_model = MLModel(
                owner_id=uuid.UUID(owner_id),
                training_job_id=uuid.UUID(job_id),
                name=f"{task_type}_{best_name}",
                task_type=task_type,
                framework="sklearn",
                metrics=metrics,
                artifact_path=model_path,
                slug=slug,
            )
            await ml_model.insert()

        # Mark complete
        job = await TrainingJob.get(uuid.UUID(job_id))
        if job:
            job.status = JobStatus.completed
            job.metrics = metrics
            job.completed_at = datetime.now(timezone.utc)
            await job.save()

        await publish({"message": "🎉 Training complete!", "pct": 100, "event": "completed"})

        # Send notification
        try:
            from app.api.v1.notifications import create_notification
            await create_notification(
                user_id=uuid.UUID(user_id),
                type="training_complete",
                title="Training Complete! 🎉",
                message=f"Your {task_type} model finished training. Best: {metrics.get('best_model', 'N/A')}",
                link=f"/models",
            )
        except Exception:
            pass

    except Exception as e:
        log.error("training.failed", job_id=job_id, error=str(e))
        await publish({"message": f"❌ Training failed: {str(e)}", "pct": 0, "event": "failed"})
        try:
            job = await TrainingJob.get(uuid.UUID(job_id))
            if job:
                job.status = JobStatus.failed
                job.error_message = str(e)[:500]
                await job.save()
        except Exception:
            pass

        # Send failure notification
        try:
            from app.api.v1.notifications import create_notification
            await create_notification(
                user_id=uuid.UUID(user_id),
                type="training_failed",
                title="Training Failed ❌",
                message=f"Your {task_type} training job encountered an error.",
                link=f"/train",
            )
        except Exception:
            pass
    finally:
        if redis:
            await redis.aclose()


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
    job.status = JobStatus.cancelled
    await job.save()


@router.get("/jobs/{job_id}/logs")
async def stream_logs(
    job_id: uuid.UUID,
    token: str = Query(...),
):
    """Server-Sent Events stream for real-time training logs.
    
    Auth via query param since EventSource doesn't support headers.
    """
    # Validate token from query parameter
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    job = await TrainingJob.find_one(
        TrainingJob.id == job_id,
        TrainingJob.owner_id == uuid.UUID(user_id),
    )
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")

    redis = await get_redis_optional()

    async def event_generator():
        # First, send any existing logs
        current_job = await TrainingJob.get(job_id)
        if current_job and current_job.logs:
            for log_msg in current_job.logs:
                yield f"data: {json.dumps({'message': log_msg})}\n\n"

        # If job is already done, send final event
        if current_job and current_job.status in (JobStatus.completed, JobStatus.failed, JobStatus.cancelled):
            yield f"data: {json.dumps({'event': current_job.status.value, 'message': f'Job {current_job.status.value}'})}\n\n"
            return

        # Stream from Redis pub/sub if available
        if redis:
            try:
                channel = f"training:{job_id}"
                pubsub = redis.pubsub()
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
            except Exception:
                pass
        else:
            # Poll the database for updates if no Redis
            seen = len(current_job.logs) if current_job and current_job.logs else 0
            for _ in range(600):  # max 10 minutes
                await asyncio.sleep(1)
                current_job = await TrainingJob.get(job_id)
                if current_job and current_job.logs and len(current_job.logs) > seen:
                    for msg in current_job.logs[seen:]:
                        yield f"data: {json.dumps({'message': msg})}\n\n"
                    seen = len(current_job.logs)
                if current_job and current_job.status in (JobStatus.completed, JobStatus.failed, JobStatus.cancelled):
                    yield f"data: {json.dumps({'event': current_job.status.value, 'message': f'Job {current_job.status.value}'})}\n\n"
                    return

    return StreamingResponse(event_generator(), media_type="text/event-stream")
