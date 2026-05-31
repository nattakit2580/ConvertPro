import base64
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def _decode_token(token: str | None) -> str | None:
    if not token:
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> User | None:
    user_id = _decode_token(token)
    if not user_id:
        return None
    return db.get(User, user_id)


def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


def create_download_token(file_id: str, expires_at: datetime) -> str:
    settings = get_settings()
    expires_ts = int(expires_at.timestamp())
    payload = f"{file_id}:{expires_ts}"
    signature = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    raw = f"{payload}:{signature}".encode()
    return base64.urlsafe_b64encode(raw).decode()


def verify_download_token(token: str, expected_file_id: str) -> None:
    settings = get_settings()
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        file_id, expires_ts, signature = decoded.rsplit(":", 2)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid download token") from exc

    if file_id != expected_file_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid download token")

    payload = f"{file_id}:{expires_ts}"
    expected = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid download token")

    if datetime.now(timezone.utc).timestamp() > int(expires_ts):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Download link expired")
