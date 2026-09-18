from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.api import projects
from backend.app.config import settings
from backend.app.main import app


def _project(monkeypatch, tmp_path: Path, files: dict[str, str]):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "migration-fixture"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    for relative, content in files.items():
        path = source / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    assert client.post(f"/api/projects/{created['project_id']}/analyze").status_code == 202
    return client, created["project_id"]


def test_migration_plan_detects_stack_and_maps_real_files(monkeypatch, tmp_path):
    client, project_id = _project(monkeypatch, tmp_path, {
        "package.json": '{"name":"orders","dependencies":{"express":"1","mongoose":"1"},"devDependencies":{"jest":"1"}}',
        "app.js": 'const express = require("express");\nfunction createOrder() { return true; }\napp.post("/orders", createOrder);\n',
        "order.model.js": 'const mongoose = require("mongoose");\nconst Order = mongoose.model("Order", new mongoose.Schema({ total: Number }));\n',
        "app.test.js": 'test("orders", () => {});\n',
    })
    response = client.post(f"/api/projects/{project_id}/migration/plan", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["compatibility"]["supported"] is True
    source_files = {item["source_file"] for item in body["file_mappings"]}
    assert {"app.js", "order.model.js", "package.json"} <= source_files
    assert body["database_mappings"][0]["source_model"] == "Order"
    assert body["evidence"]


def test_migration_plan_reports_unresolved_calls_as_review(monkeypatch, tmp_path):
    client, project_id = _project(monkeypatch, tmp_path, {
        "package.json": '{"dependencies":{"express":"1"}}',
        "app.js": 'const express = require("express");\nfunction start() { return dynamicTarget(); }\n',
    })
    response = client.post(f"/api/projects/{project_id}/migration/plan", json={})
    assert response.status_code == 200
    risks = response.json()["risks"]
    assert any(risk["area"] == "unresolved call" and risk["requires_review"] for risk in risks)


def test_migration_plan_rejects_unsupported_source_without_fabrication(monkeypatch, tmp_path):
    client, project_id = _project(monkeypatch, tmp_path, {
        "main.py": "print('hello')\n",
    })
    response = client.post(f"/api/projects/{project_id}/migration/plan", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["compatibility"]["supported"] is False
    assert body["file_mappings"] == []
    assert body["database_mappings"] == []
