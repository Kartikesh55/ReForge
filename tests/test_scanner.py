import json

from archaeologist.scanner import CodebaseScanner


def create_repository(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "lib").mkdir()
    (tmp_path / "tests").mkdir()
    (tmp_path / "node_modules" / "ignored").mkdir(parents=True)
    (tmp_path / ".git" / "objects").mkdir(parents=True)
    (tmp_path / "package.json").write_text(
        json.dumps(
            {
                "name": "task-api",
                "version": "1.0.0",
                "main": "src/server.js",
                "scripts": {"start": "node src/server.js", "test": "jest"},
                "dependencies": {
                    "express": "^4.0.0",
                    "mongoose": "^8.0.0",
                },
                "devDependencies": {"jest": "^29.0.0"},
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "src" / "server.js").write_text(
        "const express = require('express');\nconst mongoose = require('mongoose');\n",
        encoding="utf-8",
    )
    (tmp_path / "src" / "task.ts").write_text("export const task = true;\n", encoding="utf-8")
    (tmp_path / "lib" / "utils.js").write_text("export const ok = true;\n", encoding="utf-8")
    (tmp_path / "tests" / "task.test.js").write_text("describe('task', () => {});\n", encoding="utf-8")
    (tmp_path / ".env.example").write_text("PORT=3000\n", encoding="utf-8")
    (tmp_path / "tsconfig.json").write_text("{}", encoding="utf-8")
    (tmp_path / "jest.config.js").write_text("module.exports = {};\n", encoding="utf-8")
    (tmp_path / "node_modules" / "ignored" / "package.js").write_text("ignored\n", encoding="utf-8")
    (tmp_path / ".git" / "objects" / "ignored.js").write_text("ignored\n", encoding="utf-8")
    return tmp_path


def test_scans_node_repository(tmp_path):
    result = CodebaseScanner(create_repository(tmp_path)).scan()

    assert result["project_metadata"]["name"] == "task-api"
    assert "package.json" in result["files"]
    assert "src/server.js" in result["source_files"]
    assert "src/task.ts" in result["source_files"]
    assert "lib/utils.js" in result["source_files"]
    assert result["test_files"] == ["tests/task.test.js"]
    assert "node_modules/ignored/package.js" not in result["files"]
    assert ".git/objects/ignored.js" not in result["files"]
    assert "node_modules" in result["ignored_paths"]
    assert ".git" in result["ignored_paths"]
    assert result["dependencies"] == ["express", "mongoose"]
    assert result["dev_dependencies"] == ["jest"]
    assert result["npm_scripts"]["test"] == "jest"
    assert result["likely_entry_points"] == ["src/server.js"]
    assert {".env.example", "tsconfig.json", "jest.config.js", "package.json"} == set(
        result["configuration_environment_files"]
    )
    assert {".example", ".js", ".json", ".ts"} == set(result["file_extensions"])
    assert result["programming_languages"] == ["JavaScript", "Node.js", "TypeScript"]
    assert {"technology": "Express", "source": "package.json", "detail": "declared dependency"} in result["framework_evidence"]
    assert {item["technology"] for item in result["database_orm_evidence"]} == {"MongoDB", "Mongoose"}
    assert result["test_framework_evidence"][0]["technology"] == "Jest"
    assert result["statistics"]["total_files"] == 8
    assert result["statistics"]["source_files"] == 3
    assert result["statistics"]["test_files"] == 1
    assert result["statistics"]["ignored_paths"] == 6
    assert result["statistics"]["approximate_lines_of_code"] == 4


def test_missing_package_json_is_handled(tmp_path):
    (tmp_path / "index.js").write_text("console.log('ok');\n", encoding="utf-8")

    result = CodebaseScanner(tmp_path).scan()

    assert result["package_json"] == {"present": False, "valid": False}
    assert result["dependencies"] == []
    assert result["programming_languages"] == ["JavaScript"]
    assert result["framework_evidence"] == []
    assert result["statistics"]["total_files"] == 1


def test_source_and_test_patterns_are_classified(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "feature.spec.ts").write_text("export const spec = true;\n", encoding="utf-8")
    (tmp_path / "src" / "feature.tsx").write_text("export const view = true;\n", encoding="utf-8")
    (tmp_path / "__tests__").mkdir()
    (tmp_path / "__tests__" / "feature.test.ts").write_text("test('feature', () => {});\n", encoding="utf-8")

    result = CodebaseScanner(tmp_path).scan()

    assert result["source_files"] == ["src/feature.tsx"]
    assert set(result["test_files"]) == {"src/feature.spec.ts", "__tests__/feature.test.ts"}
    assert result["programming_languages"] == ["TypeScript"]


def test_source_evidence_detects_mongodb_without_package_json(tmp_path):
    (tmp_path / "server.js").write_text(
        "const { MongoClient } = require('mongodb');\n"
        "const uri = 'mongodb://localhost:27017/tasks';\n",
        encoding="utf-8",
    )

    result = CodebaseScanner(tmp_path).scan()

    assert result["database_orm_evidence"] == [
        {
            "technology": "MongoDB",
            "source": "source files",
            "detail": "MongoDB API or connection pattern",
        }
    ]


def test_malformed_package_json_is_handled(tmp_path):
    (tmp_path / "package.json").write_text("{not json", encoding="utf-8")

    result = CodebaseScanner(tmp_path).scan()

    assert result["package_json"]["present"] is True
    assert result["package_json"]["valid"] is False
    assert "error" in result["package_json"]
    assert result["dependencies"] == []
