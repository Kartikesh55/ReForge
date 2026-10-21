import os
import tempfile
import pytest
from app.analyzers.scanner import scan_repository
from app.analyzers.parser import parse_codebase_symbols
from app.analyzers.graph_builder import build_architecture_graph
from app.analyzers.impact import analyze_impact
from app.rag.rag_engine import RAGEngine
from app.verification.runner import run_verification_suite, generate_project_scenarios

def test_dynamic_chat_impact_and_verification_for_python():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a Python microservice with specific custom names
        app_file = os.path.join(tmpdir, "telemetry_app.py")
        with open(app_file, "w", encoding="utf-8") as f:
            f.write('''
from fastapi import FastAPI
app = FastAPI()

@app.get("/telemetry/ping")
def telemetry_ping():
    return {"status": "PONG"}

@app.post("/telemetry/metrics")
def collect_metrics(data: dict):
    return {"ingested": True}
''')

        test_file = os.path.join(tmpdir, "test_telemetry.py")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write('''
import pytest

def test_ping():
    assert True
''')

        parsed = parse_codebase_symbols(tmpdir)
        graph = build_architecture_graph(parsed, "TelemetryApp")

        # 1. Test Codebase Chat Dynamic Behavior
        rag = RAGEngine(tmpdir, parsed, source_stack={"language": "Python", "framework": "FastAPI"})
        init_ctx = rag.get_initial_chat_context()

        assert "Python" in init_ctx["summary"]
        assert "server.js" not in str(init_ctx["evidence"])
        assert "Express" not in init_ctx["summary"]
        assert any("/telemetry" in q for q in init_ctx["suggested_questions"])

        # Query testing
        chat_ans = rag.answer_question("How does telemetry ping work?")
        citation_files = [c["file"] for c in chat_ans["citations"]]
        assert any("telemetry_app.py" in f for f in citation_files)
        assert not any("server.js" in f or "orderController" in f for f in citation_files)

        # 2. Test Impact Analysis Dynamic Behavior
        ping_node = None
        for n in graph["nodes"]:
            if "ping" in n["id"].lower():
                ping_node = n["id"]
                break
        assert ping_node is not None

        impact = analyze_impact(ping_node, graph, parsed)
        assert "OrderService" not in impact["direct_dependents"]
        assert "POST /api/orders" not in impact["affected_apis"]
        assert "order.test.js" not in impact["affected_tests"]
        assert any("ping" in api for api in impact["affected_apis"])

        # 3. Test Verification Center Dynamic Behavior
        scenarios = generate_project_scenarios(parsed, "Python + FastAPI", "Go + Gin")
        scenario_paths = [s["path"] for s in scenarios]

        assert any("/telemetry/ping" in p for p in scenario_paths)
        assert any("/telemetry/metrics" in p for p in scenario_paths)
        assert not any("/api/orders" in p for p in scenario_paths)

        verif_run = run_verification_suite(parsed_data=parsed, source_stack="Python + FastAPI", target_stack="Go + Gin", auto_repair=True)
        assert verif_run["total_scenarios"] >= 2
        assert verif_run["status"] == "VERIFIED_PASS"
