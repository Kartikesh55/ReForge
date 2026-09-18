from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.api import projects
from backend.app.config import settings
from backend.app.main import app


def test_ask_route_lookup_returns_graph_and_source_evidence(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "orders"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    route_file = source / "src" / "routes" / "order.js"
    route_file.parent.mkdir(parents=True)
    route_file.write_text(
        'function createOrder() { return true; }\n'
        'app.post("/orders", createOrder);\n',
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    response = client.post(
        f"/api/projects/{created['project_id']}/ask",
        json={"question": "Which function handles POST /orders?", "mode": "developer"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "POST /orders" in body["answer"]
    assert any(item["name"] == "createOrder" for item in body["related_nodes"])
    assert body["evidence"][0]["file"] == "src/routes/order.js"
    assert body["evidence"][0]["start_line"] >= 1


def test_ask_modes_and_unknown_questions_are_grounded(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "empty"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "app.js").write_text("function hello() { return true; }", encoding="utf-8")
    client.post(f"/api/projects/{created['project_id']}/analyze")

    for mode in ("expert", "developer", "beginner", "layman"):
        response = client.post(
            f"/api/projects/{created['project_id']}/ask",
            json={"question": "What is hello?", "mode": mode},
        )
        assert response.status_code == 200
        assert response.json()["related_nodes"]

    unknown = client.post(
        f"/api/projects/{created['project_id']}/ask",
        json={"question": "Where is quantum teleportation?", "mode": "developer"},
    )
    assert "could not find sufficient evidence" in unknown.json()["answer"].lower()


def test_ask_rejects_unanalyzed_missing_and_invalid_requests(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "pending"}).json()
    pending = client.post(
        f"/api/projects/{created['project_id']}/ask",
        json={"question": "What is this?", "mode": "developer"},
    )
    assert pending.status_code == 409
    missing = client.post("/api/projects/nope/ask", json={"question": "x"})
    assert missing.status_code == 404
    empty = client.post(f"/api/projects/{created['project_id']}/ask", json={"question": ""})
    assert empty.status_code == 422


def test_ask_does_not_return_sensitive_file_evidence(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "secrets"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / ".env").write_text("TOKEN=secret-value", encoding="utf-8")
    (source / "app.js").write_text("function connect() { return true; }", encoding="utf-8")
    client.post(f"/api/projects/{created['project_id']}/analyze")
    response = client.post(
        f"/api/projects/{created['project_id']}/ask",
        json={"question": "Where is connect?", "mode": "expert"},
    )
    assert response.status_code == 200
    assert "secret-value" not in response.text


def test_ask_retrieval_changes_with_question_and_uses_python_source(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "customer-support"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "app.py").write_text(
        "def handle_customer_query(query):\n"
        "    return agents.answer_query(query)\n",
        encoding="utf-8",
    )
    (source / "agents.py").write_text(
        "def answer_query(query):\n"
        "    return rag_pipeline(query, customer_memory())\n",
        encoding="utf-8",
    )
    (source / "documents" / "company_policy.txt").parent.mkdir(parents=True)
    (source / "documents" / "company_policy.txt").write_text(
        "Customer support policies used by the document loader.", encoding="utf-8"
    )
    (source / "memory.py").write_text(
        "def customer_memory():\n"
        "    return conversation_history\n",
        encoding="utf-8",
    )
    (source / "rag.py").write_text(
        "def rag_pipeline(query, memory):\n"
        "    return vector_retriever(query)\n",
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    def ask(question: str):
        response = client.post(
            f"/api/projects/{created['project_id']}/ask",
            json={"question": question, "mode": "developer"},
        )
        assert response.status_code == 200
        return response.json()

    app_answer = ask("What does app.py do?")
    agents_answer = ask("What does agents.py do?")
    rag_answer = ask("Where is the RAG pipeline implemented?")
    memory_answer = ask("Where is customer memory stored?")
    documents_answer = ask("What documents are used by the system?")
    unknown_answer = ask("Where is the quantum payment processor implemented?")

    assert app_answer["evidence"][0]["file"].endswith("app.py")
    assert agents_answer["evidence"][0]["file"].endswith("agents.py")
    assert app_answer["answer"] != agents_answer["answer"]
    assert rag_answer["evidence"][0]["file"].endswith("rag.py")
    assert memory_answer["evidence"][0]["file"].endswith("memory.py")
    assert documents_answer["evidence"][0]["file"].endswith("company_policy.txt")
    assert "could not find sufficient evidence" in unknown_answer["answer"].lower()
    assert unknown_answer["evidence"] == []


def test_ask_supports_grounded_project_overviews(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "support-app"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "README.md").write_text(
        "# Support Automation\n\nThis application automates customer support responses.\n",
        encoding="utf-8",
    )
    (source / "package.json").write_text(
        '{"name":"support-app","description":"Customer support automation","dependencies":{"express":"1.0.0"}}',
        encoding="utf-8",
    )
    (source / "app.py").write_text(
        "def handle_customer_query(query):\n    return query\n",
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    def ask(question: str):
        response = client.post(
            f"/api/projects/{created['project_id']}/ask",
            json={"question": question, "mode": "developer"},
        )
        assert response.status_code == 200
        return response.json()

    overview = ask("What is this project about?")
    purpose = ask("What does this project do?")
    summary = ask("Give me an overview of the project")
    technology = ask("What technologies does this project use?")
    components = ask("What are the main components?")
    architecture = ask("Explain the architecture")
    flow = ask("How does this application work?")
    unknown = ask("Where is the quantum payment processor implemented?")

    for result in (overview, purpose, summary, technology, components, architecture, flow):
        assert "could not find sufficient evidence" not in result["answer"].lower()
        assert result["evidence"]
        assert result["confidence_basis"]["source_evidence"] is True
    assert "support automation" in overview["answer"].lower()
    assert "express" in technology["answer"].lower()
    assert "app.py" in architecture["answer"]
    assert "could not find sufficient evidence" in unknown["answer"].lower()
    assert unknown["evidence"] == []


def test_ask_explains_resolved_files_from_their_contents(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(settings, "PROJECTS_DIR", tmp_path / "projects")
    projects._projects_cache.clear()
    client = TestClient(app)
    created = client.post("/api/projects", json={"name": "support-app"}).json()
    source = settings.PROJECTS_DIR / created["project_id"] / "source"
    (source / "agents.py").write_text(
        "from rag import rag_pipeline\n\n"
        "def answer_query(query):\n"
        "    return rag_pipeline(query)\n",
        encoding="utf-8",
    )
    (source / "app.py").write_text(
        "def main():\n"
        "    return answer_query('hello')\n",
        encoding="utf-8",
    )
    client.post(f"/api/projects/{created['project_id']}/analyze")

    def ask(question: str):
        response = client.post(
            f"/api/projects/{created['project_id']}/ask",
            json={"question": question, "mode": "developer"},
        )
        assert response.status_code == 200
        return response.json()

    agents = ask("What does agents.py do?")
    explained = ask("Explain agents.py")
    purpose = ask("What is the purpose of agents.py?")
    app_answer = ask("What does app.py do?")
    main = ask("What does main function do?")
    missing = ask("What does quantum_payment.py do?")

    for result in (agents, explained, purpose):
        assert "answer_query" in result["answer"]
        assert any(item["file"].endswith("agents.py") for item in result["evidence"])
        assert result["confidence_basis"]["source_evidence"] is True
    assert "main" in app_answer["answer"]
    assert any(item["file"].endswith("app.py") for item in app_answer["evidence"])
    assert "main" in main["answer"]
    assert "could not find sufficient evidence" in missing["answer"].lower()
    assert missing["evidence"] == []
