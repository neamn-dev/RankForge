from app.schemas import TemplateDocument


def _doc(**overrides):
    return TemplateDocument(**overrides)


def test_create_and_list_template(client):
    resp = client.post("/api/templates", json=_doc(name="Sports Top 10").model_dump(by_alias=True))
    assert resp.status_code == 201
    tid = resp.json()["id"]

    listing = client.get("/api/templates").json()
    assert any(t["id"] == tid and t["name"] == "Sports Top 10" for t in listing)


def test_update_and_reload_template(client):
    tid = client.post("/api/templates", json=_doc().model_dump(by_alias=True)).json()["id"]
    doc = _doc(name="Cats")
    doc.header.title = "TOP 5 CATS"
    doc.ranking.count = 5
    doc.ranking.per_rank_colors = {"1": "#ff0000"}

    resp = client.put(f"/api/templates/{tid}", json=doc.model_dump(by_alias=True))
    assert resp.status_code == 200

    reloaded = client.get(f"/api/templates/{tid}").json()["document"]
    assert reloaded["header"]["title"] == "TOP 5 CATS"
    assert reloaded["ranking"]["count"] == 5
    assert reloaded["ranking"]["per_rank_colors"]["1"] == "#ff0000"


def test_per_rank_override_does_not_change_default(client):
    """Editing one rank's color must not touch the shared default."""
    doc = _doc()
    doc.ranking.per_rank_colors = {"3": "#00ff00"}
    validated = TemplateDocument.model_validate(doc)
    assert validated.ranking.default_color == "#ffffff"
    assert validated.ranking.per_rank_colors == {"3": "#00ff00"}


def test_duplicate_rename_reset_delete(client):
    tid = client.post("/api/templates", json=_doc(name="Original").model_dump(by_alias=True)).json()["id"]
    dup = client.post(f"/api/templates/{tid}/duplicate")
    assert dup.status_code == 201
    dup_id = dup.json()["id"]

    resp = client.patch(f"/api/templates/{dup_id}/rename", json={"name": "Renamed"})
    assert resp.status_code == 200

    doc = client.get(f"/api/templates/{dup_id}").json()["document"]
    assert doc["name"] == "Renamed"
    doc["header"]["title"] = "MUTATED"
    client.put(f"/api/templates/{dup_id}", json=doc)

    client.post(f"/api/templates/{dup_id}/reset")
    reset_doc = client.get(f"/api/templates/{dup_id}").json()["document"]
    assert reset_doc["header"]["title"] == "TOP 10"  # factory default

    resp = client.delete(f"/api/templates/{dup_id}")
    assert resp.status_code == 204
    assert client.get(f"/api/templates/{dup_id}").status_code == 404


def test_validation_rejects_bad_values(client):
    doc = _doc().model_dump(by_alias=True)
    doc["ranking"]["count"] = 1000  # exceeds max
    resp = client.post("/api/templates", json=doc)
    assert resp.status_code == 422


def test_default_template_flow(client):
    tid = client.post("/api/templates", json=_doc().model_dump(by_alias=True)).json()["id"]
    client.post(f"/api/templates/{tid}/default")
    listing = client.get("/api/templates").json()
    defaults = [t for t in listing if t["isDefault"]]
    assert len(defaults) == 1 and defaults[0]["id"] == tid
