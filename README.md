# ConvertPro

ConvertPro is a production-oriented MVP for secure document conversion. It uses a Next.js frontend, FastAPI REST API, Celery workers, Redis queue/cache, PostgreSQL, and local file storage that can later be swapped for S3.

## MVP Features

- PDF to DOCX
- PDF to Excel
- PDF to JPG/PNG
- JPG/PNG to PDF
- Merge PDF
- Split PDF
- Basic email/password auth
- Conversion history
- Signed downloads
- Automatic file deletion after 1 hour
- Responsive SaaS UI with Home, Tools, Convert, Pricing, Login/Register, Dashboard, and Admin pages

Extended conversion hooks are included for Office to PDF, PDF compression, and OCR text extraction. Business features such as Stripe billing, team workspaces, cloud storage, API keys, and Thai language support are documented as next steps.

## Architecture

```text
frontend/   Next.js + TypeScript + Tailwind + Shadcn-style UI + Framer Motion + React Dropzone
backend/    FastAPI API, SQLAlchemy models, auth, validation, storage, Celery tasks
database/   SQL schema and seed plan data
storage/    Runtime-only local upload/output files, ignored by git
```

Conversion flow:

```text
Upload -> Validate -> Store with UUID -> Create conversion -> Queue job -> Worker converts
-> Save output -> Update DB -> Signed download -> Cleanup after expiry
```

## Requirements

- Docker and Docker Compose
- For local non-Docker backend runs: Python 3.12, Redis, PostgreSQL, Ghostscript, LibreOffice, Tesseract, Poppler
- For local non-Docker frontend runs: Node.js 22+

## Quick Start

1. Create an environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set a strong `SECRET_KEY`.

3. Start the stack:

```bash
docker compose up --build
```

4. Open:

```text
Frontend: http://localhost:3000
API docs: http://localhost:8000/docs
Health:   http://localhost:8000/api/health
```

## API Endpoints

- `POST /api/upload`
- `POST /api/convert`
- `GET /api/status/{job_id}`
- `GET /api/download/{file_id}?token=...`
- `GET /api/history`
- `DELETE /api/file/{file_id}`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/admin/stats`

## Security Model

- File extension and signature validation
- Plan-based file-size limits
- UUID storage names
- No direct filesystem paths exposed
- HMAC signed download URLs
- Automatic expiry and cleanup through Celery beat
- Redis-backed IP rate limiting
- Password hashing with bcrypt
- JWT bearer auth
- Google ID token login when `GOOGLE_CLIENT_ID` is configured
- CORS restricted by `FRONTEND_ORIGIN`
- Basic security headers
- Path traversal protection in storage resolution

## Plans

| Plan | Limit | Daily conversions | OCR | Batch | Price |
| --- | ---: | ---: | --- | --- | ---: |
| Free | 10 MB | 5 | No | No | $0 |
| Pro | 100 MB | Unlimited | Yes | No | $12 |
| Business | 500 MB | Unlimited | Yes | Yes | $39 |

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Local backend without Docker, PostgreSQL, or Redis:

```bash
cd backend
set DATABASE_URL=sqlite:///./convertpro_dev.db
set STORAGE_DIR=./storage
set QUEUE_MODE=inline
set FRONTEND_ORIGIN=http://127.0.0.1:3000,http://localhost:3000
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Worker:

```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=INFO
celery -A app.tasks.celery_app beat --loglevel=INFO
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Production Notes

- Replace local `StorageService` with an S3 implementation behind the same service methods.
- Move JWT secret, database credentials, and admin emails into a secret manager.
- Add malware scanning with ClamAV or a managed scanning service before queueing jobs.
- Configure Google OAuth credentials and add a password reset provider.
- Add Stripe checkout and webhook handling for plan upgrades.
- Add API keys and request signing for Business API access.
- Add observability: structured logs, metrics, tracing, queue depth alerts.
- Run workers in isolated containers with CPU/memory limits because conversion engines process untrusted files.
