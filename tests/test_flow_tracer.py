from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.api import projects
from backend.app.config import settings
from backend.app.main import app


def test_static_flow_trace_resolves_function_and_calls(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "flow"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "app.js").write_text(
        "function createOrder() { return saveOrder(); }\n"
        "function saveOrder() { return true; }\n",
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    response = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace function createOrder"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trace_type"] == "static"
    assert body["steps"][0]["name"] == "createOrder"
    assert any(step["name"] == "saveOrder" for step in body["steps"])
    assert body["evidence"]


def test_static_flow_trace_resolves_route_and_unknown_route(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "routes"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "routes.js").write_text(
        'function listUsers() { return loadUsers(); }\n'
        'function loadUsers() { return true; }\n'
        'app.get("/users", listUsers);\n',
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    response = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace GET /users"},
    )
    assert response.status_code == 200
    assert response.json()["steps"][0]["type"] == "route"
    assert any(step["name"] == "listUsers" for step in response.json()["steps"])

    missing = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace GET /missing"},
    )
    assert missing.status_code == 404


def test_static_flow_trace_reports_unresolved_calls_and_depth(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "dynamic"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "flow.js").write_text(
        "function start() { return dynamicTarget(); }\n",
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    response = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace function start", "max_depth": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["steps"]) == 1
    assert body["unresolved"] == []

    full = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace function start"},
    )
    assert full.status_code == 200
    assert full.json()["unresolved"][0]["type"] == "unresolved_dynamic_call"


def test_static_flow_trace_requires_analysis_and_rejects_unknown_project(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "pending"}).json()
    pending = client.post(
        f"/api/projects/{created['project_id']}/trace",
        json={"query": "Trace the application flow"},
    )
    assert pending.status_code == 409
    missing = client.post("/api/projects/missing/trace", json={"query": "Trace foo"})
    assert missing.status_code == 404
