FROM node:22-bookworm-slim AS deps
WORKDIR /app/frontend
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=10000 \
    BACKEND_PORT=8000 \
    API_PROXY_TARGET=http://127.0.0.1:8000 \
    DATABASE_URL=sqlite:////app/data/convertpro.db \
    QUEUE_MODE=inline \
    STORAGE_DIR=/app/storage \
    PUBLIC_BASE_URL="" \
    FRONTEND_ORIGIN=https://convertpro-e505.onrender.com

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      default-jre-headless \
      ghostscript \
      libreoffice \
      poppler-utils \
      python3 \
      python3-pip \
      python3-venv \
      tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r ./backend/requirements.txt
COPY backend/app ./backend/app
COPY start-render.sh ./start-render.sh
RUN chmod +x ./start-render.sh \
    && mkdir -p /app/data /app/storage/uploads /app/storage/outputs

WORKDIR /app/frontend
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/next.config.mjs ./next.config.mjs

EXPOSE 10000
CMD ["/app/start-render.sh"]
