# API Guide

## Base URL

```
http://localhost:8000/api/v1
```

Interactive Swagger UI available at: `http://localhost:8000/docs`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after **15 minutes**. Use the refresh endpoint to obtain a new one.

---

## Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Revoke current token |
| `GET` | `/auth/me` | Get current user profile |
| `GET` | `/auth/verify/{token}` | Verify email address |

**Register Example:**
```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "Jane Doe"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "role": "free",
  "is_verified": false,
  "slug": "jane-doe",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### Data Management

| Method | Path | Description |
|---|---|---|
| `POST` | `/data/upload` | Upload dataset file |
| `GET` | `/data/datasets` | List user's datasets |
| `GET` | `/data/datasets/{id}` | Get dataset + metadata |
| `DELETE` | `/data/datasets/{id}` | Delete dataset |
| `GET` | `/data/datasets/{id}/profile` | Get quality report |

**Upload Example (multipart/form-data):**
```bash
curl -X POST http://localhost:8000/api/v1/data/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@iris.csv"
```

**File Limits per Tier:**
| Tier | Limit |
|---|---|
| Free | 100 MB |
| Pro | 2 GB |
| Enterprise | 50 GB |

---

### Training

| Method | Path | Description |
|---|---|---|
| `POST` | `/training/jobs` | Submit training job |
| `GET` | `/training/jobs` | List all jobs |
| `GET` | `/training/jobs/{id}` | Job status + metrics |
| `DELETE` | `/training/jobs/{id}` | Cancel job |
| `GET` | `/training/jobs/{id}/logs` | Stream logs (SSE) |

**Submit Training Job:**
```json
POST /training/jobs
{
  "dataset_id": "uuid",
  "task_type": "classification",
  "target_column": "species",
  "config": {
    "time_limit_seconds": 120,
    "metric": "auto",
    "presets": "medium_quality"
  }
}
```

**Task Types:**
- `classification` — Binary/multiclass tabular
- `regression` — Numeric prediction
- `image_classification` — Image recognition
- `text_classification` — Text categories
- `sentiment` — Positive/negative sentiment

**SSE Log Stream:**
```javascript
const es = new EventSource(`/api/v1/training/jobs/${jobId}/logs`)
es.onmessage = (e) => {
  const { event, message, pct } = JSON.parse(e.data)
  // event: "started" | "progress" | "completed" | "failed"
}
```

---

### Model Registry

| Method | Path | Description |
|---|---|---|
| `GET` | `/models/` | List models (with filters) |
| `GET` | `/models/{id}` | Get model details |
| `PATCH` | `/models/{id}` | Update name/description |
| `DELETE` | `/models/{id}` | Delete model |
| `GET` | `/models/{id}/metrics` | Full evaluation metrics |
| `POST` | `/models/{id}/promote` | Promote to production |

---

### Inference

| Method | Path | Description |
|---|---|---|
| `GET` | `/inference/{id}/predict/schema` | Input schema |
| `POST` | `/inference/{id}/predict` | Single prediction |
| `POST` | `/inference/{id}/predict/batch` | Batch predictions (CSV) |

**Single Prediction:**
```json
POST /inference/{model_id}/predict
{
  "inputs": {
    "sepal_length": 5.1,
    "sepal_width": 3.5,
    "petal_length": 1.4,
    "petal_width": 0.2
  }
}
```

**Response:**
```json
{
  "prediction": "setosa",
  "confidence": 0.97,
  "class_probabilities": {
    "setosa": 0.97,
    "versicolor": 0.02,
    "virginica": 0.01
  },
  "latency_ms": 12.3
}
```

---

### Explainability

| Method | Path | Description |
|---|---|---|
| `POST` | `/explain/{id}/shap` | Global SHAP importances |
| `POST` | `/explain/{id}/shap/local` | Per-instance SHAP |
| `POST` | `/explain/{id}/gradcam` | Grad-CAM heatmap |
| `POST` | `/explain/{id}/token-importance` | NLP token importance |

---

### Deployment

| Method | Path | Description |
|---|---|---|
| `POST` | `/deploy/{id}/api` | Deploy REST API |
| `GET` | `/deploy/{id}/api` | Get deployment status |
| `DELETE` | `/deploy/{id}/api` | Undeploy |
| `GET` | `/deploy/{id}/api/usage` | Usage stats |
| `POST` | `/deploy/{id}/export` | Export model |
| `POST` | `/deploy/{id}/keys` | Create API key |
| `DELETE` | `/deploy/{id}/keys/{key_id}` | Revoke API key |

---

## Error Responses

All errors return a structured JSON body:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

Common HTTP status codes:
| Code | Meaning |
|---|---|
| 400 | Bad request |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 413 | File size exceeds tier limit |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Rate Limits

- Auth endpoints: **10 requests/minute**
- All other endpoints: **100 requests/minute**

Rate limit exceeded response (`429`):
```json
{"error": "Rate limit exceeded", "code": "RATE_LIMITED", "details": {"retry_after": 30}}
```
