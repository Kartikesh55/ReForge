import networkx as nx
from typing import Dict, List, Any

def build_architecture_graph(parsed_data: Dict[str, Any], project_name: str = "Application") -> Dict[str, Any]:
    """
    Constructs a NetworkX directed architecture graph and computes clean
    hierarchical coordinates (x, y) formatted for React Flow custom nodes.
    Columns are separated into strict architectural tiers:
    - Col 0 (x=40): Inbound API Routes
    - Col 1 (x=330): Controllers & Endpoint Handlers
    - Col 2 (x=620): Domain Services & Business Logic
    - Col 3 (x=910): Data Models, Schemas & Repositories
    - Col 4 (x=1200): Database Storage
    - Col 2/3 Lower: Automated Test Suites
    """
    G = nx.DiGraph()

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    routes = parsed_data.get("routes", [])
    controllers = parsed_data.get("controllers", [])
    services = parsed_data.get("services", [])
    models = parsed_data.get("models", [])
    repositories = parsed_data.get("repositories", [])
    middleware = parsed_data.get("middleware", [])
    tests = parsed_data.get("tests", [])

    y_spacing = 110
    col_w = 290

    # 1. Routes (Col 0)
    for i, r in enumerate(routes):
        node_id = r["id"]
        label = f"{r['method']} {r['path']}"
        G.add_node(node_id, label=label, type="route", file=r.get("file"))
        nodes.append({
            "id": node_id,
            "type": "customRoute",
            "data": {
                "label": label,
                "type": "route",
                "method": r["method"],
                "path": r["path"],
                "file": r.get("file")
            },
            "position": {"x": 40, "y": 60 + i * y_spacing}
        })

    # 2. Controllers / Handlers (Col 1)
    for i, c in enumerate(controllers):
        node_id = c["id"]
        G.add_node(node_id, label=c["name"], type="controller", file=c.get("file"))
        nodes.append({
            "id": node_id,
            "type": "customController",
            "data": {
                "label": c["name"],
                "type": "controller",
                "methods": c.get("methods", []),
                "file": c.get("file")
            },
            "position": {"x": 40 + col_w, "y": 60 + i * 140}
        })

    # 3. Services (Col 2)
    for i, s in enumerate(services):
        node_id = s["id"]
        G.add_node(node_id, label=s["name"], type="service", file=s.get("file"))
        nodes.append({
            "id": node_id,
            "type": "customService",
            "data": {
                "label": s["name"],
                "type": "service",
                "methods": s.get("methods", []),
                "file": s.get("file")
            },
            "position": {"x": 40 + 2 * col_w, "y": 60 + i * 140}
        })

    # 4. Repositories & Models (Col 3)
    data_nodes = []
    for r in repositories:
        data_nodes.append((r["id"], r["name"], "repository", r.get("file"), []))
    for m in models:
        data_nodes.append((m["id"], m["name"], "model", m.get("file"), m.get("fields", [])))

    for i, item in enumerate(data_nodes):
        nid, name, ntype, file, fields = item
        G.add_node(nid, label=name, type=ntype, file=file)
        nodes.append({
            "id": nid,
            "type": "customModel",
            "data": {
                "label": name,
                "type": ntype,
                "fields": fields,
                "file": file
            },
            "position": {"x": 40 + 3 * col_w, "y": 60 + i * 120}
        })

    # 5. Database (Col 4)
    db_id = "db_main"
    G.add_node(db_id, label="Primary Database", type="database")
    nodes.append({
        "id": db_id,
        "type": "customDatabase",
        "data": {
            "label": "Primary Database",
            "type": "database",
            "engine": "PostgreSQL / SQLite / MongoDB"
        },
        "position": {"x": 40 + 4 * col_w, "y": 140}
    })

    # 6. Tests (Lower Col 2)
    max_svc_y = 60 + max(len(services), 1) * 140 + 40
    for i, t in enumerate(tests):
        node_id = t["id"]
        G.add_node(node_id, label=t["name"], type="test", file=t.get("file"))
        nodes.append({
            "id": node_id,
            "type": "customTest",
            "data": {
                "label": t["name"],
                "type": "test",
                "cases": t.get("cases", []),
                "file": t.get("file")
            },
            "position": {"x": 40 + 2 * col_w, "y": max_svc_y + i * 100}
        })

    # Connect Edges
    edge_idx = 0
    seen_edges = set()
    for rel in parsed_data.get("relationships", []):
        src = rel["source"]
        tgt = rel["target"]

        if not G.has_node(src):
            G.add_node(src, label=src, type="generic")
            nodes.append({
                "id": src, "type": "default", "data": {"label": src, "type": "generic"},
                "position": {"x": 40, "y": 60 + len(nodes) * 30}
            })
        if not G.has_node(tgt):
            G.add_node(tgt, label=tgt, type="generic")
            nodes.append({
                "id": tgt, "type": "default", "data": {"label": tgt, "type": "generic"},
                "position": {"x": 40 + 2 * col_w, "y": 60 + len(nodes) * 30}
            })

        edge_key = f"{src}->{tgt}"
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            G.add_edge(src, tgt, type=rel.get("type", "calls"), label=rel.get("label", ""))
            edges.append({
                "id": f"e_{edge_idx}",
                "source": src,
                "target": tgt,
                "type": "smoothstep",
                "animated": rel.get("type") in ("calls", "queries"),
                "label": rel.get("label", ""),
                "data": {
                    "edge_type": rel.get("type", "calls")
                }
            })
            edge_idx += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "graph": G
    }
