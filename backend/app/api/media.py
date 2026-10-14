"""Media upload and retrieval endpoints."""
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..config import get_settings
from ..schemas.project import Asset
from ..services import media_service as svc

router = APIRouter(prefix="/api/media", tags=["media"])
settings = get_settings()


@router.post("/upload", response_model=Asset, status_code=201)
async def upload_media(file: UploadFile = File(...)):
    """Uploads a video, audio, or image file and extracts FFprobe metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    asset = svc.save_upload(contents, file.filename)
    return asset


@router.get("/file/{storage_key}")
async def get_media_file(storage_key: str):
    """Serves the raw media file for video playback, scrubbing, and audio preview."""
    # Prevent path traversal
    safe_name = Path(storage_key).name
    file_path = settings.media_storage_dir / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")

    return FileResponse(file_path)


@router.get("/thumbnail/{asset_id}")
async def get_thumbnail(asset_id: str):
    """Serves generated video thumbnail."""
    safe_id = Path(asset_id).name
    thumb_path = settings.media_storage_dir / f"{safe_id}_thumb.jpg"
    if not thumb_path.is_file():
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(thumb_path, media_type="image/jpeg")
