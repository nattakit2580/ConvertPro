import os
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from fastapi import UploadFile
from pydantic import BaseModel

from app.core.config import get_settings


class StoredFile(BaseModel):
    storage_key: str
    original_filename: str
    content_type: str | None
    size: int
    suffix: str


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.root = self.settings.storage_dir.resolve()
        (self.root / "uploads").mkdir(parents=True, exist_ok=True)
        (self.root / "outputs").mkdir(parents=True, exist_ok=True)

    async def save_upload(self, upload_file: UploadFile, max_bytes: int) -> StoredFile:
        suffix = Path(upload_file.filename or "file").suffix.lower()
        filename = f"{uuid4().hex}{suffix}"
        relative = Path("uploads") / filename
        destination = self.path_for(relative.as_posix(), must_exist=False)

        size = 0
        with destination.open("wb") as buffer:
            while chunk := await upload_file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    buffer.close()
                    destination.unlink(missing_ok=True)
                    raise ValueError(f"File exceeds {max_bytes} bytes")
                buffer.write(chunk)

        return StoredFile(
            storage_key=relative.as_posix(),
            original_filename=Path(upload_file.filename or filename).name,
            content_type=upload_file.content_type,
            size=size,
            suffix=suffix,
        )

    def output_path(self, conversion_id: str, filename: str) -> tuple[Path, str]:
        relative = Path("outputs") / conversion_id / filename
        path = self.path_for(relative.as_posix(), must_exist=False)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path, relative.as_posix()

    def path_for(self, storage_key: str, must_exist: bool = True) -> Path:
        candidate = (self.root / storage_key).resolve()
        if os.path.commonpath([str(self.root), str(candidate)]) != str(self.root):
            raise ValueError("Invalid storage key")
        if must_exist and not candidate.exists():
            raise FileNotFoundError(storage_key)
        candidate.parent.mkdir(parents=True, exist_ok=True)
        return candidate

    def delete_key(self, storage_key: str | None) -> None:
        if not storage_key:
            return
        try:
            path = self.path_for(storage_key)
        except FileNotFoundError:
            return
        if path.is_file():
            path.unlink(missing_ok=True)

    def delete_keys(self, storage_keys: Iterable[str]) -> None:
        for key in storage_keys:
            self.delete_key(key)

    def delete_conversion_files(self, conversion) -> None:
        self.delete_keys(item.get("storage_key") for item in conversion.source_files or [])
        self.delete_key(conversion.output_storage_key)

    def storage_size(self) -> int:
        total = 0
        if not self.root.exists():
            return total
        for path in self.root.rglob("*"):
            if path.is_file():
                total += path.stat().st_size
        return total
