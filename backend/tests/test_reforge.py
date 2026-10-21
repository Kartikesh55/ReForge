import os
import pytest
from app.analyzers.scanner import scan_repository
from app.analyzers.parser import parse_codebase_symbols
from app.analyzers.graph_builder import build_architecture_graph
from app.analyzers.impact import analyze_impact
from app.rag.rag_engine import RAGEngine
from app.migration.planner import create_migration_plan
from app.migration.generator import generate_target_codebase
from app.verification.runner import run_verification_suite

def test_full_pipeline():
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample-project"))
    assert os.path.exists(sample_dir), "Sample project must exist"

    # 1. Scanner
    scan_res = scan_repository(sample_dir)
    assert scan_res["primary_language"] == "JavaScript"
    assert "Express" in scan_res["frameworks"]
    assert scan_res["total_files"] > 0

    # 2. Parser
    parsed = parse_codebase_symbols(sample_dir)
    assert len(parsed["routes"]) > 0
    assert len(parsed["controllers"]) > 0
    assert len(parsed["services"]) > 0
    assert len(parsed["models"]) > 0

    # 3. Graph Builder
    graph_data = build_architecture_graph(parsed, "TestApp")
    assert graph_data["node_count"] > 0
    assert graph_data["edge_count"] > 0

    # 4. Impact Analysis
    impact = analyze_impact("PaymentService", graph_data, parsed)
    assert impact["risk"] in ("High", "Medium", "Low")
    assert len(impact["affected_apis"]) > 0

    # 5. RAG Engine
    rag = RAGEngine(sample_dir, parsed)
    ans = rag.answer_question("What happens when an order is created?")
    assert len(ans["evidence"]) > 0
    assert len(ans["analysis"]) > 0

    # 6. Migration Planner
    source_stack = {"language": "JavaScript", "framework": "Express", "database": "MongoDB"}
    target_stack = {"language": "Java", "framework": "Spring Boot", "database": "PostgreSQL", "testing": "JUnit 5"}
    plan = create_migration_plan(source_stack, target_stack, parsed)
    assert len(plan["mappings"]) > 0
    assert "HIGH" in plan["risks"]

    # 7. Target Generator
    test_out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_out_migration"))
    gen_res = generate_target_codebase(test_out, target_stack, plan)
    assert os.path.exists(gen_res["zip_path"])
    assert gen_res["total_files"] > 0

    # 8. Verification Suite
    verif = run_verification_suite(auto_repair=True)
    assert verif["status"] == "VERIFIED_PASS"
    assert verif["passed_scenarios"] == verif["total_scenarios"]
