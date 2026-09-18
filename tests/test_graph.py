import json

from archaeologist.ast_parser import JavaScriptAstParser
from archaeologist.graph import KnowledgeGraphBuilder
from archaeologist.scanner import CodebaseScanner


def test_builds_deterministic_codebase_graph(tmp_path):
    (tmp_path / "controllers").mkdir()
    (tmp_path / "models").mkdir()
    (tmp_path / "package.json").write_text(
        json.dumps({"dependencies": {"express": "^4.0.0", "mongoose": "^8.0.0"}}),
        encoding="utf-8",
    )
    (tmp_path / "app.js").write_text(
        'const express = require("express");\n'
        'const { createOrder } = require("./controllers/orders");\n'
        'const app = express();\n'
        'app.post("/orders", createOrder);\n',
        encoding="utf-8",
    )
    (tmp_path / "controllers" / "orders.js").write_text(
        'const Order = require("../models/order");\n'
        'function createOrder(input) { return saveOrder(input); }\n'
        'module.exports = { createOrder };\n',
        encoding="utf-8",
    )
    (tmp_path / "models" / "order.js").write_text(
        'const mongoose = require("mongoose");\n'
        'const Order = mongoose.model("Order", {});\n',
        encoding="utf-8",
    )

    scanner_result = CodebaseScanner(tmp_path).scan()
    parses = JavaScriptAstParser().parse_directory(tmp_path)
    builder = KnowledgeGraphBuilder().build_from_repository(
        tmp_path, scanner_result, parses
    )

    types = builder.statistics()["node_types"]
    edges = builder.statistics()["edge_types"]
    assert types["repository"] == 1
    assert types["file"] == 4
    assert types["function"] == 1
    assert types["route"] == 1
    assert types["external_dependency"] == 2
    assert types["model"] == 1
    assert edges["CONTAINS"] >= 4
    assert edges["DEFINES"] >= 1
    assert edges["DECLARES_ROUTE"] == 1
    assert edges["HANDLED_BY"] == 1
    assert edges["IMPORTS"] >= 2
    assert edges["USES"] >= 1
    assert edges["EXPORTS"] == 1

    route = builder.get_nodes("route")[0]
    handler = builder.get_neighbors(route["id"], "HANDLED_BY")
    assert handler[0]["name"] == "createOrder"
    assert builder.to_dict()["statistics"] == builder.statistics()


def test_graph_queries_and_empty_repository(tmp_path):
    builder = KnowledgeGraphBuilder().build_from_repository(tmp_path)

    assert builder.statistics()["node_types"] == {"repository": 1}
    assert builder.statistics()["edge_count"] == 0
    assert builder.to_react_flow()["nodes"][0]["type"] == "repositoryNode"
    assert builder.find_dependencies("missing") == []
    assert builder.find_dependents("missing") == []
