from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UploadResponse(BaseModel):
    file_id: str
    status: str
    original_filename: str
    file_size: int
    expires_at: datetime


class ConvertRequest(BaseModel):
    file_id: str
    tool: str
    output_format: str | None = None
    options: dict[str, Any] = Field(default_factory=dict)


class ConvertResponse(BaseModel):
    job_id: str
    file_id: str
    status: str


class BatchDownloadItem(BaseModel):
    file_id: str
    token: str = Field(min_length=16)


class BatchDownloadRequest(BaseModel):
    items: list[BatchDownloadItem] = Field(min_length=1, max_length=50)


class ConversionStatus(BaseModel):
    file_id: str
    job_id: str | None
    status: str
    progress: int
    output_format: str | None
    download_url: str | None = None
    error_message: str | None = None
    expires_at: datetime


class HistoryItem(BaseModel):
    id: str
    original_filename: str
    input_format: str
    output_format: str | None
    tool: str | None
    file_size: int
    status: str
    progress: int
    download_url: str | None
    error_message: str | None
    created_at: datetime
    expired_at: datetime

    model_config = {"from_attributes": True}


class AdminStats(BaseModel):
    total_users: int
    conversions_today: int
    failed_today: int
    storage_bytes: int
    queue_status: str
    recent_failures: list[HistoryItem]
