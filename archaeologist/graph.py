import networkx as nx
from typing import Dict, Any, List

class KnowledgeGraphBuilder:
    """
    Constructs and queries the Codebase Knowledge Graph (CKG) using NetworkX.
    """
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_node(self, node_id: str, node_type: str, label: str, metadata: Dict[str, Any] | None = None, evidence: Dict[str, Any] | None = None):
        self.graph.add_node(
            node_id,
            node_type=node_type,
            label=label,
            metadata=metadata or {},
            evidence=evidence or {}
        )

    def add_edge(self, source_id: str, target_id: str, edge_type: str, metadata: Dict[str, Any] | None = None):
        self.graph.add_edge(source_id, target_id, edge_type=edge_type, metadata=metadata or {})

    def to_react_flow(self) -> Dict[str, Any]:
        """Serializes the NetworkX graph into React Flow compatible nodes and edges."""
        nodes = []
        edges = []

        for idx, (node_id, data) in enumerate(self.graph.nodes(data=True)):
            nodes.append({
                "id": node_id,
                "type": f"{data.get('node_type', 'default').lower()}Node",
                "position": {"x": 150 * (idx % 4), "y": 100 * (idx // 4)},
                "data": {
                    "label": data.get("label", node_id),
                    "node_type": data.get("node_type"),
                    "metadata": data.get("metadata", {}),
                    "evidence": data.get("evidence", {})
                }
            })

        for source, target, data in self.graph.edges(data=True):
            edges.append({
                "id": f"edge_{source}_{target}",
                "source": source,
                "target": target,
                "label": data.get("edge_type", ""),
                "animated": True
            })

        return {"nodes": nodes, "edges": edges}
