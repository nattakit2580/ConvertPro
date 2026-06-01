from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_download_token, get_current_user, get_optional_user, verify_download_token
from app.core.time import as_utc_aware, utc_now
from app.db.session import get_db
from app.models import Conversion, Plan, User
from app.schemas import BatchDownloadRequest, ConversionStatus, ConvertRequest, ConvertResponse, HistoryItem, UploadResponse
from app.services.queue import enqueue_conversion
from app.services.storage import StorageService
from app.services.validators import TOOL_CONFIG, UploadValidationError, validate_stored_file

router = APIRouter(tags=["conversions"])


def _plan_for(db: Session, user: User | None) -> Plan:
    plan_name = user.plan if user else "free"
    plan = db.query(Plan).filter(Plan.name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=500, detail="Plan configuration missing")
    return plan


def _ensure_daily_limit(db: Session, user: User | None, plan: Plan) -> None:
    if user is None or plan.daily_limit is None:
        return
    today = datetime.now(timezone.utc).date()
    used = (
        db.query(func.count(Conversion.id))
        .filter(
            Conversion.user_id == user.id,
            func.date(Conversion.created_at) == today,
            Conversion.status.in_(["queued", "processing", "completed", "failed"]),
        )
        .scalar()
        or 0
    )
    if used >= plan.daily_limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Daily conversion limit reached")


def _authorize_conversion(conversion: Conversion, user: User | None) -> None:
    if conversion.user_id and (user is None or conversion.user_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")


def _download_url(conversion: Conversion) -> str | None:
    if conversion.status != "completed" or not conversion.output_storage_key:
        return None
    settings = get_settings()
    token = create_download_token(conversion.id, as_utc_aware(conversion.expired_at))
    return f"{settings.public_base_url}{settings.api_prefix}/download/{conversion.id}?token={token}"


@router.post("/upload", response_model=UploadResponse)
async def upload(
    files: Annotated[list[UploadFile], File(...)],
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> UploadResponse:
    settings = get_settings()
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")
    if len(files) > settings.max_upload_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many files")

    plan = _plan_for(db, current_user)
    storage = StorageService()
    stored_files = []
    total_size = 0

    try:
        for upload_file in files:
            stored = await storage.save_upload(upload_file, max_bytes=plan.max_file_size)
            stored_files.append(stored)
            validate_stored_file(stored)
            total_size += stored.size
            if total_size > plan.max_file_size:
                raise UploadValidationError(f"Total file size exceeds {plan.max_file_size} bytes")
    except (UploadValidationError, ValueError) as exc:
        for stored in stored_files:
            storage.delete_key(stored.storage_key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    input_format = stored_files[0].suffix.lstrip(".").lower()
    filename = stored_files[0].original_filename if len(stored_files) == 1 else f"{len(stored_files)} files"
    conversion = Conversion(
        user_id=current_user.id if current_user else None,
        original_filename=filename,
        input_format=input_format,
        file_size=total_size,
        source_files=[stored.model_dump() for stored in stored_files],
        status="uploaded",
        progress=0,
        expired_at=utc_now() + timedelta(minutes=settings.cleanup_grace_minutes),
    )
    db.add(conversion)
    db.commit()
    db.refresh(conversion)

    return UploadResponse(
        file_id=conversion.id,
        status=conversion.status,
        original_filename=conversion.original_filename,
        file_size=conversion.file_size,
        expires_at=conversion.expired_at,
    )


@router.post("/convert", response_model=ConvertResponse)
def convert(
    payload: ConvertRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ConvertResponse:
    conversion = db.get(Conversion, payload.file_id)
    if not conversion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    _authorize_conversion(conversion, current_user)

    if as_utc_aware(conversion.expired_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="File expired")
    if conversion.status not in {"uploaded", "failed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="File is already being processed")
    if payload.tool not in TOOL_CONFIG:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported conversion tool")

    plan = _plan_for(db, current_user)
    _ensure_daily_limit(db, current_user, plan)

    tool_config = TOOL_CONFIG[payload.tool]
    if len(conversion.source_files) < tool_config["min_files"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This tool requires more files")
    if len(conversion.source_files) > tool_config["max_files"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This tool accepts fewer files")
    if any(item.get("suffix") not in tool_config["inputs"] for item in conversion.source_files):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Input file type is not valid for this tool")

    output_format = payload.output_format or tool_config["default_output"]
    if output_format not in tool_config["outputs"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported output format")

    conversion.tool = payload.tool
    conversion.output_format = output_format
    conversion.status = "queued"
    conversion.progress = 5
    conversion.error_message = None
    db.commit()

    job_id = enqueue_conversion(conversion.id)
    conversion.job_id = job_id
    db.commit()

    return ConvertResponse(job_id=job_id, file_id=conversion.id, status=conversion.status)


@router.get("/status/{job_id}", response_model=ConversionStatus)
def status_by_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ConversionStatus:
    conversion = db.query(Conversion).filter((Conversion.job_id == job_id) | (Conversion.id == job_id)).first()
    if not conversion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    _authorize_conversion(conversion, current_user)
    conversion.download_url = _download_url(conversion)
    db.commit()
    return ConversionStatus(
        file_id=conversion.id,
        job_id=conversion.job_id,
        status=conversion.status,
        progress=conversion.progress,
        output_format=conversion.output_format,
        download_url=conversion.download_url,
        error_message=conversion.error_message,
        expires_at=conversion.expired_at,
    )


@router.get("/download/{file_id}")
def download(
    file_id: str,
    token: Annotated[str, Query(min_length=16)],
    db: Session = Depends(get_db),
):
    verify_download_token(token, file_id)
    conversion = db.get(Conversion, file_id)
    if not conversion or conversion.status != "completed" or not conversion.output_storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if as_utc_aware(conversion.expired_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="File expired")

    path = StorageService().path_for(conversion.output_storage_key)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File already deleted")
    return FileResponse(
        path=path,
        filename=conversion.output_filename or Path(path).name,
        media_type="application/octet-stream",
    )


@router.post("/download/batch")
def download_batch(
    payload: BatchDownloadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    storage = StorageService()
    output_paths: list[tuple[Path, str]] = []

    for item in payload.items:
        verify_download_token(item.token, item.file_id)
        conversion = db.get(Conversion, item.file_id)
        if not conversion or conversion.status != "completed" or not conversion.output_storage_key:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more files were not found")
        if as_utc_aware(conversion.expired_at) <= utc_now():
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="One or more files expired")

        path = storage.path_for(conversion.output_storage_key)
        if not path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more files were already deleted")
        output_paths.append((path, Path(conversion.output_filename or path.name).name))

    if not output_paths:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No downloadable files selected")

    archive = NamedTemporaryFile(delete=False, suffix=".zip", prefix="convertpro-selected-", dir=storage.root)
    archive_path = Path(archive.name)
    archive.close()

    seen: dict[str, int] = {}
    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as zip_file:
        for index, (path, filename) in enumerate(output_paths, start=1):
            safe_name = Path(filename).name
            count = seen.get(safe_name, 0)
            seen[safe_name] = count + 1
            if count:
                stem = Path(safe_name).stem
                suffix = Path(safe_name).suffix
                safe_name = f"{stem}-{count + 1}{suffix}"
            zip_file.write(path, arcname=f"{index:02d}-{safe_name}")

    background_tasks.add_task(archive_path.unlink, missing_ok=True)
    return FileResponse(path=archive_path, filename="convertpro-selected-files.zip", media_type="application/zip")


@router.get("/history", response_model=list[HistoryItem])
def history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HistoryItem]:
    rows = (
        db.query(Conversion)
        .filter(Conversion.user_id == current_user.id, Conversion.deleted_at.is_(None))
        .order_by(Conversion.created_at.desc())
        .limit(50)
        .all()
    )
    for row in rows:
        row.download_url = _download_url(row)
    db.commit()
    return rows


@router.delete("/file/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    conversion = db.get(Conversion, file_id)
    if not conversion or conversion.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    StorageService().delete_conversion_files(conversion)
    conversion.status = "deleted"
    conversion.deleted_at = utc_now()
    db.commit()
