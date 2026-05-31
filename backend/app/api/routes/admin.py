from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import Conversion, User
from app.schemas import AdminStats
from app.services.storage import StorageService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> AdminStats:
    settings = get_settings()
    if current_user.email.lower() not in settings.admin_email_set:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    today = datetime.now(timezone.utc).date()
    total_users = db.query(func.count(User.id)).scalar() or 0
    conversions_today = (
        db.query(func.count(Conversion.id)).filter(func.date(Conversion.created_at) == today).scalar() or 0
    )
    failed_today = (
        db.query(func.count(Conversion.id))
        .filter(func.date(Conversion.created_at) == today, Conversion.status == "failed")
        .scalar()
        or 0
    )
    recent_failures = (
        db.query(Conversion)
        .filter(Conversion.status == "failed")
        .order_by(Conversion.created_at.desc())
        .limit(10)
        .all()
    )

    return AdminStats(
        total_users=total_users,
        conversions_today=conversions_today,
        failed_today=failed_today,
        storage_bytes=StorageService().storage_size(),
        queue_status="redis-configured",
        recent_failures=recent_failures,
    )
