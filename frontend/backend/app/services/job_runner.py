from app.core.time import utc_now
from app.db.session import SessionLocal
from app.models import Conversion
from app.services.converter import convert_file
from app.services.storage import StorageService


def run_conversion_job(conversion_id: str) -> str:
    db = SessionLocal()
    storage = StorageService()
    try:
        conversion = db.get(Conversion, conversion_id)
        if not conversion:
            return "missing"

        conversion.status = "processing"
        conversion.progress = 20
        db.commit()

        input_paths = [storage.path_for(item["storage_key"]) for item in conversion.source_files]
        output_dir, _ = storage.output_path(conversion.id, ".keep")
        output_dir = output_dir.parent

        conversion.progress = 45
        db.commit()

        output_path, output_filename = convert_file(
            conversion.tool or "",
            input_paths,
            output_dir,
            conversion.output_format or "",
        )
        output_storage_key = output_path.relative_to(storage.root).as_posix()

        conversion.status = "completed"
        conversion.progress = 100
        conversion.output_storage_key = output_storage_key
        conversion.output_filename = output_filename
        conversion.error_message = None
        db.commit()
        return "completed"
    except Exception as exc:
        conversion = db.get(Conversion, conversion_id)
        if conversion:
            conversion.status = "failed"
            conversion.progress = 100
            conversion.error_message = str(exc)[:1000]
            db.commit()
        raise
    finally:
        db.close()


def cleanup_expired_conversion_files() -> int:
    db = SessionLocal()
    storage = StorageService()
    deleted = 0
    try:
        expired = (
            db.query(Conversion)
            .filter(Conversion.expired_at <= utc_now(), Conversion.deleted_at.is_(None))
            .limit(100)
            .all()
        )
        for conversion in expired:
            storage.delete_conversion_files(conversion)
            conversion.status = "deleted"
            conversion.deleted_at = utc_now()
            deleted += 1
        db.commit()
        return deleted
    finally:
        db.close()
