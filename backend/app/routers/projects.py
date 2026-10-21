from fastapi import APIRouter
from ..models import Project, AnalysisResult, ArchitectureGraph

router = APIRouter()

@router.get("/", response_model=list[Project])
async def list_projects():
    return [Project(id="demo-1", name="sample-legacy-project", status="ready")]

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    return Project(id=project_id, name="sample-legacy-project", status="ready")
