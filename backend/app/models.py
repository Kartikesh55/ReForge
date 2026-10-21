from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Project(BaseModel):
    id: str
    name: str
    status: str

class AnalysisResult(BaseModel):
    languages: Dict[str, str]
    frameworks: List[str]
    dependencies: List[str]
    routes: int
    services: int
    models: int

class Node(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    position: Dict[str, float]

class Edge(BaseModel):
    id: str
    source: str
    target: str

class ArchitectureGraph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
