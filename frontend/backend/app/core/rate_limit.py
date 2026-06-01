import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.settings = get_settings()
        self._redis = None

    async def _client(self):
        if self._redis is None:
            import redis.asyncio as redis

            self._redis = redis.from_url(self.settings.redis_url, encoding="utf-8", decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path.endswith("/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate:{client_ip}:{int(time.time()) // 60}"

        try:
            redis_client = await self._client()
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, 70)
            if count > self.settings.rate_limit_per_minute:
                return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        except Exception:
            pass

        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
