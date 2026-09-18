from typing import TypedDict, List, Dict, Optional, Any
from enum import Enum

class PipelinePhase(str, Enum):
    INITIALIZED = "INITIALIZED"
    ARCHAEOLOGY = "ARCHAEOLOGY"
    FLOW_TRACING = "FLOW_TRACING"
    TAM_SYNTHESIS = "TAM_SYNTHESIS"
    MIGRATION_PLANNING = "MIGRATION_PLANNING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    MIGRATION_EXECUTION = "MIGRATION_EXECUTION"
    VERIFICATION = "VERIFICATION"
    REPAIR = "REPAIR"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ExecutionMode(str, Enum):
    DOCKER = "DOCKER"
    LOCAL_PROCESS = "LOCAL_PROCESS"

class ReForgeState(TypedDict):
    project_id: str
    project_name: str
    source_path: str
    target_path: str
    current_phase: PipelinePhase
    execution_mode: ExecutionMode

    # Archaeology & Knowledge Graph
    detected_languages: List[str]
    detected_frameworks: List[str]
    ckg_summary: Dict[str, Any]
    hotspots: List[Dict[str, Any]]

    # TAM (Intermediate Representation)
    tam_specification: Optional[Dict[str, Any]]

    # Migration Plan
    migration_plan_id: Optional[str]
    plan_approval_status: str
    migration_tasks: List[Dict[str, Any]]
    current_task_index: int

    # Build & Verification
    compile_success: bool
    compiler_diagnostics: List[Dict[str, Any]]
    verification_parity_score: float
    behavioral_diffs: List[Dict[str, Any]]

    # Repair Loop
    repair_iteration: int
    max_repair_iterations: int
    repair_history: List[Dict[str, Any]]
    last_error_context: Optional[str]

    # Audit & Streaming Logs
    audit_logs: List[Dict[str, Any]]
