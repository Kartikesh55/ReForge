from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from backend.app.api.projects import get_project_record
from backend.app.services.analysis import analyze_project, load_analysis

router = APIRouter(prefix="/projects", tags=["Analysis"])


def _project_or_404(project_id: str) -> dict[str, Any]:
    project = get_project_record(project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )
    return project


def _analysis_or_409(project: dict[str, Any]) -> dict[str, Any]:
    analysis = load_analysis(project)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project has not been analyzed yet.",
        )
    return analysis


@router.post("/{project_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze(project_id: str) -> dict[str, Any]:
    project = _project_or_404(project_id)
    try:
        result = analyze_project(project)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except (KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Repository analysis failed.",
        ) from exc
    return {
        "analysis_id": result["analysis_id"],
        "project_id": project_id,
        "status": result["status"],
        "message": "Repository analysis completed.",
    }


@router.get("/{project_id}/analysis")
async def analysis_status(project_id: str) -> dict[str, Any]:
    project = _project_or_404(project_id)
    analysis = load_analysis(project)
    if analysis is None:
        return {"project_id": project_id, "status": "NOT_ANALYZED"}
    return {
        "analysis_id": analysis["analysis_id"],
        "project_id": project_id,
        "status": analysis["status"],
        "created_at": analysis["created_at"],
        "statistics": analysis["statistics"],
    }


@router.get("/{project_id}/graph")
async def graph(project_id: str) -> dict[str, Any]:
    project = _project_or_404(project_id)
    analysis = _analysis_or_409(project)
    return {"project_id": project_id, **analysis["graph"]}


@router.get("/{project_id}/graph/stats")
async def graph_stats(project_id: str) -> dict[str, Any]:
    project = _project_or_404(project_id)
    analysis = _analysis_or_409(project)
    return {"project_id": project_id, **analysis["statistics"]}


@router.get("/{project_id}/nodes/{node_id:path}/dependencies")
async def node_dependencies(project_id: str, node_id: str) -> dict[str, Any]:
    return _related_nodes(project_id, node_id, "USES")


@router.get("/{project_id}/nodes/{node_id:path}/dependents")
async def node_dependents(project_id: str, node_id: str) -> dict[str, Any]:
    return _related_nodes(project_id, node_id, "USES", incoming=True)


@router.get("/{project_id}/nodes/{node_id:path}")
async def node(project_id: str, node_id: str) -> dict[str, Any]:
    project = _project_or_404(project_id)
    analysis = _analysis_or_409(project)
    for item in analysis["graph"]["nodes"]:
        if item["id"] == node_id:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph node not found.")


def _related_nodes(
    project_id: str, node_id: str, edge_type: str, incoming: bool = False
) -> dict[str, Any]:
    project = _project_or_404(project_id)
    analysis = _analysis_or_409(project)
    nodes = {item["id"]: item for item in analysis["graph"]["nodes"]}
    if node_id not in nodes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Graph node not found.")
    related_ids = set()
    for edge in analysis["graph"]["edges"]:
        if edge["type"] != edge_type:
            continue
        if incoming and edge["target"] == node_id:
            related_ids.add(edge["source"])
        elif not incoming and edge["source"] == node_id:
            related_ids.add(edge["target"])
    return {
        "project_id": project_id,
        "node_id": node_id,
        "nodes": [nodes[item_id] for item_id in sorted(related_ids)],
    }
