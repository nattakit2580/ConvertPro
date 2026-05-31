from celery import Celery

from app.core.config import get_settings
from app.services.job_runner import cleanup_expired_conversion_files, run_conversion_job

settings = get_settings()
celery_app = Celery("convertpro", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_track_started=True,
    timezone="UTC",
    beat_schedule={
        "cleanup-expired-files": {
            "task": "convertpro.cleanup_expired_files",
            "schedule": 15 * 60,
        }
    },
)


@celery_app.task(name="convertpro.convert_file", bind=True)
def convert_file_task(self, conversion_id: str) -> str:
    return run_conversion_job(conversion_id)


@celery_app.task(name="convertpro.cleanup_expired_files")
def cleanup_expired_files() -> int:
    return cleanup_expired_conversion_files()
