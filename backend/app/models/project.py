import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Float, Text
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String)
    source_path = Column(String)
    source_stack = Column(String)
    target_stack = Column(String)
    status = Column(String, default='created')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")
    migration_plans = relationship("MigrationPlan", back_populates="project", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    languages = Column(JSON)
    frameworks = Column(JSON)
    dependencies = Column(JSON)
    api_routes = Column(JSON)
    services = Column(JSON)
    models_found = Column(JSON)
    tests = Column(JSON)
    entry_points = Column(JSON)
    file_count = Column(Integer)
    loc = Column(Integer)
    status = Column(String, default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="analyses")

class ArchitectureNode(Base):
    __tablename__ = "architecture_nodes"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    node_id = Column(String)
    label = Column(String)
    node_type = Column(String)
    file_path = Column(String)
    metadata_info = Column(JSON)

class ArchitectureEdge(Base):
    __tablename__ = "architecture_edges"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    source_node = Column(String)
    target_node = Column(String)
    edge_type = Column(String)
    label = Column(String)

class MigrationPlan(Base):
    __tablename__ = "migration_plans"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    source_stack = Column(JSON)
    target_stack = Column(JSON)
    mappings = Column(JSON)
    risks = Column(JSON)
    confidence = Column(Float)
    status = Column(String, default='draft')
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="migration_plans")
    migration_files = relationship("MigrationFile", back_populates="migration_plan", cascade="all, delete-orphan")

class MigrationFile(Base):
    __tablename__ = "migration_files"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    plan_id = Column(String, ForeignKey("migration_plans.id"))
    source_path = Column(String)
    target_path = Column(String)
    source_content = Column(Text)
    target_content = Column(Text)
    transformation_type = Column(String)
    status = Column(String, default='pending')
    migration_plan = relationship("MigrationPlan", back_populates="migration_files")

class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    agent_name = Column(String)
    state = Column(String)
    input_data = Column(JSON)
    output_data = Column(JSON)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String, default='running')

class BuildRun(Base):
    __tablename__ = "build_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    command = Column(String)
    stdout = Column(Text)
    stderr = Column(Text)
    exit_code = Column(Integer)
    status = Column(String, default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    tests = relationship("TestRun", back_populates="build_run", cascade="all, delete-orphan")

class TestRun(Base):
    __tablename__ = "test_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    build_id = Column(String, ForeignKey("build_runs.id"))
    total = Column(Integer, default=0)
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    details = Column(JSON)
    status = Column(String, default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    build_run = relationship("BuildRun", back_populates="tests")

class VerificationResult(Base):
    __tablename__ = "verification_results"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    scenario_name = Column(String)
    original_behavior = Column(JSON)
    migrated_behavior = Column(JSON)
    match_status = Column(String)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModernizationTask(Base):
    __tablename__ = "modernization_tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    task_type = Column(String)
    description = Column(String)
    status = Column(String, default='pending')
    result = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
