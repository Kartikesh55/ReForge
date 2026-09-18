from langgraph.graph import StateGraph, START, END
from backend.agents.state import ReForgeState, PipelinePhase

# Node Stubs for the ReForge Pipeline Skeleton
def archaeologist_node(state: ReForgeState) -> dict:
    """Discovers project structure, routes, models, and builds initial CKG."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "archaeologist", "message": "Archaeologist discovered project components."})
    return {
        "current_phase": PipelinePhase.ARCHAEOLOGY,
        "audit_logs": logs
    }

def flow_tracer_node(state: ReForgeState) -> dict:
    """Traces endpoint-to-database execution flows."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "flow_tracer", "message": "Traced execution flows."})
    return {
        "current_phase": PipelinePhase.FLOW_TRACING,
        "audit_logs": logs
    }

def tam_builder_node(state: ReForgeState) -> dict:
    """Synthesizes the Technology-Independent Application Model (IR)."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "tam_builder", "message": "Synthesized TAM specification."})
    return {
        "current_phase": PipelinePhase.TAM_SYNTHESIS,
        "audit_logs": logs
    }

def architect_node(state: ReForgeState) -> dict:
    """Formulates topological migration DAG and awaits human approval."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "architect", "message": "Formulated migration plan DAG."})
    return {
        "current_phase": PipelinePhase.AWAITING_APPROVAL,
        "plan_approval_status": "AWAITING_APPROVAL",
        "audit_logs": logs
    }

def engineer_node(state: ReForgeState) -> dict:
    """Synthesizes target Java/Spring Boot code from TAM."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "engineer", "message": "Synthesizing target code."})
    return {
        "current_phase": PipelinePhase.MIGRATION_EXECUTION,
        "audit_logs": logs
    }

def compile_check_node(state: ReForgeState) -> dict:
    """Compiles the target project and captures diagnostics."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "compile_check", "message": "Target compilation verified."})
    return {
        "compile_success": True,
        "audit_logs": logs
    }

def verifier_node(state: ReForgeState) -> dict:
    """Executes dual HTTP replay and computes behavioral parity."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "verifier", "message": "Behavioral verification executed."})
    return {
        "current_phase": PipelinePhase.VERIFICATION,
        "verification_parity_score": 100.0,
        "audit_logs": logs
    }

def debugger_node(state: ReForgeState) -> dict:
    """Diagnoses compiler/behavioral errors and applies surgical patches."""
    logs = state.get("audit_logs", [])
    curr_iter = state.get("repair_iteration", 0) + 1
    logs.append({"step": "debugger", "message": f"Applied repair patch (iteration {curr_iter})."})
    return {
        "current_phase": PipelinePhase.REPAIR,
        "repair_iteration": curr_iter,
        "audit_logs": logs
    }

def finalize_node(state: ReForgeState) -> dict:
    """Finalizes migration and prepares report."""
    logs = state.get("audit_logs", [])
    logs.append({"step": "finalize", "message": "Migration completed successfully."})
    return {
        "current_phase": PipelinePhase.COMPLETED,
        "audit_logs": logs
    }

# Conditional Routers
def should_continue_to_engineer(state: ReForgeState) -> str:
    if state.get("plan_approval_status") == "APPROVED":
        return "engineer_node"
    return "architect_node"

def route_after_compile(state: ReForgeState) -> str:
    if state.get("compile_success", False):
        return "verifier_node"
    if state.get("repair_iteration", 0) < state.get("max_repair_iterations", 3):
        return "debugger_node"
    return END

def route_after_verification(state: ReForgeState) -> str:
    if state.get("verification_parity_score", 0.0) >= 95.0:
        return "finalize_node"
    if state.get("repair_iteration", 0) < state.get("max_repair_iterations", 3):
        return "debugger_node"
    return END

def build_reforge_graph():
    """Builds and compiles the ReForge LangGraph state machine."""
    workflow = StateGraph(ReForgeState)

    # Register Nodes
    workflow.add_node("archaeologist_node", archaeologist_node)
    workflow.add_node("flow_tracer_node", flow_tracer_node)
    workflow.add_node("tam_builder_node", tam_builder_node)
    workflow.add_node("architect_node", architect_node)
    workflow.add_node("engineer_node", engineer_node)
    workflow.add_node("compile_check_node", compile_check_node)
    workflow.add_node("verifier_node", verifier_node)
    workflow.add_node("debugger_node", debugger_node)
    workflow.add_node("finalize_node", finalize_node)

    # Define Transitions
    workflow.add_edge(START, "archaeologist_node")
    workflow.add_edge("archaeologist_node", "flow_tracer_node")
    workflow.add_edge("flow_tracer_node", "tam_builder_node")
    workflow.add_edge("tam_builder_node", "architect_node")
    
    workflow.add_conditional_edges(
        "architect_node",
        should_continue_to_engineer,
        {
            "engineer_node": "engineer_node",
            "architect_node": "architect_node"
        }
    )

    workflow.add_edge("engineer_node", "compile_check_node")

    workflow.add_conditional_edges(
        "compile_check_node",
        route_after_compile,
        {
            "verifier_node": "verifier_node",
            "debugger_node": "debugger_node",
            END: END
        }
    )

    workflow.add_conditional_edges(
        "verifier_node",
        route_after_verification,
        {
            "finalize_node": "finalize_node",
            "debugger_node": "debugger_node",
            END: END
        }
    )

    # Direct repair loop: debugger -> compile_check_node
    workflow.add_edge("debugger_node", "compile_check_node")
    workflow.add_edge("finalize_node", END)

    return workflow.compile()
