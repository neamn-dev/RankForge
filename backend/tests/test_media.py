import io
from app.services.starter_templates import get_starter_templates


def test_starter_templates_count_and_keys():
    starters = get_starter_templates()
    assert len(starters) == 6
    names = [s.name for s in starters]
    assert "Classic Countdown" in names
    assert "Pool Fails" in names
    assert "Trampoline Moments" in names
    assert "Bruh Moments" in names
    assert "Unreal Cat Moments" in names
    assert "Sports Hype" in names


def test_media_upload_and_retrieve(client):
    fake_data = b"RIFF....WAVEfmt ...."
    files = {"file": ("test_audio.wav", io.BytesIO(fake_data), "audio/wav")}
    resp = client.post("/api/media/upload", files=files)
    assert resp.status_code == 201
    asset = resp.json()
    assert asset["id"]
    assert asset["original_name"] == "test_audio.wav"
    assert asset["status"] == "ready"

    # Retrieve file
    storage_key = asset["storage_key"]
    get_resp = client.get(f"/api/media/file/{storage_key}")
    assert get_resp.status_code == 200
    assert get_resp.content == fake_data


def test_media_upload_empty_file(client):
    files = {"file": ("empty.mp4", io.BytesIO(b""), "video/mp4")}
    resp = client.post("/api/media/upload", files=files)
    assert resp.status_code == 400
