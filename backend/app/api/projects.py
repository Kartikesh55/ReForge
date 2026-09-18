from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import json
from pathlib import Path
from backend.app.config import settings
from backend.app.services.analysis import load_analysis
from backend.app.services.ingestion import extract_zip_safely, read_archive, safe_project_name

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="task-api")
    description: Optional[str] = Field(None, example="Node.js Express task management API")
    source_tech: str = Field(default="Node.js + Express + MongoDB", example="Node.js + Express + MongoDB")
    target_tech: str = Field(default="Java + Spring Boot + PostgreSQL", example="Java + Spring Boot + PostgreSQL")

class ProjectResponse(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    source_tech: str
    target_tech: str
    status: str
    created_at: str
    ingestion_status: str = "COMPLETED"
    analysis_status: str = "NOT_STARTED"
    statistics: Optional[dict] = None


def _public_project(project: dict) -> dict:
    analysis = load_analysis(project)
    public = {key: value for key, value in project.items() if key not in {"source_path", "target_path"}}
    public["ingestion_status"] = project.get("ingestion_status", "COMPLETED")
    public["analysis_status"] = analysis.get("status", "NOT_STARTED") if analysis else "NOT_STARTED"
    public["statistics"] = analysis.get("statistics") if analysis else None
    return public

# In-memory registry backed by metadata file in projects directory
_projects_cache: dict[str, dict] = {}


def get_project_record(project_id: str) -> dict | None:
    if project_id not in _projects_cache:
        _load_projects()
    return _projects_cache.get(project_id)

def _get_project_meta_path(project_id: str) -> Path:
    proj_dir = settings.PROJECTS_DIR / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)
    return proj_dir / "meta.json"

def _load_projects():
    if not settings.PROJECTS_DIR.exists():
        return
    for proj_dir in settings.PROJECTS_DIR.iterdir():
        if proj_dir.is_dir():
            meta_file = proj_dir / "meta.json"
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        _projects_cache[data["project_id"]] = data
                except Exception:
                    pass

_load_projects()

@router.get("", response_model=List[ProjectResponse])
async def list_projects():
    _load_projects()
    return [_public_project(project) for project in _projects_cache.values()]


@router.post("/upload", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def upload_project(file: UploadFile = File(...), name: Optional[str] = Form(None)):
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    project_dir = settings.PROJECTS_DIR / project_id
    source_dir = project_dir / "source"
    target_dir = project_dir / "target"
    try:
        archive_data = read_archive(file.file)
        archive_name = Path(file.filename or "uploaded-project.zip").stem
        project_name = safe_project_name(name or archive_name)
        source_dir.mkdir(parents=True, exist_ok=False)
        target_dir.mkdir(parents=True, exist_ok=True)
        file_count = extract_zip_safely(archive_data, source_dir)
        now = datetime.utcnow().isoformat() + "Z"
        project_data = {
            "project_id": project_id,
            "name": project_name,
            "description": None,
            "source_tech": "Unknown",
            "target_tech": "Not configured",
            "status": "INGESTED",
            "ingestion_status": "COMPLETED",
            "created_at": now,
            "source_path": str(source_dir),
            "target_path": str(target_dir),
            "file_count": file_count,
        }
        meta_path = _get_project_meta_path(project_id)
        meta_path.write_text(json.dumps(project_data, indent=2), encoding="utf-8")
        _projects_cache[project_id] = project_data
        return _public_project(project_data)
    except (OSError, ValueError) as exc:
        import shutil
        shutil.rmtree(project_dir, ignore_errors=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    finally:
        await file.close()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate):
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    
    source_path = str(settings.PROJECTS_DIR / project_id / "source")
    target_path = str(settings.PROJECTS_DIR / project_id / "target")
    
    Path(source_path).mkdir(parents=True, exist_ok=True)
    Path(target_path).mkdir(parents=True, exist_ok=True)

    project_data = {
        "project_id": project_id,
        "name": payload.name,
        "description": payload.description,
        "source_tech": payload.source_tech,
        "target_tech": payload.target_tech,
        "status": "INITIALIZED",
        "created_at": now,
        "source_path": source_path,
        "target_path": target_path
    }

    meta_path = _get_project_meta_path(project_id)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2)

    _projects_cache[project_id] = project_data
    return project_data

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    project = get_project_record(project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    return _public_project(project)

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(project_id: str):
    if project_id not in _projects_cache:
        _load_projects()
    if project_id not in _projects_cache:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    del _projects_cache[project_id]
    return {"message": f"Project '{project_id}' deleted successfully."}
