from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


IGNORED_DIRECTORIES = {
    ".cache",
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
    "target",
}
IGNORED_FILE_NAMES = {
    ".DS_Store",
    "npm-debug.log",
    "yarn-debug.log",
    "yarn-error.log",
}
SOURCE_EXTENSIONS = {".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"}
TEST_NAME_PATTERN = re.compile(
    r"(^|[._-])(test|spec)([._-]|$)", re.IGNORECASE
)
TEST_DIRECTORY_NAMES = {"__tests__", "test", "tests"}
CONFIG_FILE_NAMES = {
    ".env",
    ".env.example",
    ".env.local",
    ".env.development",
    ".env.production",
    "babel.config.js",
    "jest.config.js",
    "jest.config.ts",
    "package.json",
    "tsconfig.json",
}


class CodebaseScanner:
    """Deterministically inspect a repository without parsing its AST."""

    def __init__(self, source_path: Path | str):
        self.source_path = Path(source_path)

    def scan(self) -> dict[str, Any]:
        if not self.source_path.exists():
            return {"error": f"Path '{self.source_path}' does not exist"}
        if not self.source_path.is_dir():
            return {"error": f"Path '{self.source_path}' is not a directory"}

        files = self._files()
        ignored_paths = self._ignored_paths()
        relative_files = [self._relative_path(path) for path in files]
        source_files = [
            relative for path, relative in zip(files, relative_files)
            if self._is_source_file(path)
        ]
        test_files = [
            relative for path, relative in zip(files, relative_files)
            if self._is_test_file(path)
        ]
        extensions = sorted({path.suffix.lower() for path in files if path.suffix})
        package_info = self._read_package_json()
        package_data = package_info["data"]
        dependencies = self._dependency_map(package_data, "dependencies")
        dev_dependencies = self._dependency_map(package_data, "devDependencies")
        scripts = package_data.get("scripts", {}) if isinstance(package_data.get("scripts"), dict) else {}
        text = self._source_text(files)

        languages = self._languages(files, package_data)
        framework_evidence = self._framework_evidence(
            dependencies, dev_dependencies, text, relative_files
        )
        database_evidence = self._database_evidence(
            dependencies, dev_dependencies, text, relative_files
        )
        test_framework_evidence = self._test_framework_evidence(
            dependencies, dev_dependencies, scripts, text, relative_files
        )
        entry_points = self._entry_points(files, package_data, scripts)
        configuration_files = [
            relative for path, relative in zip(files, relative_files)
            if self._is_configuration_file(path)
        ]
        stats = {
            "total_files": len(files),
            "source_files": len(source_files),
            "test_files": len(test_files),
            "ignored_paths": len(ignored_paths),
            "approximate_lines_of_code": sum(
                self._code_lines(self.source_path / relative) for relative in source_files
            ),
        }

        result = {
            "source_path": str(self.source_path.resolve()),
            "project_metadata": self._project_metadata(package_data),
            "files": relative_files,
            "ignored_paths": ignored_paths,
            "source_files": source_files,
            "test_files": test_files,
            "file_extensions": extensions,
            "programming_languages": languages,
            "package_json": package_info["summary"],
            "dependencies": sorted(dependencies),
            "dev_dependencies": sorted(dev_dependencies),
            "npm_scripts": scripts,
            "likely_entry_points": entry_points,
            "framework_evidence": framework_evidence,
            "database_orm_evidence": database_evidence,
            "test_framework_evidence": test_framework_evidence,
            "configuration_environment_files": configuration_files,
            "statistics": stats,
            # Existing compatibility fields.
            "files_count": len(files),
            "devDependencies": sorted(dev_dependencies),
            "scripts": scripts,
            "detected_stack": self._detected_stack(
                package_data, framework_evidence, database_evidence, test_framework_evidence
            ),
        }
        return result

    def _files(self) -> list[Path]:
        return sorted(
            (
                path
                for path in self.source_path.rglob("*")
                if path.is_file()
                and not self._is_ignored_path(path)
            ),
            key=lambda path: self._relative_path(path).lower(),
        )

    def _ignored_paths(self) -> list[str]:
        return sorted(
            self._relative_path(path)
            for path in self.source_path.rglob("*")
            if self._is_ignored_path(path)
        )

    def _is_ignored_path(self, path: Path) -> bool:
        relative_parts = path.relative_to(self.source_path).parts
        return (
            any(part in IGNORED_DIRECTORIES for part in relative_parts)
            or path.name in IGNORED_FILE_NAMES
        )

    def _relative_path(self, path: Path) -> str:
        return path.relative_to(self.source_path).as_posix()

    def _read_package_json(self) -> dict[str, Any]:
        package_path = self.source_path / "package.json"
        summary = {"present": package_path.exists(), "valid": False}
        if not package_path.exists():
            return {"data": {}, "summary": summary}
        try:
            data = json.loads(package_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            summary["error"] = "malformed or unreadable package.json"
            return {"data": {}, "summary": summary}
        if not isinstance(data, dict):
            summary["error"] = "package.json must contain a JSON object"
            return {"data": {}, "summary": summary}
        summary.update({"valid": True, "name": data.get("name"), "version": data.get("version")})
        return {"data": data, "summary": summary}

    @staticmethod
    def _dependency_map(package_data: dict[str, Any], field: str) -> dict[str, Any]:
        value = package_data.get(field, {})
        return value if isinstance(value, dict) else {}

    @staticmethod
    def _project_metadata(package_data: dict[str, Any]) -> dict[str, Any]:
        return {
            key: package_data[key]
            for key in ("name", "version", "description", "private", "license")
            if key in package_data
        }

    @staticmethod
    def _languages(files: list[Path], package_data: dict[str, Any]) -> list[str]:
        languages: set[str] = set()
        for path in files:
            if path.suffix.lower() in {".js", ".jsx", ".mjs", ".cjs"}:
                languages.add("JavaScript")
            elif path.suffix.lower() in {".ts", ".tsx"}:
                languages.add("TypeScript")
        if package_data:
            languages.add("Node.js")
        return sorted(languages)

    def _source_text(self, files: list[Path]) -> str:
        chunks: list[str] = []
        for path in files:
            if path.suffix.lower() in SOURCE_EXTENSIONS:
                try:
                    chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
                except OSError:
                    continue
        return "\n".join(chunks)

    @staticmethod
    def _evidence(
        technology: str, source: str, detail: str
    ) -> dict[str, str]:
        return {"technology": technology, "source": source, "detail": detail}

    def _framework_evidence(
        self, dependencies: dict[str, Any], dev_dependencies: dict[str, Any],
        text: str, files: list[str]
    ) -> list[dict[str, str]]:
        evidence: list[dict[str, str]] = []
        if "express" in dependencies or "express" in dev_dependencies:
            evidence.append(self._evidence("Express", "package.json", "declared dependency"))
        elif re.search(r"\b(?:express|Router)\s*\(", text):
            evidence.append(self._evidence("Express", "source files", "Express API pattern"))
        return evidence

    def _database_evidence(
        self, dependencies: dict[str, Any], dev_dependencies: dict[str, Any],
        text: str, files: list[str]
    ) -> list[dict[str, str]]:
        evidence: list[dict[str, str]] = []
        if "mongoose" in dependencies or "mongoose" in dev_dependencies:
            evidence.append(self._evidence("Mongoose", "package.json", "declared dependency"))
            evidence.append(self._evidence("MongoDB", "Mongoose dependency", "MongoDB ORM evidence"))
        elif "mongodb" in dependencies or "mongodb" in dev_dependencies:
            evidence.append(self._evidence("MongoDB", "package.json", "declared dependency"))
        elif re.search(r"\b(?:mongoose|MongoClient|mongodb(?:\+srv)?://)\b", text, re.IGNORECASE):
            evidence.append(self._evidence("MongoDB", "source files", "MongoDB API or connection pattern"))
        return evidence

    def _test_framework_evidence(
        self, dependencies: dict[str, Any], dev_dependencies: dict[str, Any],
        scripts: dict[str, Any], text: str, files: list[str]
    ) -> list[dict[str, str]]:
        evidence: list[dict[str, str]] = []
        if "jest" in dependencies or "jest" in dev_dependencies:
            evidence.append(self._evidence("Jest", "package.json", "declared dependency"))
        elif "jest" in str(scripts.get("test", "")).lower() or re.search(r"\bdescribe\s*\(", text):
            evidence.append(self._evidence("Jest", "source files or npm scripts", "Jest test pattern"))
        return evidence

    def _entry_points(
        self, files: list[Path], package_data: dict[str, Any], scripts: dict[str, Any]
    ) -> list[str]:
        relative = {self._relative_path(path): path for path in files}
        candidates: list[str] = []
        main = package_data.get("main")
        if isinstance(main, str) and main in relative:
            candidates.append(main)
        for value in package_data.get("bin", {}).values() if isinstance(package_data.get("bin"), dict) else []:
            if isinstance(value, str) and value in relative:
                candidates.append(value)
        for path in files:
            name = path.name.lower()
            if name in {"server.js", "app.js", "index.js", "main.js", "server.ts", "app.ts", "index.ts", "main.ts"}:
                candidates.append(self._relative_path(path))
        for command in scripts.values():
            if isinstance(command, str):
                match = re.search(r"(?:node|tsx?|ts-node)\s+([^\s&]+)", command)
                if match and match.group(1) in relative:
                    candidates.append(match.group(1))
        return sorted(set(candidates))

    @staticmethod
    def _is_test_file(path: Path) -> bool:
        return any(part.lower() in TEST_DIRECTORY_NAMES for part in path.parts) or bool(
            TEST_NAME_PATTERN.search(path.name)
        )

    @classmethod
    def _is_source_file(cls, path: Path) -> bool:
        return (
            path.suffix.lower() in SOURCE_EXTENSIONS
            and not cls._is_test_file(path)
            and not cls._is_configuration_file(path)
        )

    @staticmethod
    def _is_configuration_file(path: Path) -> bool:
        return path.name in CONFIG_FILE_NAMES or path.name.startswith(".env.")

    @staticmethod
    def _code_lines(path: Path) -> int:
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            return 0
        return sum(1 for line in lines if line.strip() and not line.lstrip().startswith(("//", "#", "/*", "*", "*/")))

    @staticmethod
    def _detected_stack(
        package_data: dict[str, Any], framework: list[dict[str, str]],
        database: list[dict[str, str]], testing: list[dict[str, str]]
    ) -> dict[str, str]:
        return {
            "runtime": "Node.js" if package_data else "Unknown",
            "framework": framework[0]["technology"] if framework else "Unknown",
            "orm": next((item["technology"] for item in database if item["technology"] == "Mongoose"), "Unknown"),
            "database": next((item["technology"] for item in database if item["technology"] == "MongoDB"), "Unknown"),
            "testing": testing[0]["technology"] if testing else "Unknown",
        }
