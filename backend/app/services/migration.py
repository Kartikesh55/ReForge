from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Any

from backend.app.services.analysis import load_analysis

SUPPORTED_PROFILE = {
    "source": {
        "language": "javascript",
        "runtime": "node",
        "framework": "express",
        "database": "mongodb",
        "test_framework": "jest",
    },
    "target": {
        "language": "java",
        "runtime": "jvm",
        "framework": "spring_boot",
        "database": "postgresql",
        "test_framework": "junit",
    },
}


def _evidence(file: str, start: int, end: int, reason: str) -> dict[str, Any]:
    return {"file": file, "start_line": start, "end_line": end, "reason": reason}


def _node_evidence(node: dict[str, Any]) -> dict[str, Any] | None:
    evidence = node.get("evidence")
    if not isinstance(evidence, dict) or not evidence.get("file"):
        return None
    return {
        "file": evidence["file"],
        "start_line": int(evidence.get("start_line", 1)),
        "end_line": int(evidence.get("end_line", evidence.get("start_line", 1))),
    }


def _technology_evidence(scanner: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for key in ("framework_evidence", "database_orm_evidence", "test_framework_evidence"):
        result.extend(scanner.get(key, []))
    languages = scanner.get("programming_languages", [])
    if "JavaScript" in languages:
        result.append({"technology": "JavaScript", "source": "source files", "detail": "JavaScript files detected"})
    if "Node.js" in languages:
        result.append({"technology": "Node.js", "source": "package.json", "detail": "Node.js package metadata detected"})
    return result


def _plan_evidence(technology_evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for item in technology_evidence:
        source = str(item.get("source", "repository"))
        file = source if source.endswith((".json", ".js", ".ts", ".jsx", ".tsx")) else "repository"
        result.append(_evidence(file, 1, 1, f"{item.get('technology')}: {item.get('detail')}"))
    return result


def _detected_stack(scanner: dict[str, Any]) -> dict[str, Any]:
    stack = scanner.get("detected_stack", {})
    language = "javascript" if "JavaScript" in scanner.get("programming_languages", []) else "unknown"
    return {
        "language": language,
        "runtime": "node" if stack.get("runtime") == "Node.js" else "unknown",
        "framework": str(stack.get("framework", "Unknown")).lower(),
        "database": "mongodb" if stack.get("database") in {"MongoDB", "Mongoose"} else "unknown",
        "test_framework": str(stack.get("testing", "Unknown")).lower(),
        "evidence": _technology_evidence(scanner),
    }


def _component_type(node: dict[str, Any], scanner: dict[str, Any]) -> str | None:
    node_type = node.get("type")
    if node_type == "route":
        return "route"
    if node_type in {"function", "method", "class"}:
        name = str(node.get("name", "")).lower()
        file = str((node.get("evidence") or {}).get("file", "")).lower()
        if node_type == "class" or "service" in name or "service" in file:
            return "service"
        return "handler"
    if node_type == "model":
        return "model"
    if node_type == "file":
        if node.get("name") in scanner.get("likely_entry_points", []):
            return "entry_point"
        if node.get("name") in scanner.get("test_files", []):
            return "test"
        return "module"
    if node_type == "external_dependency":
        return "external_dependency"
    return None


def _application_model(analysis: dict[str, Any]) -> dict[str, Any]:
    scanner = analysis.get("scanner", {})
    nodes = analysis.get("graph", {}).get("nodes", [])
    components: list[dict[str, Any]] = []
    for node in nodes:
        component_type = _component_type(node, scanner)
        evidence = _node_evidence(node)
        if component_type is None or evidence is None:
            continue
        components.append({
            "name": node.get("name"),
            "type": component_type,
            "source_file": evidence["file"],
            "source_symbol": node.get("name") if node.get("type") != "file" else None,
            "responsibilities": [],
            "dependencies": [],
            "evidence": [_evidence(evidence["file"], evidence["start_line"], evidence["end_line"], "Graph component evidence")],
        })
    known_models = {item["name"] for item in components if item["type"] == "model"}
    for parsed in analysis.get("parse_results", []):
        for model in parsed.get("database_evidence", []):
            location = model.get("location", {})
            if model.get("symbol") in known_models or not location.get("file"):
                continue
            components.append({
                "name": model.get("symbol"),
                "type": "model",
                "source_file": location["file"],
                "source_symbol": model.get("symbol"),
                "responsibilities": ["MongoDB model"],
                "dependencies": [],
                "evidence": [_evidence(location["file"], location.get("start_line", 1), location.get("end_line", 1), "Database model evidence")],
            })
    return {
        "name": scanner.get("project_metadata", {}).get("name"),
        "components": components,
        "entry_points": scanner.get("likely_entry_points", []),
        "routes": [item for item in components if item["type"] == "route"],
        "tests": [item for item in components if item["type"] == "test"],
    }


def _target_path(component: dict[str, Any], package_name: str) -> tuple[str, str]:
    name = re.sub(r"[^A-Za-z0-9]", "", str(component.get("name") or "Application"))
    source_type = component["type"]
    if source_type == "route":
        return f"src/main/java/{package_name.replace('.', '/')}/{name.title().replace(' ', '')}Controller.java", "controller"
    if source_type == "model":
        return f"src/main/java/{package_name.replace('.', '/')}/{name.title().replace(' ', '')}.java", "entity"
    if source_type == "service":
        return f"src/main/java/{package_name.replace('.', '/')}/{name.title().replace(' ', '')}Service.java", "service"
    if source_type == "test":
        return f"src/test/java/{package_name.replace('.', '/')}/{name.title().replace(' ', '')}Test.java", "junit_test"
    return f"src/main/java/{package_name.replace('.', '/')}/{name.title().replace(' ', '')}.java", "component"


def _file_mappings(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    scanner = analysis.get("scanner", {})
    package_name = re.sub(r"[^a-z0-9]+", ".", str(scanner.get("project_metadata", {}).get("name", "reforge")).lower()).strip(".")
    model = _application_model(analysis)
    mappings: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for component in model["components"]:
        source_file = component["source_file"]
        target_file, target_type = _target_path(component, package_name)
        key = (source_file, target_file)
        if key in seen:
            continue
        seen.add(key)
        mappings.append({
            "source_file": source_file,
            "source_type": component["type"],
            "target_file": target_file,
            "target_type": target_type,
            "reason": f"Maps the detected {component['type']} responsibility to the Spring Boot target role.",
            "confidence_basis": {"source_evidence": True, "graph_evidence": True},
            "evidence": component["evidence"],
        })
    if scanner.get("package_json", {}).get("present"):
        mappings.append({
            "source_file": "package.json",
            "source_type": "manifest",
            "target_file": "pom.xml",
            "target_type": "maven_manifest",
            "reason": "Maps the detected Node package manifest to a Maven build descriptor.",
            "confidence_basis": {"source_evidence": True, "graph_evidence": False},
            "evidence": [_evidence("package.json", 1, 1, "package.json is present")],
        })
    return mappings


def _database_mappings(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    mappings = []
    model_items: list[tuple[str, dict[str, Any]]] = []
    for parsed in analysis.get("parse_results", []):
        for model in parsed.get("database_evidence", []):
            location = model.get("location", {})
            if location.get("file"):
                model_items.append((str(model.get("symbol", "entity")), location))
    for node in analysis.get("graph", {}).get("nodes", []):
        if node.get("type") == "model":
            evidence = _node_evidence(node)
            if evidence is not None:
                model_items.append((str(node.get("name", "entity")), evidence))
    source_root = Path(analysis.get("scanner", {}).get("source_path", ""))
    for relative in analysis.get("scanner", {}).get("files", []):
        path = source_root / relative
        if path.suffix.lower() not in {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"}:
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, 1):
            match = re.search(r"\bmongoose\.model\s*\(\s*[\"']([^\"']+)", line)
            if match:
                model_items.append((match.group(1), {"file": relative, "start_line": line_number, "end_line": line_number}))
    if any(name not in {"mongoose", "model"} for name, _ in model_items):
        model_items = [(name, evidence) for name, evidence in model_items if name not in {"mongoose", "model"}]
    seen: set[tuple[str, str]] = set()
    for model_name, evidence in model_items:
        if (model_name, evidence["file"]) in seen:
            continue
        seen.add((model_name, evidence["file"]))
        mappings.append({
            "source_model": model_name,
            "target_table": re.sub(r"(?<!^)(?=[A-Z])", "_", model_name).lower(),
            "fields": [],
            "relationships": [],
            "requires_review": ["Fields and relational relationships require review because the current analysis does not infer them confidently."],
            "evidence": [_evidence(evidence["file"], evidence["start_line"], evidence["end_line"], "Detected database model")],
        })
    return mappings


def _risks(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    risks: list[dict[str, Any]] = []
    graph = analysis.get("graph", {})
    for node in graph.get("nodes", []):
        if node.get("type") == "unresolved_call":
            evidence = _node_evidence(node)
            risks.append({
                "area": "unresolved call",
                "risk": "high",
                "reason": "The call target could not be resolved statically.",
                "evidence": [_evidence(evidence["file"], evidence["start_line"], evidence["end_line"], "Unresolved call evidence")] if evidence else [],
                "requires_review": True,
            })
    scanner = analysis.get("scanner", {})
    for relative in scanner.get("configuration_environment_files", []):
        risks.append({
            "area": "environment-specific configuration",
            "risk": "medium",
            "reason": "Configuration must be translated to Spring application properties without exposing values.",
            "evidence": [_evidence(relative, 1, 1, "Configuration file detected")],
            "requires_review": True,
        })
    return risks


def build_migration_plan(project: dict[str, Any], target: dict[str, Any] | None = None) -> dict[str, Any]:
    analysis = load_analysis(project)
    if analysis is None:
        raise RuntimeError("Project has not been analyzed yet.")
    scanner = analysis.get("scanner", {})
    source_stack = _detected_stack(scanner)
    target_stack = {**SUPPORTED_PROFILE["target"], **(target or {})}
    reasons: list[str] = []
    if source_stack["language"] != "javascript":
        reasons.append("The analyzed repository does not contain JavaScript source evidence.")
    if source_stack["framework"] not in {"express"}:
        reasons.append("Express framework evidence was not detected.")
    supported = not reasons
    mappings = _file_mappings(analysis) if supported else []
    database_mappings = _database_mappings(analysis) if supported and source_stack["database"] == "mongodb" else []
    risks = _risks(analysis)
    evidence = _plan_evidence(source_stack["evidence"]) + [
        item for mapping in mappings for item in mapping.get("evidence", [])
    ]
    phases = [
        {"order": 1, "title": "Freeze and verify source behavior", "affected_files": scanner.get("source_files", [])},
        {"order": 2, "title": "Create Spring Boot project skeleton", "affected_files": ["pom.xml"] if supported else []},
        {"order": 3, "title": "Migrate configuration and dependencies", "affected_files": scanner.get("configuration_environment_files", [])},
        {"order": 4, "title": "Migrate database models and schema", "affected_files": [item["source_model"] for item in database_mappings]},
        {"order": 5, "title": "Migrate business logic and REST API", "affected_files": [item["source_file"] for item in mappings]},
        {"order": 6, "title": "Migrate tests", "affected_files": scanner.get("test_files", [])},
        {"order": 7, "title": "Build, test, and perform behavioral verification", "affected_files": []},
    ]
    result = {
        "plan_id": f"mig_{uuid.uuid4().hex[:8]}",
        "source_stack": source_stack,
        "target_stack": target_stack,
        "compatibility": {"supported": supported, "reasons": reasons or ["The supported Node.js/Express migration profile is applicable."]},
        "application_model": _application_model(analysis) if supported else {"name": scanner.get("project_metadata", {}).get("name"), "components": []},
        "file_mappings": mappings,
        "database_mappings": database_mappings,
        "dependency_mappings": [
            {"source": "express", "target": "spring-boot-starter-web"},
            {"source": "mongoose", "target": "spring-boot-starter-data-jpa"},
            {"source": "jest", "target": "junit"},
            {"source": "package.json", "target": "pom.xml"},
        ] if supported else [],
        "migration_steps": phases,
        "risks": risks,
        "requires_review": [risk["area"] for risk in risks],
        "evidence": evidence,
    }
    plan_path = Path(project["source_path"]).parent / "migration-plan.json"
    plan_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result
