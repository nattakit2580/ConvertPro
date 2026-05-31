from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ConvertPro"
    environment: str = "development"
    api_prefix: str = "/api"
    secret_key: str = Field(default="change-me", min_length=8)
    access_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "postgresql+psycopg://convertpro:convertpro@postgres:5432/convertpro"
    redis_url: str = "redis://redis:6379/0"
    queue_mode: str = "celery"
    storage_dir: Path = Path("/app/storage")
    public_base_url: str = "http://localhost:8000"
    frontend_origin: str = "http://localhost:3000"
    signed_url_ttl_seconds: int = 60 * 60
    cleanup_grace_minutes: int = 60
    max_upload_files: int = 20
    rate_limit_per_minute: int = 60
    admin_emails: str = ""
    google_client_id: str = ""

    @property
    def admin_email_set(self) -> set[str]:
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
