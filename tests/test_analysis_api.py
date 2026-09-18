from pathlib import Path
from urllib.parse import quote

from fastapi.testclient import TestClient

from backend.app.api import projects
from backend.app.config import settings
from backend.app.main import app


def test_analysis_api_exposes_real_graph(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)

    created = client.post("/api/projects", json={"name": "sample"}).json()
    source = Path(created["source_path"])
    (source / "package.json").write_text('{"dependencies": {"express": "^4.0.0"}}', encoding="utf-8")
    (source / "app.js").write_text(
        'const express = require("express");\n'
        'const app = express();\n'
        'function health() { return true; }\n'
        'app.get("/health", health);\n',
        encoding="utf-8",
    )

    response = client.post(f"/api/projects/{created['project_id']}/analyze")
    assert response.status_code == 202
    assert response.json()["status"] == "COMPLETED"

    graph = client.get(f"/api/projects/{created['project_id']}/graph")
    assert graph.status_code == 200
    assert any(node["type"] == "function" for node in graph.json()["nodes"])
    assert any(edge["type"] == "DECLARES_ROUTE" for edge in graph.json()["edges"])

    stats = client.get(f"/api/projects/{created['project_id']}/graph/stats")
    assert stats.status_code == 200
    assert stats.json()["node_count"] > 0

    function = next(node for node in graph.json()["nodes"] if node["type"] == "function")
    node_response = client.get(
        f"/api/projects/{created['project_id']}/nodes/{quote(function['id'], safe='')}"
    )
    assert node_response.status_code == 200
    assert node_response.json()["name"] == "health"

    dependency = next(node for node in graph.json()["nodes"] if node["type"] == "external_dependency")
    dependency_response = client.get(
        f"/api/projects/{created['project_id']}/nodes/{quote(dependency['id'], safe='')}/dependents"
    )
    assert dependency_response.status_code == 200


def test_analysis_api_handles_missing_projects():
    client = TestClient(app)
    response = client.get("/api/projects/not-a-project/analysis")
    assert response.status_code == 404
