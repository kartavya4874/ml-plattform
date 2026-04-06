# NoCode AI Platform

<div align="center">

![NoCode AI Platform](https://img.shields.io/badge/NoCode%20AI-Platform-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMSAxNHYtNGgtNGwyLThoM3Y0aDR6Ii8+PC9zdmc+)

[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker)](https://docker.com)

**Train, explain, and deploy AI models — without writing a single line of code.**

[Live Demo](#) · [Documentation](./docs/) · [API Reference](http://localhost:8000/docs)

</div>

---

## ✨ What is NoCode AI Platform?

NoCode AI Platform democratizes machine learning for non-technical users. In under 30 minutes, you can:

1. 📂 **Upload** your data (CSV, Excel, images, text)
2. 🔬 **Train** a state-of-the-art ML model (AutoML, transfer learning, fine-tuned NLP)
3. 💡 **Explain** predictions with SHAP, Grad-CAM, and token importance
4. 🚀 **Deploy** a production REST API with one click

---

## 🏗 Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                   │
│    Dashboard · Data · Training Studio · Model Hub         │
│    Explainability Lab · Testing Playground · Deploy Hub   │
└──────────────────────────┬────────────────────────────────┘
                           │ REST / SSE
┌──────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                          │
│  Auth · Data · Training · Models · Inference · Explain    │
│  Deploy · Serving Endpoints                               │
└────────┬──────────────┬──────────────────┬────────────────┘
         │              │                  │
    ┌────▼────┐   ┌─────▼──────┐   ┌──────▼──────┐
    │PostgreSQL│   │   Redis    │   │    MinIO    │
    │ (ORM)   │   │(Queue/Cache│   │(Model/Data) │
    └─────────┘   └─────┬──────┘   └─────────────┘
                        │
                  ┌─────▼──────┐
                  │   Celery   │
                  │  Workers   │
                  └─────┬──────┘
                        │
              ┌─────────▼──────────┐
              │      ML Engine     │
              │ FLAML · PyTorch    │
              │ HuggingFace · SHAP │
              └────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/nocode-ai-platform.git
cd nocode-ai-platform

# 2. Configure environment
cp .env.example .env
# Edit .env: change JWT_SECRET_KEY to a random 256-bit value

# 3. Launch all services
docker-compose up -d

# 4. Open the platform
open http://localhost:3000
```

All services start automatically:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| Celery Flower | http://localhost:5555 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

### Option B: Local Development

```bash
# Terminal 1: Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # edit as needed
uvicorn main:app --reload --port 8000

# Terminal 2: Celery Worker
cd backend
celery -A app.workers.celery_app worker --loglevel=info -Q training

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
nocode-ai-platform/
├── frontend/               # React 18 + TypeScript SPA (Vite)
│   └── src/
│       ├── pages/          # Dashboard, DataExplorer, TrainingStudio, ModelHub...
│       ├── store/          # Redux slices (auth, data, training, models)
│       ├── api/            # Axios client w/ JWT refresh interceptor
│       └── components/     # Layout, shared components
│
├── backend/                # FastAPI Python microservices
│   ├── app/
│   │   ├── api/v1/         # Route handlers (auth, data, training, models, ...)
│   │   ├── core/           # Config, DB, Security
│   │   ├── models/         # SQLAlchemy ORM
│   │   ├── schemas/        # Pydantic v2 schemas
│   │   ├── services/       # Business logic (storage, profiler, inference, explain)
│   │   └── workers/        # Celery tasks
│   └── main.py             # FastAPI app factory
│
├── ml_engine/              # ML/DL training pipelines
│   ├── tabular/trainer.py  # FLAML AutoML pipeline
│   ├── vision/trainer.py   # EfficientNet/ResNet transfer learning
│   └── nlp/trainer.py      # DistilBERT/BERT fine-tuning
│
├── deployment/
│   ├── docker/             # Dockerfiles + prometheus.yml
│   └── .github/workflows/  # CI/CD pipeline
│
├── tests/
│   ├── unit/               # Unit tests (pytest)
│   └── integration/        # Integration tests
│
└── docker-compose.yml      # Full stack orchestration
```

---

## 🤖 Supported ML Tasks

| Task | Models | Explainability |
|---|---|---|
| Tabular Classification | FLAML AutoML (LightGBM, XGBoost, RF) | SHAP TreeExplainer |
| Tabular Regression | FLAML AutoML | SHAP TreeExplainer |
| Image Classification | EfficientNet-B0, ResNet50 | Grad-CAM heatmaps |
| Text Classification | DistilBERT, BERT, RoBERTa | Token importance (attention) |
| Sentiment Analysis | DistilBERT, BERT, RoBERTa | Token importance (attention) |

---

## 🔒 Security

- **JWT Authentication** — Access tokens (15min) + refresh tokens (7-day) with Redis revocation
- **Password Hashing** — bcrypt with configurable rounds
- **API Key Security** — Only `sha256(key)` stored, raw key shown once at creation
- **Input Validation** — Pydantic v2 strict mode on all endpoints
- **Rate Limiting** — slowapi, per-user and per-IP
- **CORS** — Restricted to configured origins
- **Audit Logging** — Every data mutation logged with user ID + timestamp

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend
pytest tests/unit -v --cov=app --cov-report=term-missing

# Frontend
cd frontend
npm run test        # Jest + React Testing Library
npm run lint        # ESLint
```

---

## 📊 Monitoring

- **Prometheus** metrics auto-exposed at `/metrics` via `prometheus-fastapi-instrumentator`
- Pre-built **Grafana** dashboard for request throughput, latency, and error rates
- **Celery Flower** for real-time task monitoring

---

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines on code style, PR process, and testing requirements.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.
