from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import Plan


DEFAULT_PLANS = [
    Plan(name="free", max_file_size=10 * 1024 * 1024, daily_limit=5, price=0, ocr_enabled=False, batch_enabled=False),
    Plan(name="pro", max_file_size=100 * 1024 * 1024, daily_limit=None, price=12, ocr_enabled=True, batch_enabled=False),
    Plan(name="business", max_file_size=500 * 1024 * 1024, daily_limit=None, price=39, ocr_enabled=True, batch_enabled=True),
]


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for plan in DEFAULT_PLANS:
            exists = db.query(Plan).filter(Plan.name == plan.name).first()
            if not exists:
                db.add(plan)
        db.commit()
    finally:
        db.close()
