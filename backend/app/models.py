import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.base import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    conversions: Mapped[list["Conversion"]] = relationship(back_populates="user")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    max_file_size: Mapped[int] = mapped_column(BigInteger)
    daily_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ocr_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    batch_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)


class Conversion(Base):
    __tablename__ = "conversions"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=new_uuid)
    user_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True)
    original_filename: Mapped[str] = mapped_column(Text)
    input_format: Mapped[str] = mapped_column(String(24))
    output_format: Mapped[str | None] = mapped_column(String(24), nullable=True)
    tool: Mapped[str | None] = mapped_column(String(64), nullable=True)
    file_size: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(24), default="uploaded", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    source_files: Mapped[list[dict]] = mapped_column(JSON)
    output_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    download_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    expired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User | None] = relationship(back_populates="conversions")
