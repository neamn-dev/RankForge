# Architecture

## Backend modules (`backend/app/`)

| Module | Responsibility |
|---|---|
| `config.py` | Settings via pydantic-settings, env-driven |
| `database.py` | SQLAlchemy engine/session, SQLite default |
| `models/` | ORM rows: thin wrappers storing versioned JSON documents |
| `schemas/` | Pydantic v2 validation = the shared editing model |
| `api/` | FastAPI routers: health, templates, projects |
| `services/` | Business logic (template service); media/render services land here |
| `migrations/` | Alembic |

Documents are validated **through Pydantic on every read/write**, so the DB
never silently holds a schema-violating project.

## Frontend modules (`frontend/src/`)

| Module | Responsibility |
|---|---|
| `types/` | TypeScript mirrors of the shared schemas (single editing model) |
| `api/` | Typed fetch client for the backend |
| `features/templates/` | Template library + Template Studio |
| `features/editor/` | Timeline, preview, inspector (Phase 4) |
| `features/dashboard/` | Project dashboard (Phase 1.5) |
| `components/` | Small reusable UI primitives |
| `hooks/`, `lib/` | Shared utilities |

## Key decisions

- **Document-first model:** SQLAlchemy rows store JSON blobs validated by the
  same Pydantic models the API exposes. Complex relational queries over editing
  state are unnecessary at this scale; consistency beats normalization here.
- **Tick time:** integer ticks eliminate float drift between preview and render.
- **FFmpeg as the only renderer:** browser preview approximates; renderer is
  authoritative. Shared semantics live in `docs/SCHEMAS.md`.
- **No Redis/queue yet:** rendering worker will start as an in-process
  background task; Redis+RQ only when concurrency demands it.
