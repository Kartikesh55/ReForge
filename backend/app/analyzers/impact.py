import networkx as nx
from typing import Dict, List, Any, Optional

def analyze_impact(
    component_id: str, 
    graph_dict: Dict[str, Any], 
    parsed_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes the blast radius for a given component strictly from the project's
    actual architecture graph and parsed symbols:
    - Direct dependents (who calls it)
    - Transitive blast radius (upstream & downstream nodes)
    - Affected APIs / Routes
    - Affected test suites
    - Deterministic risk rating (High, Medium, Low)
    """
    G: Optional[nx.DiGraph] = graph_dict.get("graph")
    if not G:
        # Reconstruct graph from nodes and edges
        G = nx.DiGraph()
        for n in graph_dict.get("nodes", []):
            node_data = n.get("data", {})
            G.add_node(n["id"], label=node_data.get("label", n["id"]), type=node_data.get("type", "generic"), file=node_data.get("file", ""))
        for e in graph_dict.get("edges", []):
            G.add_edge(e["source"], e["target"])

    # Locate target node in graph by ID or Label
    target_node = None
    if G.has_node(component_id):
        target_node = component_id
    else:
        for node, data in G.nodes(data=True):
            label = data.get("label", "")
            if component_id.lower() == node.lower() or component_id.lower() == label.lower():
                target_node = node
                break
        if not target_node:
            for node, data in G.nodes(data=True):
                label = data.get("label", "")
                if component_id.lower() in node.lower() or component_id.lower() in label.lower():
                    target_node = node
                    break

    if not target_node:
        return {
            "component": component_id,
            "component_id": component_id,
            "error": f"Component '{component_id}' not found in architecture graph",
            "direct_dependents": [],
            "downstream_dependencies": [],
            "affected_apis": [],
            "affected_tests": [],
            "risk": "Low",
            "risk_reason": "Component is standalone or isolated with zero registered dependencies.",
            "blast_radius_count": 0
        }

    target_data = G.nodes[target_node]

    # Upstream dependents: nodes that have paths leading into target_node
    upstream_nodes = set()
    try:
        upstream_nodes = set(nx.ancestors(G, target_node))
    except Exception:
        pass

    # Direct predecessors (immediate callers)
    direct_dependents = list(G.predecessors(target_node))

    # Downstream dependencies: nodes that target_node calls or uses
    downstream_nodes = set()
    try:
        downstream_nodes = set(nx.descendants(G, target_node))
    except Exception:
        pass

    # Categorize affected endpoints and tests
    affected_apis = []
    affected_tests = []
    direct_dep_labels = []

    for dep in direct_dependents:
        d_data = G.nodes[dep]
        direct_dep_labels.append(d_data.get("label", dep))

    # Identify routes affected in upstream path or target itself
    for node in upstream_nodes | {target_node}:
        node_data = G.nodes[node]
        ntype = node_data.get("type", "")
        label = node_data.get("label", node)
        if ntype == "route" or "route_" in node:
            if label not in affected_apis:
                affected_apis.append(label)

    # Identify tests affected in downstream or upstream paths
    for node in upstream_nodes | downstream_nodes | {target_node}:
        node_data = G.nodes[node]
        ntype = node_data.get("type", "")
        label = node_data.get("label", node)
        if ntype == "test" or "test_" in node:
            if label not in affected_tests:
                affected_tests.append(label)

    # Check tests in parsed_data for matching file or symbol name
    clean_target = target_node.replace("ctrl_", "").replace("svc_", "").replace("model_", "").lower()
    for t in parsed_data.get("tests", []):
        t_file = (t.get("file") or "").lower()
        t_name = t.get("name") or t.get("id") or ""
        if clean_target and (clean_target in t_file or clean_target in t_name.lower()):
            if t_name not in affected_tests:
                affected_tests.append(t_name)

    # Downstream dependency labels
    downstream_labels = [G.nodes[n].get("label", n) for n in downstream_nodes]

    # Deterministic Risk Rating
    blast_radius_count = len(upstream_nodes) + len(downstream_nodes)
    comp_type = target_data.get("type", "service")

    if blast_radius_count >= 3 or len(affected_apis) >= 2 or comp_type in ("database", "model"):
        risk = "High"
        reason = f"High architectural blast radius: impacts {len(affected_apis)} route(s), {len(affected_tests)} test suite(s), and {len(direct_dependents)} direct dependent caller(s)."
    elif blast_radius_count >= 1 or len(affected_apis) >= 1 or len(affected_tests) >= 1:
        risk = "Medium"
        reason = f"Moderate blast radius: impacts {len(affected_apis)} endpoint(s) and {len(affected_tests)} test suite(s)."
    else:
        risk = "Low"
        reason = "Isolated component with limited direct callers in the system."

    return {
        "component": target_data.get("label", target_node),
        "component_id": target_node,
        "type": comp_type,
        "file": target_data.get("file", ""),
        "direct_dependents": direct_dep_labels,
        "downstream_dependencies": downstream_labels,
        "affected_apis": affected_apis,
        "affected_tests": affected_tests,
        "blast_radius_count": max(blast_radius_count, len(direct_dependents) + len(affected_apis)),
        "risk": risk,
        "risk_reason": reason
    }
