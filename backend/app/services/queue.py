from threading import Thread
from uuid import uuid4

from app.core.config import get_settings
from app.services.job_runner import run_conversion_job


def enqueue_conversion(conversion_id: str) -> str:
    if get_settings().queue_mode == "inline":
        job_id = uuid4().hex
        Thread(target=run_conversion_job, args=(conversion_id,), daemon=True).start()
        return job_id

    from app.tasks import convert_file_task

    task = convert_file_task.delay(conversion_id)
    return task.id
