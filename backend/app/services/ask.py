from __future__ import annotations

import json
import re
from collections import deque
from pathlib import Path
from typing import Any

SENSITIVE_NAMES = {".env", ".env.local", ".env.production", "credentials", "credentials.json"}
MODES = {"expert", "developer", "beginner", "layman"}
STOPWORDS = {
    "a", "an", "and", "application", "are", "does", "for", "how", "i", "in",
    "is", "it", "me", "of", "on", "the", "this", "to", "what", "where",
    "which", "with", "you",
}
QUESTION_ALIASES = {
    "documents": {"document", "documents", "policy", "policies", "knowledge", "files"},
    "rag": {"rag", "retrieval", "retriever", "embedding", "embeddings", "vector", "vectorstore"},
    "memory": {"memory", "conversation", "history", "session", "state", "checkpoint"},
    "flow": {"flow", "query", "customer", "question", "pipeline", "request", "asks"},
}
TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".md", ".txt", ".yaml", ".yml"
}
OVERVIEW_PATTERNS = (
    "what is this project", "what does this project", "overview of the project",
    "overview of this project", "explain this project", "purpose of this application",
    "what kind of application", "how does this project work", "summary of this repository",
    "summarize this repository", "summarise this repository",
)


def _sensitive(path: str) -> bool:
    name = Path(path).name.lower()
    return name in SENSITIVE_NAMES or name.endswith(".pem") or "secret" in name or "credential" in name


def _node_evidence(node: dict[str, Any], source_root: Path) -> dict[str, Any] | None:
    evidence = node.get("evidence") or {}
    file_name = evidence.get("file")
    if not file_name or _sensitive(file_name):
        return None
    source_file = (source_root / file_name).resolve()
    root = source_root.resolve()
    if not source_file.is_file() or root not in source_file.parents:
        return None
    try:
        lines = source_file.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return None
    start = max(1, int(evidence.get("start_line", 1)))
    end = min(len(lines), max(start, int(evidence.get("end_line", start))))
    if not lines:
        return None
    return {
        "file": file_name,
        "start_line": start,
        "end_line": end,
        "reason": f"Evidence for {node.get('type', 'entity')} '{node.get('name', '<anonymous>')}'.",
        "snippet": "\n".join(lines[start - 1:end]),
    }


def _source_matches(source_root: Path, terms: set[str]) -> dict[str, int]:
    matches: dict[str, int] = {}
    if not terms:
        return matches
    root = source_root.resolve()
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            relative = path.resolve().relative_to(root)
            if _sensitive(str(relative)):
                continue
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
        except (OSError, ValueError):
            continue
        tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9]*", text)
        score = sum(tokens.count(term) for term in terms)
        if score:
            matches[str(relative)] = score
    return matches


def _question_terms(question: str) -> set[str]:
    return {
        term
        for term in re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", question.lower())
        if term not in STOPWORDS
    }


def _intent_terms(question: str, terms: set[str]) -> set[str]:
    lowered = question.lower()
    expanded = set(terms)
    for intent, aliases in QUESTION_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            expanded.update(aliases)
    if "document" in lowered or "policy" in lowered:
        expanded.update({"documents", "document", "load", "loader", "directory", "read"})
    if "rag" in lowered or "retriev" in lowered:
        expanded.update({"rag", "retriever", "retrieval", "embedding", "vector"})
    if "memory" in lowered:
        expanded.update({"memory", "conversation", "history", "session", "state"})
    return expanded


def _node_file(node: dict[str, Any]) -> str:
    evidence = node.get("evidence") or {}
    metadata = node.get("metadata") or {}
    return str(evidence.get("file") or metadata.get("file") or node.get("name") or "")


def _file_evidence(source_root: Path, file_name: str, reason: str, end_line: int = 30) -> dict[str, Any] | None:
    if _sensitive(file_name):
        return None
    root = source_root.resolve()
    path = (root / file_name).resolve()
    if not path.is_file() or root not in path.parents:
        return None
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return None
    if not lines:
        return None
    return {
        "file": Path(file_name).as_posix(),
        "start_line": 1,
        "end_line": min(len(lines), end_line),
        "reason": reason,
        "snippet": "\n".join(lines[:end_line]),
    }


def _overview_kind(question: str) -> str | None:
    lowered = question.lower().strip()
    if any(pattern in lowered for pattern in OVERVIEW_PATTERNS):
        return "project"
    if any(term in lowered for term in ("what technologies", "technologies does", "tech stack", "which frameworks", "which dependencies")):
        return "technology"
    if "architecture" in lowered:
        return "architecture"
    if any(term in lowered for term in ("main components", "major components", "important components")):
        return "component"
    if "how does this application work" in lowered:
        return "architecture"
    return None


def _file_question(question: str) -> str | None:
    match = re.search(
        r"(?:what does|explain|purpose of|implemented in|functionality does|role of)\s+[`'\" ]*([A-Za-z0-9_.-]+\.[A-Za-z0-9]+)",
        question.lower(),
    )
    return match.group(1) if match else None


def _file_explanation(
    project: dict[str, Any],
    analysis: dict[str, Any],
    file_query: str,
    mode: str,
) -> dict[str, Any]:
    graph = analysis.get("graph", {})
    graph_nodes = graph.get("nodes", [])
    graph_edges = graph.get("edges", [])
    source_root = Path(project["source_path"])
    normalized_query = file_query.replace("\\", "/").lower()
    file_nodes = [
        node for node in graph_nodes
        if node.get("type") == "file"
        and (
            str(node.get("name", "")).lower() == normalized_query
            or Path(str(node.get("name", ""))).name.lower() == Path(normalized_query).name
        )
    ]
    if not file_nodes:
        return _insufficient_evidence()

    file_node = sorted(file_nodes, key=lambda node: len(str(node.get("name", ""))))[0]
    file_name = str(file_node.get("name", ""))
    definitions = []
    imports = []
    for edge in graph_edges:
        if edge.get("source") != file_node.get("id"):
            continue
        target = next((node for node in graph_nodes if node.get("id") == edge.get("target")), None)
        if not target:
            continue
        if edge.get("type") == "DEFINES":
            definitions.append(target)
        elif edge.get("type") in {"IMPORTS", "USES", "USES_MODEL"}:
            imports.append(target)

    source_file = (source_root / file_name).resolve()
    root = source_root.resolve()
    if not source_file.is_file() or root not in source_file.parents or _sensitive(file_name):
        return _insufficient_evidence()
    try:
        lines = source_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return _insufficient_evidence()
    if not lines:
        return _insufficient_evidence()

    source_text = "\n".join(lines)
    if not definitions:
        structural_names = re.findall(
            r"(?m)^\s*(?:async\s+)?(?:def|function|class)\s+([A-Za-z_][A-Za-z0-9_]*)",
            source_text,
        )
        definitions = [
            {"id": f"source:{file_name}:{name}", "name": name, "type": "function"}
            for name in structural_names[:12]
        ]
    source_imports = re.findall(
        r"(?m)^\s*(?:from\s+([A-Za-z0-9_./-]+)\s+import|import\s+([A-Za-z0-9_./-]+)|"
        r"(?:const|let|var)\s+\w+\s*=\s*require\(['\"]([^'\"]+))",
        source_text,
    )
    if not imports:
        imports = [
            {"id": f"source:{file_name}:import:{next(part for part in match if part)}", "name": next(part for part in match if part), "type": "module"}
            for match in source_imports
        ]

    evidence = [{
        "file": file_name,
        "start_line": 1,
        "end_line": min(len(lines), 40),
        "reason": "Shows the file imports, declarations, and implementation.",
        "snippet": "\n".join(lines[:40]),
    }]
    for entity in definitions:
        item = _node_evidence(entity, source_root)
        if item:
            item["reason"] = f"Defines {entity.get('type', 'entity')} '{entity.get('name', '<anonymous>')}'."
            evidence.append(item)
    names = [str(entity.get("name")) for entity in definitions if entity.get("name")]
    import_names = [str(entity.get("name")) for entity in imports if entity.get("name")]
    functions = [entity for entity in definitions if entity.get("type") in {"function", "method"}]
    function_text = ", ".join(names[:8]) or "no named functions or classes were extracted"
    answer = f"`{file_name}` "
    if names:
        answer += f"defines {function_text}."
    else:
        answer += "contains source code, but no named functions or classes were extracted."
    if import_names:
        answer += f" It imports or uses {', '.join(import_names[:8])}."
    if functions:
        answer += " The extracted implementation is represented by the definitions shown in the evidence."
    else:
        answer += " Its responsibility cannot be determined beyond the concrete source shown."
    if mode in {"beginner", "layman"}:
        answer += " This description is based only on the file contents and static graph evidence."
    return {
        "answer": answer,
        "evidence": evidence[:8],
        "related_nodes": [
            {"id": node["id"], "name": node.get("name"), "type": node.get("type")}
            for node in [file_node, *definitions, *imports][:16]
        ],
        "confidence_basis": {
            "direct_graph_links": bool(definitions or imports),
            "source_evidence": True,
            "inference_used": False,
        },
    }


def _function_explanation(
    project: dict[str, Any],
    analysis: dict[str, Any],
    function_name: str,
    mode: str,
) -> dict[str, Any]:
    graph = analysis.get("graph", {})
    nodes = graph.get("nodes", [])
    target = next(
        (
            node for node in nodes
            if node.get("type") in {"function", "method"}
            and str(node.get("name", "")).lower() == function_name.lower()
        ),
        None,
    )
    if not target:
        source_root = Path(project["source_path"])
        for file_node in (node for node in nodes if node.get("type") == "file"):
            file_name = str(file_node.get("name", ""))
            source_file = (source_root / file_name).resolve()
            try:
                lines = source_file.read_text(encoding="utf-8", errors="ignore").splitlines()
            except (OSError, UnicodeDecodeError):
                continue
            for line_number, line in enumerate(lines, start=1):
                if re.search(
                    rf"\b(?:def|function|class)\s+{re.escape(function_name)}\b",
                    line,
                    flags=re.IGNORECASE,
                ):
                    return {
                        "answer": f"`{function_name}` is implemented in {file_name}; the cited source line defines it.",
                        "evidence": [{
                            "file": file_name,
                            "start_line": line_number,
                            "end_line": min(len(lines), line_number + 20),
                            "reason": f"Defines function or class '{function_name}'.",
                            "snippet": "\n".join(lines[line_number - 1:min(len(lines), line_number + 20)]),
                        }],
                        "related_nodes": [
                            {"id": file_node["id"], "name": file_node.get("name"), "type": file_node.get("type")}
                        ],
                        "confidence_basis": {
                            "direct_graph_links": False,
                            "source_evidence": True,
                            "inference_used": False,
                        },
                    }
        return _insufficient_evidence()
    source_root = Path(project["source_path"])
    item = _node_evidence(target, source_root)
    if not item:
        return _insufficient_evidence()
    answer = f"`{target.get('name')}` is defined in {item['file']} and its implementation is shown in the cited source evidence."
    if mode in {"beginner", "layman"}:
        answer += " The explanation is limited to the analyzed source and static relationships."
    related = [
        node for node in nodes
        if node.get("id") in {
            edge.get("target") for edge in graph.get("edges", [])
            if edge.get("source") == target.get("id")
        }
    ]
    return {
        "answer": answer,
        "evidence": [item],
        "related_nodes": [
            {"id": node["id"], "name": node.get("name"), "type": node.get("type")}
            for node in [target, *related]
        ],
        "confidence_basis": {
            "direct_graph_links": bool(related),
            "source_evidence": True,
            "inference_used": False,
        },
    }


def _insufficient_evidence() -> dict[str, Any]:
    return {
        "answer": "I could not find sufficient evidence in the analyzed project to answer this question.",
        "evidence": [],
        "related_nodes": [],
        "confidence_basis": {"direct_graph_links": False, "source_evidence": False, "inference_used": False},
    }


def _migration_answer(project: dict[str, Any], analysis: dict[str, Any], question: str) -> dict[str, Any] | None:
    if not re.search(r"\bmigrat(?:e|ion|ed|ing)\b|\bspring\s*boot\b|\bmanual review\b", question.lower()):
        return None
    plan_path = Path(project["source_path"]).parent / "migration-plan.json"
    if not plan_path.exists():
        return None
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    mappings = plan.get("file_mappings", [])
    risks = plan.get("risks", [])
    target = plan.get("target_stack", {})
    target_name = f"{target.get('framework', 'the target framework')} / {target.get('database', 'the target database')}"
    answer = (
        f"The analyzed repository has a migration plan targeting {target_name}. "
        f"It contains {len(mappings)} evidence-backed source-to-target mappings and "
        f"{len(risks)} area(s) requiring review."
    )
    if mappings:
        answer += " Planned mappings include " + ", ".join(
            f"{item.get('source_file')} to {item.get('target_file')}" for item in mappings[:4]
        ) + "."
    evidence = [
        item for item in plan.get("evidence", [])
        if isinstance(item, dict) and item.get("file")
    ][:8]
    return {
        "answer": answer,
        "evidence": evidence,
        "related_nodes": [],
        "confidence_basis": {
            "direct_graph_links": False,
            "source_evidence": bool(evidence),
            "inference_used": False,
        },
    }


def _overview_answer(
    project: dict[str, Any],
    analysis: dict[str, Any],
    question: str,
    mode: str,
) -> dict[str, Any]:
    scanner = analysis.get("scanner", {})
    graph = analysis.get("graph", {})
    source_root = Path(project["source_path"])
    files = scanner.get("files", [])
    evidence: list[dict[str, Any]] = []

    documentation = [
        file_name for file_name in files
        if Path(file_name).name.lower() in {"readme", "readme.md", "readme.txt", "architecture.md"}
        or Path(file_name).suffix.lower() in {".md", ".txt"}
    ]
    manifests = [
        file_name for file_name in files
        if Path(file_name).name.lower() in {
            "package.json", "requirements.txt", "pyproject.toml", "pom.xml", "cargo.toml"
        }
    ]
    for file_name in documentation[:2]:
        item = _file_evidence(source_root, file_name, "Describes project purpose or usage.")
        if item:
            evidence.append(item)
    for file_name in manifests[:2]:
        item = _file_evidence(source_root, file_name, "Declares project metadata, technologies, or dependencies.")
        if item:
            evidence.append(item)

    entry_points = list(scanner.get("likely_entry_points", []))
    if not entry_points:
        entry_points = [
            file_name for file_name in files
            if Path(file_name).name.lower() in {"app.py", "main.py", "server.py", "index.py", "index.js", "server.js"}
        ][:3]
    for file_name in entry_points[:3]:
        item = _file_evidence(source_root, file_name, "Identified as a likely application entry point.")
        if item:
            evidence.append(item)

    node_candidates = [
        node for node in graph.get("nodes", [])
        if node.get("type") in {"function", "class", "route", "model", "external_dependency"}
    ]
    node_candidates.sort(key=lambda node: (str(node.get("type")), str(node.get("name")), str(node.get("id"))))
    related = node_candidates[:12]
    if not evidence and not related:
        return {
            "answer": "I could not find sufficient evidence in the analyzed project to answer this question.",
            "evidence": [],
            "related_nodes": [],
            "confidence_basis": {"direct_graph_links": False, "source_evidence": False, "inference_used": False},
        }

    metadata = scanner.get("project_metadata", {})
    project_name = metadata.get("name") or project.get("name") or "the analyzed project"
    description = metadata.get("description")
    stack = scanner.get("detected_stack", {})
    technologies = list(scanner.get("programming_languages", []))
    technologies.extend(
        value for value in (
            stack.get("framework"), stack.get("database"), stack.get("orm"), stack.get("testing")
        ) if value and value != "Unknown"
    )
    technologies.extend(scanner.get("dependencies", [])[:8])
    technologies = list(dict.fromkeys(technologies))
    component_names = [str(node.get("name")) for node in related if node.get("type") != "external_dependency"][:6]
    entry_text = ", ".join(entry_points[:3]) or "no entry point was identified"

    kind = _overview_kind(question)
    if kind == "technology":
        answer = f"Based on the analyzed repository, {project_name} uses {', '.join(technologies) or 'technologies that could not be identified from its manifests'}."
    elif kind == "component":
        answer = f"Based on the analyzed repository, the main identifiable components are {', '.join(component_names) or 'not clearly identified'}."
    elif kind == "architecture":
        answer = f"Based on the analyzed repository, the application starts from {entry_text} and is connected to components including {', '.join(component_names) or 'no named components'}."
    else:
        answer = f"Based on the analyzed repository, {project_name} appears to be"
        answer += f" {description}." if description else " an application assembled from the documented source files and analyzed components."
        answer += f" Its identifiable technologies include {', '.join(technologies) or 'no declared stack'}."
        answer += f" Likely entry points include {entry_text}."
    if mode in {"beginner", "layman"}:
        answer += " This description is based only on repository evidence, not runtime assumptions."
    elif mode == "expert":
        answer += " The statement is limited to static metadata, source evidence, and graph entities."

    return {
        "answer": answer,
        "evidence": evidence[:8],
        "related_nodes": [
            {"id": node["id"], "name": node.get("name"), "type": node.get("type")}
            for node in related
        ],
        "confidence_basis": {
            "direct_graph_links": bool(graph.get("edges")),
            "source_evidence": bool(evidence),
            "inference_used": True,
        },
    }


def _related(node_id: str, edges: list[dict[str, Any]], nodes: dict[str, dict[str, Any]], depth: int = 2) -> list[dict[str, Any]]:
    queue = deque([(node_id, 0)])
    visited = {node_id}
    result: list[dict[str, Any]] = []
    while queue:
        current, current_depth = queue.popleft()
        if current_depth >= depth:
            continue
        for edge in edges:
            if edge.get("source") != current:
                continue
            target = edge.get("target")
            if target in visited or target not in nodes:
                continue
            visited.add(target)
            result.append(nodes[target])
            queue.append((target, current_depth + 1))
    return result


def ask_project(project: dict[str, Any], question: str, mode: str) -> dict[str, Any]:
    if mode not in MODES:
        raise ValueError("Mode must be one of: expert, developer, beginner, layman.")
    question = question.strip()
    if not question:
        raise ValueError("Question must not be empty.")

    from backend.app.services.analysis import load_analysis

    analysis = load_analysis(project)
    if analysis is None:
        raise RuntimeError("Project has not been analyzed yet.")
    graph = analysis.get("graph", {})
    graph_nodes = graph.get("nodes", [])
    graph_edges = graph.get("edges", [])
    nodes = {node["id"]: node for node in graph_nodes}
    migration_answer = _migration_answer(project, analysis, question)
    if migration_answer:
        return migration_answer
    overview_kind = _overview_kind(question)
    if overview_kind:
        return _overview_answer(project, analysis, question, mode)
    file_query = _file_question(question)
    if file_query:
        return _file_explanation(project, analysis, file_query, mode)
    function_match = re.search(
        r"(?:what does|explain|purpose of|functionality of)\s+([A-Za-z_][A-Za-z0-9_]*)\s+function?",
        question.lower(),
    )
    if function_match:
        return _function_explanation(project, analysis, function_match.group(1), mode)
    lowered = question.lower()
    route_match = re.search(r"\b(get|post|put|patch|delete)\s+(/[a-z0-9_./:{}-]+)", lowered)
    terms = _question_terms(question)
    search_terms = _intent_terms(question, terms)
    source_root = Path(project["source_path"])
    source_matches = _source_matches(source_root, search_terms)
    scored: list[tuple[int, dict[str, Any]]] = []
    for node in graph_nodes:
        name = str(node.get("name", "")).lower()
        file_name = _node_file(node).lower()
        metadata = node.get("metadata") or {}
        route_text = f"{metadata.get('method', '')} {metadata.get('path', '')}".lower()
        score = 0
        if route_match and route_match.group(1) in route_text and route_match.group(2) == str(metadata.get("path", "")).lower():
            score += 100
        if name and name in terms:
            score += 90
        if name and name in lowered:
            score += 70
        file_path = Path(file_name)
        if file_path.name in terms or file_name in lowered:
            score += 85
        file_tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9]*", file_name))
        score += sum(120 for term in search_terms if term in file_tokens)
        score += sum(10 for term in terms if term in name.split("/") or term in file_name.split("/"))
        if file_name in source_matches:
            score += min(50, source_matches[file_name] * 5)
        if score:
            scored.append((score, node))
    scored.sort(key=lambda item: (-item[0], item[1].get("id", "")))
    candidates = [node for _, node in scored[:8]]
    unique = {node["id"]: node for node in candidates}
    if not candidates:
        return _insufficient_evidence()

    related: list[dict[str, Any]] = []
    for candidate in candidates:
        related.extend(_related(candidate["id"], graph_edges, nodes))
    related_map = {node["id"]: node for node in related if node["id"] not in unique}
    selected = list(unique.values()) + list(related_map.values())[:12]
    evidence = []
    for node in selected:
        item = _node_evidence(node, source_root)
        if item:
            evidence.append(item)
        if len(evidence) >= 8:
            break

    names = ", ".join(node.get("name", "<anonymous>") for node in selected[:5])
    if route_match:
        answer = f"{route_match.group(1).upper()} {route_match.group(2)} is represented by {names} in the analyzed codebase."
    else:
        files = ", ".join(dict.fromkeys(_node_file(node) for node in selected if _node_file(node)))[:500]
        answer = f"Relevant evidence points to {names}. The implementation is located in: {files}."
    if mode in {"beginner", "layman"}:
        answer += " This summary is based only on statically extracted definitions and relationships."
    elif mode == "developer":
        answer += " Follow the related nodes and source evidence below for the implementation flow."
    else:
        answer += " The graph links are direct static-analysis evidence; runtime behavior is not inferred."
    return {
        "answer": answer,
        "evidence": evidence,
        "related_nodes": [
            {"id": node["id"], "name": node.get("name"), "type": node.get("type")}
            for node in selected
        ],
        "confidence_basis": {
            "direct_graph_links": bool(sum(1 for edge in graph_edges if edge.get("source") in unique or edge.get("target") in unique)),
            "source_evidence": bool(evidence),
            "inference_used": bool(related_map),
        },
    }
