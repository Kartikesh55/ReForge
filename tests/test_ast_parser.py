from archaeologist.ast_parser import JavaScriptAstParser


def test_extracts_javascript_structure_and_locations(tmp_path):
    source = """\
const express = require("express");
const app = express();

function createUser(name) {
  return { name };
}

app.post("/users", createUser);

module.exports = { createUser };
"""
    path = tmp_path / "app.js"
    path.write_text(source, encoding="utf-8")

    result = JavaScriptAstParser().parse_file(path, "app.js")

    assert result.language == "javascript"
    assert result.parse_error is None
    assert [(item.name, item.parameters) for item in result.functions] == [
        ("createUser", ["name"])
    ]
    assert result.functions[0].location == result.functions[0].location.__class__(
        "app.js", 4, 6
    )
    assert result.variables[0].name == "express"
    assert any(call.called_name == "require" for call in result.calls)
    assert result.routes[0].method == "POST"
    assert result.routes[0].path == "/users"
    assert result.routes[0].location.start_line == 8
    assert result.exports[0].name == "createUser"


def test_extracts_typescript_import_class_method_and_export(tmp_path):
    source = """\
import { helper } from "./helper";

interface User {
  name: string;
}

export class UserService {
  create(name: string) {
    return helper(name);
  }
}

export function loadUser(id: string) {
  return helper(id);
}
"""
    path = tmp_path / "service.ts"
    path.write_text(source, encoding="utf-8")

    result = JavaScriptAstParser().parse_file(path, "service.ts")

    assert result.language == "typescript"
    assert result.parse_error is None
    assert result.imports[0].module == "./helper"
    assert result.classes[0].name == "UserService"
    assert result.methods[0].name == "create"
    assert result.methods[0].containing_class == "UserService"
    assert result.methods[0].location.start_line == 8
    assert any(item.name == "loadUser" for item in result.functions)
    assert any(item.name == "UserService" for item in result.exports)
    assert any(item.name == "loadUser" for item in result.exports)
    assert any(call.called_name == "helper" and call.caller == "create" for call in result.calls)


def test_extracts_middleware_and_mongoose_evidence():
    source = """\
const mongoose = require("mongoose");
const User = mongoose.model("User", schema);
app.use(auth);
"""

    result = JavaScriptAstParser().parse_source(source, "models.js")

    assert result.middleware[0].name == "auth"
    assert result.middleware[0].receiver == "app"
    assert result.database_evidence[0].technology == "Mongoose"
    assert result.database_evidence[0].symbol == "mongoose"


def test_malformed_and_empty_sources_return_structured_results():
    parser = JavaScriptAstParser()

    malformed = parser.parse_source("function broken( {", "broken.js")
    empty = parser.parse_source("", "empty.js")

    assert malformed.parse_error == "syntax errors detected"
    assert malformed.file == "broken.js"
    assert empty.parse_error is None
    assert empty.functions == []


def test_unsupported_files_are_skipped_cleanly(tmp_path):
    path = tmp_path / "notes.py"
    path.write_text("def ignored(): pass\n", encoding="utf-8")

    result = JavaScriptAstParser().parse_file(path, "notes.py")

    assert result.language is None
    assert result.parse_error == "unsupported file type"
