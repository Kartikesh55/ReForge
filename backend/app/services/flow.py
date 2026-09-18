from __future__ import annotations

import re
from collections import deque
from pathlib import Path
from typing import Any

from backend.app.services.ask import _insufficient_evidence, _node_evidence, _question_terms

DEFAULT_MAX_DEPTH = 10
TRACE_EDGES = {"HANDLED_BY", "CALLS", "DEFINES", "USES_MODEL", "USES", "IMPORTS"}


def _matches_route(node: dict[str, Any], query: str) -> bool:
    match = re.search(r"\b(get|post|put|patch|delete)\s+(/[a-z0-9_./:{}-]+)", query.lower())
    if not match or node.get("type") != "route":
        return False
    metadata = node.get("metadata") or {}
    return (
        str(metadata.get("method", "")).lower() == match.group(1)
        and str(metadata.get("path", "")).lower() == match.group(2)
    )


def _resolve_entrypoints(query: str, nodes: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    lowered = query.lower()
    terms = _question_terms(query)
    explicit_function = re.search(r"\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)", lowered)
    file_match = re.search(r"\b([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)\b", lowered)
    scored: list[tuple[int, dict[str, Any]]] = []
    for node in nodes:
        node_type = node.get("type")
        name = str(node.get("name", "")).lower()
        score = 0
        if _matches_route(node, query):
            score += 200
        if explicit_function and node_type in {"function", "method"} and name == explicit_function.group(1):
            score += 200
        if file_match and node_type == "file":
            file_name = Path(name).name
            if name == file_match.group(1) or file_name == file_match.group(1):
                score += 200
        if name and name in terms:
            score += 100
        if name and name in lowered:
            score += 60
        if score:
            scored.append((score, node))
    scored.sort(key=lambda item: (-item[0], str(item[1].get("id", ""))))
    if not scored:
        return [], []
    best_score = scored[0][0]
    best = [node for score, node in scored if score == best_score]
    alternatives = [node for score, node in scored if score == best_score and node["id"] not in {item["id"] for item in best[:1]}]
    return best[:1], alternatives[:8]


def _step(node: dict[str, Any], source_root: Path, reason: str) -> dict[str, Any]:
    result = {
        "node_id": node["id"],
        "name": node.get("name"),
        "type": node.get("type"),
        "reason": reason,
    }
    evidence = _node_evidence(node, source_root)
    if evidence:
        result.update({
            "file": evidence["file"],
            "start_line": evidence["start_line"],
            "end_line": evidence["end_line"],
        })
    return result


def trace_project(project: dict[str, Any], query: str, max_depth: int = DEFAULT_MAX_DEPTH) -> dict[str, Any]:
    query = query.strip()
    if not query:
        raise ValueError("Trace query must not be empty.")
    if max_depth < 1 or max_depth > 50:
        raise ValueError("max_depth must be between 1 and 50.")

    from backend.app.services.analysis import load_analysis

    analysis = load_analysis(project)
    if analysis is None:
        raise RuntimeError("Project has not been analyzed yet.")
    graph = analysis.get("graph", {})
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    entrypoints, alternatives = _resolve_entrypoints(query, nodes)
    if not entrypoints:
        raise LookupError("No matching static flow entry point was found.")

    by_id = {node["id"]: node for node in nodes}
    source_root = Path(project["source_path"])
    steps: list[dict[str, Any]] = []
    trace_edges: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    visited = {entrypoints[0]["id"]}
    queue = deque([(entrypoints[0]["id"], 0, "Entry point matched the trace query.")])
    while queue and len(steps) < max_depth:
        current_id, depth, reason = queue.popleft()
        current = by_id[current_id]
        steps.append(_step(current, source_root, reason))
        if depth >= max_depth - 1:
            continue
        outgoing = [
            edge for edge in edges
            if edge.get("source") == current_id and edge.get("type") in TRACE_EDGES
        ]
        for edge in outgoing:
            target_id = edge.get("target")
            target = by_id.get(target_id)
            if target is None:
                continue
            trace_edges.append({
                "source": current_id,
                "target": target_id,
                "type": edge.get("type"),
            })
            target_type = target.get("type")
            if target_type == "unresolved_call":
                unresolved.append({
                    "node_id": target_id,
                    "name": target.get("name"),
                    "type": "unresolved_dynamic_call",
                    "reason": "Static analysis could not resolve this call target.",
                })
                continue
            if target_id not in visited:
                visited.add(target_id)
                queue.append((
                    target_id,
                    depth + 1,
                    f"Connected by {edge.get('type')} from {current.get('name')}.",
                ))

    evidence = [
        {
            "node_id": item["node_id"],
            "file": item["file"],
            "start_line": item["start_line"],
            "end_line": item["end_line"],
            "reason": item["reason"],
        }
        for item in steps
        if item.get("file")
    ]
    return {
        "query": query,
        "entrypoint": _step(entrypoints[0], source_root, "Resolved static trace entry point."),
        "alternatives": [
            _step(node, source_root, "Alternative matching entry point.")
            for node in alternatives
        ],
        "steps": steps,
        "edges": trace_edges,
        "unresolved": unresolved,
        "evidence": evidence,
        "trace_type": "static",
        "max_depth": max_depth,
    }
