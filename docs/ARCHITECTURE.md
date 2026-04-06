# Architecture Decision Records

## System Overview

The NoCode AI Platform follows a **microservices-inspired monolith** pattern — a single deployable backend that is organized into clearly separated domains but runs in one process for operational simplicity. Horizontal scaling is achieved by running multiple backend replicas behind a load balancer.

---

## Core Components

### 1. API Layer (FastAPI)

**Why FastAPI over Django/Flask?**
- Native async/await support for non-blocking I/O (critical for SSE streaming)
- Auto-generated OpenAPI documentation
- Pydantic v2 for strict, performant request validation
- First-class dependency injection for testability

**Route Organization:**
```
/api/v1/auth/       → Authentication & user management
/api/v1/data/       → Dataset upload & profiling
/api/v1/training/   → Job submission & status
/api/v1/models/     → Model registry
/api/v1/inference/  → Real-time prediction
/api/v1/explain/    → SHAP, Grad-CAM, token importance
/api/v1/deploy/     → Deployment lifecycle
/serve/{user}/{model}/predict  → Production API endpoints
```

### 2. Database Layer

**PostgreSQL + SQLAlchemy async ORM**
- All DB operations are async (asyncpg driver)
- No raw SQL — ORM-only queries prevent SQL injection
- Alembic for schema migrations
- Connection pooling: 10 base / 20 max overflow

**Data model relationships:**
```
User
 ├─ Dataset (1:many)
 ├─ TrainingJob (1:many)
 │   └─ MLModel (1:1)
 │       ├─ Deployment (1:many)
 │       └─ APIKey (1:many)
 └─ AuditLog (1:many)
```

### 3. Object Storage (MinIO)

**Why MinIO over local filesystem?**
- Production-ready: S3-compatible, swappable with AWS S3 in one config change
- Supports streaming uploads/downloads for large files
- Presigned URLs for secure direct downloads
- Bucket organization: `datasets/` and `models/`

**Storage hierarchy:**
```
datasets/{user_id}/{dataset_id}/{filename}
models/tabular/{model_id}/pipeline.pkl
models/vision/{model_id}/model.pkl
models/vision/{model_id}/model.onnx
models/nlp/{model_id}/model.tar.gz
```

### 4. Async Task Queue (Celery + Redis)

**Why Celery?**
- Training jobs can take minutes — they cannot block the API
- Workers scale independently from the API
- Redis pub/sub enables real-time SSE log streaming

**Training job lifecycle:**
```
API receives request
  → Creates TrainingJob(status=QUEUED) in DB
  → Dispatches Celery task
  → Returns job_id to client

Celery worker picks up task
  → Updates status=RUNNING
  → Publishes progress events to Redis channel
  → Executes ML pipeline
  → Creates MLModel record
  → Updates status=COMPLETED or FAILED

Frontend SSE subscription
  → Subscribes to /training/jobs/{id}/logs
  → Backend forwards Redis pub/sub messages as SSE
  → Client renders live log + progress bar
```

### 5. ML Engine

**Tabular (FLAML AutoML):**
- FLAML chosen over AutoGluon for lower resource requirements (runs on CPU)
- Pipeline: impute → scale → one-hot encode → AutoML (LightGBM/XGBoost/RF)
- Entire pipeline (preprocessor + model) pickled together for reproducible inference
- Feature schema stored in `input_schema` for dynamic form generation

**Vision (PyTorch Transfer Learning):**
- EfficientNet-B0 default: top-1 accuracy on ImageNet + efficient inference
- ResNet50 for when accuracy > speed is preferred
- Two-phase training: warm-up (head only) → full fine-tune (lower LR)
- ONNX export for runtime-agnostic inference
- Albumentations augmentation pipeline

**NLP (HuggingFace Transformers):**
- DistilBERT default: 40% smaller than BERT, 95% of the performance
- HF Trainer handles distributed training, mixed precision, gradient accumulation
- Model + tokenizer + LabelEncoder stored as tarball for atomic saves
- Token importance via attention weights (last transformer layer, CLS token)

### 6. Model Cache (LRU)

The inference service maintains an in-memory LRU cache of the 5 most recently used models. This prevents the overhead of downloading from MinIO on every request:

```
Request → Check cache (model_id key)
  Hit → Return cached artifact
  Miss → Download from MinIO → Store in cache → Return
```

Cache eviction: when the 6th model is loaded, the least recently used is evicted.

---

## Data Flow Diagrams

### Upload → Profile → Training

```
User uploads CSV
  ↓
API validates MIME + size
  ↓
Stores raw file in MinIO
  ↓
Creates Dataset(status=processing) in DB
  ↓
Background task: profile_dataset()
  ├─ Parses CSV → pandas DataFrame
  ├─ Computes column stats, nulls, correlations
  ├─ Generates quality score
  └─ Updates Dataset(status=ready, profile=...)
  ↓
User selects Dataset + Task → submits Training Job
  ↓
Celery worker: train_tabular()/train_image()/train_nlp()
  ↓
Stores model artifact in MinIO
  ↓
Creates MLModel(stage=staging) in DB
```

### Prediction Flow

```
POST /inference/{model_id}/predict
  ↓
Validate user ownership
  ↓
Check LRU cache for model
  ├─ Cache hit: use cached artifact
  └─ Cache miss: download from MinIO → cache it
  ↓
Apply preprocessing pipeline (tabular)
OR resize/normalize (image)
OR tokenize (text)
  ↓
Model inference
  ↓
Return {prediction, confidence, class_probabilities, latency_ms}
```

---

## Security Architecture

```
Internet → Rate Limiter (slowapi) → CORS Filter → JWT Guard → Route Handler
                                                        ↓
                                              AuditLog.create()
```

- Every inbound request goes through rate limiting before auth
- CORS whitelist prevents cross-origin abuse
- JWT guard validates signature + expiry + Redis revocation list
- All mutations create audit log entries for GDPR compliance

---

## Scalability

| Concern | Solution |
|---|---|
| High prediction throughput | Multiple API replicas + model cache |
| Long training jobs | Celery worker pool (horizontal) |
| Large file uploads | MinIO multipart + streaming |
| DB connection saturation | Connection pooling (asyncpg) |
| Monitoring | Prometheus + Grafana |

---

## Technology Choices vs Alternatives

| Component | Chosen | Rejected | Reason |
|---|---|---|---|
| AutoML | FLAML | AutoGluon | FLAML is CPU-friendly; AutoGluon requires heavy deps |
| Storage | MinIO | S3 | Self-hosted for cost control; S3-compatible for migration |
| Task Queue | Celery | RQ, Dramatiq | Ecosystem maturity; Redis integration |
| ORM | SQLAlchemy 2.0 | Tortoise-ORM | Mature ecosystem, async native in v2 |
| Frontend | Vite + React | Next.js | SPA is sufficient; no SSR needed for dashboard |
