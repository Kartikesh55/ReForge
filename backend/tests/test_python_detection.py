import os
import tempfile
import pytest
from app.analyzers.scanner import scan_repository
from app.analyzers.parser import parse_codebase_symbols
from app.analyzers.graph_builder import build_architecture_graph
from app.migration.planner import create_migration_plan

def test_python_project_detection_and_architecture():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a Python FastAPI codebase structure
        main_py = os.path.join(tmpdir, "main.py")
        with open(main_py, "w", encoding="utf-8") as f:
            f.write('''
from fastapi import FastAPI, Depends
from models import Item

app = FastAPI()

@app.get("/items")
def get_items():
    return [{"id": 1, "name": "Test"}]

@app.post("/items")
def create_item(item: dict):
    return item
''')
        models_py = os.path.join(tmpdir, "models.py")
        with open(models_py, "w", encoding="utf-8") as f:
            f.write('''
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    title = Column(String(50), nullable=False)
''')
        tests_dir = os.path.join(tmpdir, "tests")
        os.makedirs(tests_dir, exist_ok=True)
        test_py = os.path.join(tests_dir, "test_items.py")
        with open(test_py, "w", encoding="utf-8") as f:
            f.write('''
import pytest

def test_get_items():
    assert True
''')

        # 1. Scan
        scan_res = scan_repository(tmpdir)
        assert scan_res["primary_language"] == "Python"
        assert "Python" in scan_res["languages"]
        assert "FastAPI" in scan_res["frameworks"]
        assert "SQLAlchemy" in scan_res["databases"]
        assert "pytest" in scan_res["test_frameworks"]
        assert "npm" not in scan_res["package_managers"]

        # 2. Parse
        parsed = parse_codebase_symbols(tmpdir)
        assert len(parsed["routes"]) >= 2
        assert len(parsed["controllers"]) >= 1
        assert len(parsed["models"]) >= 1
        assert len(parsed["tests"]) >= 1

        # 3. Architecture Graph
        graph = build_architecture_graph(parsed, "TestPythonApp")
        node_types = {n["type"] for n in graph["nodes"]}
        assert "customRoute" in node_types
        assert "customController" in node_types
        assert "customModel" in node_types
        assert "customDatabase" in node_types
        assert "customTest" in node_types

        # Verify tiered layout coordinates
        for n in graph["nodes"]:
            assert "x" in n["position"]
            assert "y" in n["position"]

        # 4. Universal Migration Planning (Python -> Java)
        plan = create_migration_plan(
            source_stack="Python + FastAPI + SQLAlchemy + pytest",
            target_stack="Java + Spring Boot + PostgreSQL + JUnit 5",
            parsed_data=parsed
        )
        assert plan["confidence"] >= 0.9
        assert len(plan["mappings"]) >= 3
        # Ensure mapping descriptions mention Python
        desc_text = " ".join([m["description"] for m in plan["mappings"]])
        assert "Python" in desc_text
