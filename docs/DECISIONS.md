# Architectural Decision Records

## ADR-001: JSON-document persistence with Pydantic validation
**Status:** accepted. Editing state is a tree, not a relational graph. Storing
validated JSON documents keeps the DB trivially migratable and guarantees the
API contract and storage format are the same model. Revisit only if we need
cross-project asset queries at scale.

## ADR-002: Integer tick timeline
**Status:** accepted. `ticksPerSecond = fps * 100`. Prevents drift between
browser preview and FFmpeg render (which works in exact frame indices).

## ADR-003: FFmpeg as sole render authority
**Status:** accepted. No client-side WebCodecs rendering in v1. Browser preview
is an approximation built from the same document; a consistency test suite
(Phase 5) guards divergence.

## ADR-004: No queue/Redis in MVP
**Status:** accepted. In-process background rendering task first; introduce
Redis + RQ when concurrent render jobs or multi-user usage appear.

## Licenses
FastAPI (MIT), SQLAlchemy (MIT), Pydantic (MIT), React (MIT), Vite (MIT),
Tailwind (MIT), FFmpeg (LGPL/GPL — dynamic linking/distribution obligations
apply when *shipping* binaries, not for local dev use; verify before
commercial deployment).
