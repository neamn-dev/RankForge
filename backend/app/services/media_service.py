"""Media processing service: FFprobe metadata extraction, thumbnailing, and storage."""
import json
import logging
import os
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Optional

from ..config import get_settings
from ..schemas.project import Asset

logger = logging.getLogger(__name__)
settings = get_settings()

TICKS_PER_SECOND = 3000

# Known paths for ffmpeg / ffprobe on Windows or other OS
COMMON_FFMPEG_DIRS = [
    Path(r"C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin"),
    Path(r"C:\ffmpeg\bin"),
    Path(r"C:\Program Files\ffmpeg\bin"),
]


def find_binary(name: str) -> Optional[str]:
    """Finds an executable in PATH or common install directories."""
    found = shutil.which(name)
    if found:
        return found
    exe_name = f"{name}.exe" if os.name == "nt" else name
    for d in COMMON_FFMPEG_DIRS:
        cand = d / exe_name
        if cand.is_file():
            return str(cand)
    return None


FFPROBE_BIN = find_binary("ffprobe")
FFMPEG_BIN = find_binary("ffmpeg")


def sanitize_filename(filename: str) -> str:
    """Removes special/path traversal characters from filename."""
    base = Path(filename).name
    # Keep alphanumeric, dots, dashes, underscores
    sanitized = re.sub(r"[^\w\-.]", "_", base)
    return sanitized or "media_file"


def probe_media_file(file_path: Path) -> dict:
    """Uses ffprobe to extract stream information, dimensions, duration, and audio."""
    info = {
        "kind": "video",
        "duration_seconds": 0.0,
        "width": None,
        "height": None,
        "fps": None,
        "has_audio": False,
    }

    ext = file_path.suffix.lower()
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        info["kind"] = "image"
        # If it's an image and ffprobe is available, get dimensions
    elif ext in [".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac"]:
        info["kind"] = "audio"

    if not FFPROBE_BIN:
        logger.warning("ffprobe not found on system; using file extension heuristics.")
        return info

    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=duration,size:stream=index,codec_type,width,height,r_frame_rate,duration",
        "-of", "json",
        str(file_path),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if proc.returncode == 0 and proc.stdout:
            data = json.loads(proc.stdout)
            streams = data.get("streams", [])
            fmt = data.get("format", {})

            # Parse duration from format or stream
            fmt_duration = fmt.get("duration")
            if fmt_duration:
                try:
                    info["duration_seconds"] = float(fmt_duration)
                except ValueError:
                    pass

            has_video = False
            has_audio = False

            for s in streams:
                codec_type = s.get("codec_type")
                if codec_type == "video":
                    has_video = True
                    info["width"] = s.get("width")
                    info["height"] = s.get("height")
                    # Parse FPS
                    r_fps = s.get("r_frame_rate", "")
                    if "/" in r_fps:
                        num, den = r_fps.split("/")
                        if den and den != "0":
                            info["fps"] = round(float(num) / float(den), 2)
                    elif r_fps:
                        try:
                            info["fps"] = round(float(r_fps), 2)
                        except ValueError:
                            pass
                    # If stream has duration and format did not
                    if not info["duration_seconds"] and s.get("duration"):
                        try:
                            info["duration_seconds"] = float(s.get("duration"))
                        except ValueError:
                            pass
                elif codec_type == "audio":
                    has_audio = True

            info["has_audio"] = has_audio

            if has_video:
                info["kind"] = "video"
            elif has_audio and not has_video:
                info["kind"] = "audio"
            elif ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
                info["kind"] = "image"

    except Exception as e:
        logger.error(f"Error executing ffprobe: {e}")

    return info


def extract_thumbnail(video_path: Path, output_thumb_path: Path, timestamp: float = 0.5) -> bool:
    """Extracts a thumbnail jpeg from the video at the given timestamp."""
    if not FFMPEG_BIN:
        return False

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-ss", str(timestamp),
        "-i", str(video_path),
        "-vframes", "1",
        "-vf", "scale=360:-1",
        str(output_thumb_path),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=8)
        return proc.returncode == 0 and output_thumb_path.is_file()
    except Exception as e:
        logger.warning(f"Could not generate thumbnail with ffmpeg: {e}")
        return False


def save_upload(file_bytes: bytes, original_filename: str) -> Asset:
    """Persists uploaded file, extracts metadata, creates thumbnail, and returns Asset."""
    settings.media_storage_dir.mkdir(parents=True, exist_ok=True)
    asset_id = str(uuid.uuid4())
    safe_name = sanitize_filename(original_filename)
    stored_name = f"{asset_id}_{safe_name}"
    file_path = settings.media_storage_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    size_bytes = len(file_bytes)
    meta = probe_media_file(file_path)

    duration_ticks = int(meta["duration_seconds"] * TICKS_PER_SECOND)

    # If it is a video, attempt thumbnail generation
    thumb_name = f"{asset_id}_thumb.jpg"
    thumb_path = settings.media_storage_dir / thumb_name
    if meta["kind"] == "video":
        extract_thumbnail(file_path, thumb_path, timestamp=min(1.0, meta["duration_seconds"] / 2 if meta["duration_seconds"] > 0 else 0.0))

    return Asset(
        id=asset_id,
        kind=meta["kind"],
        original_name=original_filename,
        storage_key=stored_name,
        duration_ticks=duration_ticks,
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        size_bytes=size_bytes,
        has_audio=meta["has_audio"],
        status="ready",
    )
