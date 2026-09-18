from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

import networkx as nx

from archaeologist.ast_parser import ParseResult


class KnowledgeGraphBuilder:
    """Build and query a deterministic NetworkX codebase knowledge graph."""

    def __init__(self) -> None:
        self.graph = nx.MultiDiGraph()

    def add_node(
        self,
        node_id: str,
        node_type: str,
        label: str,
        metadata: dict[str, Any] | None = None,
        evidence: dict[str, Any] | None = None,
    ) -> None:
        attributes = {
            "type": node_type,
            "name": label,
            "node_type": node_type,
            "label": label,
            "metadata": metadata or {},
            "evidence": evidence or {},
        }
        self.graph.add_node(node_id, **attributes)

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        edge_type: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.graph.add_edge(
            source_id,
            target_id,
            type=edge_type,
            edge_type=edge_type,
            metadata=metadata or {},
        )

    def build_from_repository(
        self,
        repository: Path | str,
        scan_result: dict[str, Any] | None = None,
        parse_results: Iterable[ParseResult] | None = None,
    ) -> "KnowledgeGraphBuilder":
        root = Path(repository)
        if scan_result is None:
            from archaeologist.scanner import CodebaseScanner

            scan_result = CodebaseScanner(root).scan()
        if parse_results is None:
            from archaeologist.ast_parser import JavaScriptAstParser

            parse_results = JavaScriptAstParser().parse_directory(root)
        return self.build(
            repository=str(root.resolve()),
            scan_result=scan_result,
            parse_results=list(parse_results),
        )

    def build(
        self,
        repository: str,
        scan_result: dict[str, Any],
        parse_results: Iterable[ParseResult],
    ) -> "KnowledgeGraphBuilder":
        self.graph.clear()
        repository_id = self._id("repository", repository)
        self.add_node(repository_id, "repository", repository, {"path": repository})

        files_by_name: dict[str, str] = {}
        for relative_file in scan_result.get("files", []):
            file_id = self._id("file", relative_file)
            files_by_name[relative_file] = file_id
            self.add_node(
                file_id,
                "file",
                relative_file,
                {"file": relative_file},
                {"file": relative_file},
            )
            self.add_edge(repository_id, file_id, "CONTAINS")

        dependency_ids: dict[str, str] = {}
        for dependency in scan_result.get("dependencies", []) + scan_result.get("dev_dependencies", []):
            if dependency in dependency_ids:
                continue
            dependency_id = self._id("dependency", dependency)
            dependency_ids[dependency] = dependency_id
            self.add_node(dependency_id, "external_dependency", dependency, {"package": dependency})

        for result in parse_results:
            file_id = files_by_name.get(result.file)
            if file_id is None:
                continue
            self._add_parse_result(file_id, result, dependency_ids)

        self._resolve_unique_route_handlers()
        return self

    def _resolve_unique_route_handlers(self) -> None:
        functions_by_name: dict[str, list[str]] = {}
        for node_id, data in self.graph.nodes(data=True):
            if data.get("type") in {"function", "method"}:
                functions_by_name.setdefault(data.get("name", ""), []).append(node_id)
        for route_id, route_data in self.graph.nodes(data=True):
            if route_data.get("type") != "route":
                continue
            handler_name = route_data.get("metadata", {}).get("handler")
            if not handler_name or self.graph.out_degree(route_id) and any(
                any(edge.get("type") == "HANDLED_BY" for edge in self.graph.get_edge_data(route_id, target).values())
                for target in self.graph.successors(route_id)
            ):
                continue
            candidates = functions_by_name.get(handler_name, [])
            if len(candidates) == 1:
                self.add_edge(route_id, candidates[0], "HANDLED_BY", {"resolved": True})

    def _add_parse_result(
        self, file_id: str, result: ParseResult, dependency_ids: dict[str, str]
    ) -> None:
        functions: dict[str, str] = {}
        classes: dict[str, str] = {}
        methods: dict[str, str] = {}
        for entity in result.functions:
            node_id = self._entity_id("function", result.file, entity.name, entity.location.start_line)
            functions.setdefault(entity.name or "", node_id)
            self._add_entity(node_id, "function", entity.name, entity.location)
            self.add_edge(file_id, node_id, "DEFINES")
        for entity in result.classes:
            node_id = self._entity_id("class", result.file, entity.name, entity.location.start_line)
            classes.setdefault(entity.name or "", node_id)
            self._add_entity(node_id, "class", entity.name, entity.location)
            self.add_edge(file_id, node_id, "DEFINES")
        for entity in result.methods:
            node_id = self._entity_id("method", result.file, entity.name, entity.location.start_line)
            methods.setdefault(entity.name or "", node_id)
            self._add_entity(node_id, "method", entity.name, entity.location, {"class": entity.containing_class})
            self.add_edge(file_id, node_id, "DEFINES")
            class_id = classes.get(entity.containing_class or "")
            if class_id:
                self.add_edge(class_id, node_id, "CONTAINS")

        for entity in result.imports:
            module_id = self._id("module", entity.module)
            self.add_node(module_id, "module", entity.module, {"module": entity.module})
            self.add_edge(file_id, module_id, "IMPORTS")
            package = entity.module.split("/")[0] if not entity.module.startswith(".") else None
            if package in dependency_ids:
                self.add_edge(file_id, dependency_ids[package], "USES")

        for entity in result.exports:
            target_id = functions.get(entity.name or "") or classes.get(entity.name or "") or methods.get(entity.name or "")
            if target_id is None:
                target_id = self._id("export", result.file, entity.name or "anonymous", entity.location.start_line)
                self._add_entity(target_id, "export", entity.name, entity.location)
            self.add_edge(file_id, target_id, "EXPORTS")

        for entity in result.routes:
            route_name = f"{entity.method} {entity.path or '<dynamic>'}"
            route_id = self._entity_id("route", result.file, route_name, entity.location.start_line)
            self._add_entity(route_id, "route", route_name, entity.location, {
                "method": entity.method,
                "path": entity.path,
                "receiver": entity.receiver,
                "handler": entity.handler,
            })
            self.add_edge(file_id, route_id, "DECLARES_ROUTE")
            handler_id = functions.get(entity.handler or "") or methods.get(entity.handler or "")
            if handler_id:
                self.add_edge(route_id, handler_id, "HANDLED_BY")

        for entity in result.calls:
            if not entity.caller:
                continue
            caller_id = functions.get(entity.caller) or methods.get(entity.caller)
            if not caller_id:
                continue
            target_id = functions.get(entity.called_name) or methods.get(entity.called_name)
            if target_id:
                self.add_edge(caller_id, target_id, "CALLS")
            else:
                unresolved_id = self._id("unresolved_call", result.file, entity.called_name, entity.location.start_line)
                self.add_node(unresolved_id, "unresolved_call", entity.called_name, {"called_name": entity.called_name})
                self.add_edge(caller_id, unresolved_id, "CALLS", {"resolved": False})

        for entity in result.database_evidence:
            model_id = self._id("model", result.file, entity.symbol)
            self.add_node(model_id, "model", entity.symbol, {"technology": entity.technology})
            self.add_edge(file_id, model_id, "USES_MODEL")

    def _add_entity(
        self,
        node_id: str,
        node_type: str,
        name: str | None,
        location: Any,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.add_node(
            node_id,
            node_type,
            name or "<anonymous>",
            metadata or {},
            {
                "file": location.file,
                "start_line": location.start_line,
                "end_line": location.end_line,
            },
        )

    @staticmethod
    def _id(*parts: object) -> str:
        return ":".join(str(part) for part in parts)

    def _entity_id(self, node_type: str, file: str, name: str | None, line: int) -> str:
        return self._id(node_type, file, name or "anonymous", line)

    def get_nodes(self, node_type: str | None = None) -> list[dict[str, Any]]:
        return [
            {"id": node_id, **data}
            for node_id, data in self.graph.nodes(data=True)
            if node_type is None or data.get("type") == node_type
        ]

    def get_neighbors(self, node_id: str, edge_type: str | None = None) -> list[dict[str, Any]]:
        if node_id not in self.graph:
            return []
        neighbors = []
        for target in self.graph.successors(node_id):
            edges = self.graph.get_edge_data(node_id, target).values()
            if edge_type is None or any(edge.get("type") == edge_type for edge in edges):
                neighbors.append({"id": target, **self.graph.nodes[target]})
        return neighbors

    def find_dependencies(self, file_id: str) -> list[dict[str, Any]]:
        return self.get_neighbors(file_id, "USES")

    def find_dependents(self, node_id: str) -> list[dict[str, Any]]:
        return [
            {"id": source, **self.graph.nodes[source]}
            for source, _ in self.graph.in_edges(node_id)
            if any(edge.get("type") == "USES" for edge in self.graph.get_edge_data(source, node_id).values())
        ]

    def statistics(self) -> dict[str, Any]:
        node_types: dict[str, int] = {}
        edge_types: dict[str, int] = {}
        for _, data in self.graph.nodes(data=True):
            node_types[data["type"]] = node_types.get(data["type"], 0) + 1
        for _, _, data in self.graph.edges(data=True):
            edge_types[data["type"]] = edge_types.get(data["type"], 0) + 1
        return {
            "node_count": self.graph.number_of_nodes(),
            "edge_count": self.graph.number_of_edges(),
            "node_types": node_types,
            "edge_types": edge_types,
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "nodes": self.get_nodes(),
            "edges": [
                {"source": source, "target": target, **data}
                for source, target, data in self.graph.edges(data=True)
            ],
            "statistics": self.statistics(),
        }

    def to_react_flow(self) -> dict[str, Any]:
        nodes = []
        for idx, (node_id, data) in enumerate(self.graph.nodes(data=True)):
            nodes.append({
                "id": node_id,
                "type": f"{data.get('type', 'default').lower()}Node",
                "position": {"x": 150 * (idx % 4), "y": 100 * (idx // 4)},
                "data": {
                    "label": data.get("name", node_id),
                    "node_type": data.get("type"),
                    "metadata": data.get("metadata", {}),
                    "evidence": data.get("evidence", {}),
                },
            })
        edges = [
            {
                "id": f"edge_{source}_{target}",
                "source": source,
                "target": target,
                "label": data.get("type", ""),
                "animated": True,
            }
            for source, target, data in self.graph.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}
