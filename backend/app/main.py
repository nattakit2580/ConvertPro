from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.routes import admin, auth, conversions
from app.core.config import get_settings
from app.core.rate_limit import RedisRateLimitMiddleware
from app.db.init_db import init_db
from app.services.storage import StorageService

settings = get_settings()

app = FastAPI(title=f"{settings.app_name} API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RedisRateLimitMiddleware)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(conversions.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)


@app.on_event("startup")
def on_startup() -> None:
    StorageService()
    init_db()


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url=f"{settings.api_prefix}/docs")


@app.get(f"{settings.api_prefix}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
