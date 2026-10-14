from app.schemas import ProjectDocument


def test_project_crud_roundtrip(client):
    doc = ProjectDocument(name="Top 10 Cats")
    resp = client.post("/api/projects", json=doc.model_dump(by_alias=True))
    assert resp.status_code == 201
    pid = resp.json()["id"]

    loaded = client.get(f"/api/projects/{pid}").json()
    assert loaded["name"] == "Top 10 Cats"
    assert loaded["document"]["timeline"]["ticks_per_second"] == 3000


def test_project_duplicate(client):
    doc = ProjectDocument(name="Fails")
    pid = client.post("/api/projects", json=doc.model_dump(by_alias=True)).json()["id"]
    dup = client.post(f"/api/projects/{pid}/duplicate")
    assert dup.status_code == 201
    dup_doc = client.get(f"/api/projects/{dup.json()['id']}").json()
    assert dup_doc["name"] == "Fails (copy)"


def test_project_404(client):
    assert client.get("/api/projects/nope").status_code == 404


def test_create_project_from_template(client):
    from app.schemas import TemplateDocument
    # Create a template with 5 ranks
    tdoc = TemplateDocument(name="Test Top 5")
    tdoc.ranking.count = 5
    tid = client.post("/api/templates", json=tdoc.model_dump(by_alias=True)).json()["id"]

    resp = client.post(f"/api/projects/from-template/{tid}")
    assert resp.status_code == 201
    pid = resp.json()["id"]

    project = client.get(f"/api/projects/{pid}").json()
    assert project["name"] == "My Test Top 5 Video"
    assert project["templateId"] == tid
    tracks = project["document"]["tracks"]
    assert len(tracks) >= 2
    video_track = next(t for t in tracks if t["type"] == "video")
    assert len(video_track["clips"]) == 5
    assert video_track["clips"][0]["ranking"]["position"] == 5  # descending order

