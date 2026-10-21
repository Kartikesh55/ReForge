import os
import tempfile
import zipfile
import pytest
from app.analyzers.parser import parse_codebase_symbols
from app.migration.planner import create_migration_plan
from app.migration.generator import generate_target_codebase

def test_migration_planner_and_generator_for_python_fastapi():
    with tempfile.TemporaryDirectory() as tmpdir:
        models_py = os.path.join(tmpdir, "models.py")
        with open(models_py, "w", encoding="utf-8") as f:
            f.write("""
from sqlalchemy import Column, Integer, String, Float
from database import Base

class RateLimitBucket(Base):
    __tablename__ = "rate_limit_buckets"
    id = Column(Integer, primary_key=True)
    key = Column(String(255))
    capacity = Column(Integer)
    tokens = Column(Float)
""")

        service_py = os.path.join(tmpdir, "limiter_service.py")
        with open(service_py, "w", encoding="utf-8") as f:
            f.write("""
class LimiterService:
    def check_rate_limit(self, key: str) -> bool:
        return True

    def refill_bucket(self, key: str, amount: float):
        pass
""")

        router_py = os.path.join(tmpdir, "limiter_router.py")
        with open(router_py, "w", encoding="utf-8") as f:
            f.write("""
from fastapi import APIRouter
router = APIRouter(prefix="/rate-limit")

@router.post("/check")
def check_limit():
    return {"allowed": True}

@router.get("/status")
def get_limiter_status():
    return {"status": "ACTIVE"}
""")

        test_py = os.path.join(tmpdir, "test_limiter.py")
        with open(test_py, "w", encoding="utf-8") as f:
            f.write("""
def test_limiter_allows_traffic():
    assert True
""")

        parsed = parse_codebase_symbols(tmpdir)
        assert len(parsed["controllers"]) >= 1
        assert len(parsed["models"]) >= 1
        assert len(parsed["services"]) >= 1
        assert len(parsed["tests"]) >= 1

        source_stack = {"language": "Python", "framework": "FastAPI", "database": "PostgreSQL"}
        target_stack = {"language": "Java", "framework": "Spring Boot", "database": "PostgreSQL", "testing": "JUnit 5"}
        plan = create_migration_plan(source_stack, target_stack, parsed)

        mappings = plan["mappings"]
        sources = [m["source"] for m in mappings]
        targets = [m["target"] for m in mappings]

        assert any("limiter_router.py" in s for s in sources)
        assert any("limiter_service.py" in s for s in sources)
        assert any("models.py" in s for s in sources)
        assert any("test_limiter.py" in s for s in sources)

        assert not any("orderController" in s for s in sources)
        assert not any("OrderController" in t for t in targets)

        project_dir = os.path.join(tmpdir, "proj_out")
        gen_res = generate_target_codebase(project_dir, target_stack, plan)

        assert gen_res["total_files"] >= 4
        zip_path = os.path.join(project_dir, "migration", "migrated_project.zip")
        assert os.path.exists(zip_path)

        with zipfile.ZipFile(zip_path, 'r') as zf:
            zip_namelist = zf.namelist()
            assert any("Limiter" in n or "RateLimitBucket" in n for n in zip_namelist)
            assert any("pom.xml" in n for n in zip_namelist)
            assert not any("OrderController.java" in n for n in zip_namelist)
            assert not any("OrderService.java" in n for n in zip_namelist)
            assert not any("Order.java" in n for n in zip_namelist)

def test_migration_to_go_gin():
    with tempfile.TemporaryDirectory() as tmpdir:
        svc_py = os.path.join(tmpdir, "voice_assistant.py")
        with open(svc_py, "w", encoding="utf-8") as f:
            f.write("""
def synthesize_speech(prompt: str):
    return b"audio"

def transcribe_audio(audio_bytes: bytes):
    return "text"
""")
        parsed = parse_codebase_symbols(tmpdir)
        source_stack = {"language": "Python", "framework": "FastAPI"}
        target_stack = {"language": "Go", "framework": "Gin", "database": "PostgreSQL", "testing": "Go testing"}

        plan = create_migration_plan(source_stack, target_stack, parsed)
        project_dir = os.path.join(tmpdir, "go_out")
        gen_res = generate_target_codebase(project_dir, target_stack, plan)

        zip_path = os.path.join(project_dir, "migration", "migrated_project.zip")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            namelist = zf.namelist()
            assert any("go.mod" in n for n in namelist)
            assert any("voice_assistant" in n.lower() for n in namelist)
            assert not any("Order.java" in n for n in namelist)