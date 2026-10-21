from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source: str  # 'demo', git url, or file path

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    source_path: Optional[str] = None
    source_stack: Optional[str] = None
    target_stack: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True
        from_attributes = True

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]

class AnalysisResponse(BaseModel):
    id: str
    project_id: str
    languages: Optional[Dict[str, Any]] = None
    frameworks: Optional[Dict[str, Any]] = None
    dependencies: Optional[Dict[str, Any]] = None
    api_routes: Optional[Dict[str, Any]] = None
    services: Optional[Dict[str, Any]] = None
    models_found: Optional[Dict[str, Any]] = None
    tests: Optional[Dict[str, Any]] = None
    entry_points: Optional[Dict[str, Any]] = None
    file_count: Optional[int] = 0
    loc: Optional[int] = 0
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class ArchitectureNodeSchema(BaseModel):
    id: str
    node_id: str
    label: str
    node_type: str
    file_path: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

class ArchitectureEdgeSchema(BaseModel):
    id: str
    source_node: str
    target_node: str
    edge_type: str
    label: Optional[str] = None
    class Config:
        from_attributes = True

class ArchitectureResponse(BaseModel):
    nodes: List[ArchitectureNodeSchema]
    edges: List[ArchitectureEdgeSchema]

class MigrationPlanCreate(BaseModel):
    target_stack: Dict[str, Any]

class MigrationPlanResponse(BaseModel):
    id: str
    project_id: str
    source_stack: Optional[Dict[str, Any]] = None
    target_stack: Optional[Dict[str, Any]] = None
    mappings: Optional[Dict[str, Any]] = None
    risks: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class MigrationStatusResponse(BaseModel):
    status: str
    files_processed: int
    total_files: int
    current_file: Optional[str] = None

class VerificationResponse(BaseModel):
    id: str
    scenario_name: str
    original_behavior: Optional[Dict[str, Any]] = None
    migrated_behavior: Optional[Dict[str, Any]] = None
    match_status: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config:
        from_attributes = True

class AgentEvent(BaseModel):
    event_type: str
    agent_name: str
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime

class BuildResult(BaseModel):
    id: str
    command: str
    exit_code: int
    status: str
    class Config:
        from_attributes = True

class TestResult(BaseModel):
    id: str
    total: int
    passed: int
    failed: int
    skipped: int
    status: str
    class Config:
        from_attributes = True
