from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from archaeologist.ast_parser import JavaScriptAstParser
from archaeologist.graph import KnowledgeGraphBuilder
from archaeologist.scanner import CodebaseScanner


def analysis_path(project: dict[str, Any]) -> Path:
    return Path(project["source_path"]).parent / "analysis.json"


def load_analysis(project: dict[str, Any]) -> dict[str, Any] | None:
    path = analysis_path(project)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def analyze_project(project: dict[str, Any]) -> dict[str, Any]:
    source_path = Path(project["source_path"])
    if not source_path.exists() or not source_path.is_dir():
        raise FileNotFoundError("Project source directory does not exist.")

    scanner_result = CodebaseScanner(source_path).scan()
    if "error" in scanner_result:
        raise ValueError(scanner_result["error"])
    parse_results = JavaScriptAstParser().parse_directory(source_path)
    graph = KnowledgeGraphBuilder().build_from_repository(
        source_path, scan_result=scanner_result, parse_results=parse_results
    )
    graph_data = graph.to_dict()
    graph_stats = graph.statistics()
    analysis_id = f"anlz_{uuid.uuid4().hex[:8]}"
    result = {
        "analysis_id": analysis_id,
        "project_id": project["project_id"],
        "status": "COMPLETED",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "scanner": scanner_result,
        "parse_results": [result.to_dict() for result in parse_results],
        "graph": graph_data,
        "statistics": {
            **graph_stats,
            "total_files": scanner_result["statistics"]["total_files"],
            "source_files": scanner_result["statistics"]["source_files"],
            "test_files": scanner_result["statistics"]["test_files"],
            "lines_of_code": scanner_result["statistics"]["approximate_lines_of_code"],
        },
    }
    path = analysis_path(project)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result
