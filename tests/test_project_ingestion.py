import io
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.api import projects
from backend.app.config import settings
from backend.app.main import app


def archive(files: dict[str, str]) -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as result:
        for name, content in files.items():
            result.writestr(name, content)
    return stream.getvalue()


def client_for(monkeypatch, tmp_path: Path) -> TestClient:
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    return TestClient(app)


def test_upload_listing_retrieval_and_source_integrity(monkeypatch, tmp_path):
    client = client_for(monkeypatch, tmp_path)
    content = archive({"legacy/src/app.js": "module.exports = 1;", "legacy/package.json": "{}"})
    response = client.post(
        "/api/projects/upload",
        files={"file": ("legacy-ecommerce.zip", content, "application/zip")},
    )
    assert response.status_code == 201
    project = response.json()
    assert project["name"] == "legacy-ecommerce"
    assert "source_path" not in project

    listed = client.get("/api/projects").json()
    assert listed[0]["project_id"] == project["project_id"]
    retrieved = client.get(f"/api/projects/{project['project_id']}")
    assert retrieved.status_code == 200
    source = settings.PROJECTS_DIR / project["project_id"] / "source"
    assert (source / "legacy/src/app.js").read_text(encoding="utf-8") == "module.exports = 1;"


def test_upload_rejects_invalid_and_empty_archives(monkeypatch, tmp_path):
    client = client_for(monkeypatch, tmp_path)
    invalid = client.post("/api/projects/upload", files={"file": ("bad.zip", b"not zip")})
    assert invalid.status_code == 422
    empty = io.BytesIO()
    with zipfile.ZipFile(empty, "w"):
        pass
    response = client.post("/api/projects/upload", files={"file": ("empty.zip", empty.getvalue())})
    assert response.status_code == 422


def test_upload_rejects_path_traversal(monkeypatch, tmp_path):
    client = client_for(monkeypatch, tmp_path)
    content = archive({"../escape.js": "unsafe"})
    response = client.post("/api/projects/upload", files={"file": ("unsafe.zip", content)})
    assert response.status_code == 422
    assert not list((settings.PROJECTS_DIR).glob("*/source/escape.js"))


def test_ingested_project_can_be_analyzed(monkeypatch, tmp_path):
    client = client_for(monkeypatch, tmp_path)
    content = archive({"app.js": "function hello() { return true; }"})
    created = client.post("/api/projects/upload", files={"file": ("app.zip", content)}).json()
    project_id = created["project_id"]
    analysis = client.post(f"/api/projects/{project_id}/analyze")
    assert analysis.status_code == 202
    status_response = client.get(f"/api/projects/{project_id}/analysis")
    assert status_response.json()["status"] == "COMPLETED"


def test_analysis_missing_project_is_not_found(monkeypatch, tmp_path):
    client = client_for(monkeypatch, tmp_path)
    response = client.post("/api/projects/missing/analyze")
    assert response.status_code == 404
