# RankForge — Ranking Video Editor

A professional web-based video editor for ranking videos, countdowns, top-N
compilations and social-media content. Core principle:

**Create a template once → reuse it for many videos → generate a draft → edit → export MP4.**

## Stack

- **Frontend:** TypeScript, React, Vite, Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, SQLite (dev) / PostgreSQL (prod)
- **Video:** FFmpeg / FFprobe (local install required for media + rendering phases)

## Prerequisites

- Node.js 20+, npm
- Python 3.11+
- FFmpeg on PATH (`ffmpeg -version` must work)

## Quick start

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Health check: `curl http://localhost:8000/api/health` → `{"status":"ok",...}`
API docs: http://localhost:8000/docs

## Current status (Milestone 1 — Foundation + Template Studio)

Implemented:
- Full repository structure (frontend, backend, docs, tests)
- Shared, versioned **Project** and **Template** document schemas (tick-based time)
- FastAPI backend: health endpoint, template CRUD (create/save/duplicate/rename/
  delete/default/reset), project CRUD with document storage
- SQLite persistence via SQLAlchemy, Alembic migration scaffold
- Template Studio UI: header config, ranking-number config, labels, branding,
  live CSS-based preview, save/reload — surviving app restart

Planned (roadmap in `docs/ROADMAP.md`): media upload + FFprobe, automatic draft
generator, timeline editor, FFmpeg rendering/export, autosave, undo/redo.

## Docs

- `docs/ARCHITECTURE.md` — module boundaries and decisions
- `docs/SCHEMAS.md` — the shared editing model (read this first)
- `docs/ROADMAP.md` — phased development plan
- `docs/DECISIONS.md` — architectural decision records

## Licensing

All core dependencies are permissively licensed (MIT/BSD/Apache-2.0). Verify
licenses again before commercial deployment; see `docs/DECISIONS.md`.
