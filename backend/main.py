"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1.auth import router as auth_router
from app.api.v1.data import router as data_router
from app.api.v1.training import router as training_router
from app.api.v1.models_router import router as models_router
from app.api.v1.inference import router as inference_router
from app.api.v1.explain import router as explain_router
from app.api.v1.deploy import router as deploy_router
from app.api.v1.subscription import router as subscription_router
from app.api.v1.community import router as community_router
from app.api.v1.discussions import router as discussions_router
from app.api.v1.social import router as social_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.notebooks import router as notebooks_router
from app.api.v1.competitions import router as competitions_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notifications import router as notifications_router

log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — connect to MongoDB on startup."""
    log.info("startup", environment=settings.ENVIRONMENT)
    try:
        await init_db()
        log.info("database.connected")
    except Exception as exc:
        log.warning(
            "database.unavailable",
            error=str(exc),
            hint=f"Start MongoDB on {settings.MONGODB_URL} for DB-dependent endpoints to work.",
        )
    yield
    await close_db()
    log.info("shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="NexusML — train, explain, and deploy ML models without writing a single line of code.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus Metrics ─────────────────────────────────────────────────────────

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ── Routers ────────────────────────────────────────────────────────────────────

prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=prefix)
app.include_router(data_router, prefix=prefix)
app.include_router(training_router, prefix=prefix)
app.include_router(models_router, prefix=prefix)
app.include_router(inference_router, prefix=prefix)
app.include_router(explain_router, prefix=prefix)
app.include_router(deploy_router, prefix=prefix)
app.include_router(subscription_router, prefix=prefix)
app.include_router(community_router, prefix=prefix)
app.include_router(discussions_router, prefix=prefix)
app.include_router(social_router, prefix=prefix)
app.include_router(profiles_router, prefix=prefix)
app.include_router(notebooks_router, prefix=prefix)
app.include_router(competitions_router, prefix=prefix)
app.include_router(organizations_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(notifications_router, prefix=prefix)

# ── Global Exception Handler ───────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "code": "INTERNAL_ERROR", "details": {}},
    )


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
