"""RankForge API — application entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import health, media, projects, templates
from .config import get_settings
from .database import init_db

settings = get_settings()

app = FastAPI(title="RankForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(templates.router)
app.include_router(projects.router)
app.include_router(media.router)



@app.on_event("startup")
def startup() -> None:
    settings.media_storage_dir.mkdir(parents=True, exist_ok=True)
    settings.render_storage_dir.mkdir(parents=True, exist_ok=True)
    init_db()
    from .database import SessionLocal
    from .services.starter_templates import seed_starter_templates
    with SessionLocal() as db:
        seed_starter_templates(db)

