from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable

from tree_sitter import Language, Parser
import tree_sitter_javascript
import tree_sitter_typescript


SUPPORTED_EXTENSIONS = {
    ".cjs": "javascript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
}


@dataclass(frozen=True)
class SourceLocation:
    file: str
    start_line: int
    end_line: int


@dataclass(frozen=True)
class FunctionEntity:
    name: str | None
    parameters: list[str]
    location: SourceLocation
    kind: str = "function"


@dataclass(frozen=True)
class ClassEntity:
    name: str | None
    location: SourceLocation


@dataclass(frozen=True)
class MethodEntity:
    name: str | None
    containing_class: str | None
    parameters: list[str]
    location: SourceLocation


@dataclass(frozen=True)
class ImportEntity:
    module: str
    imported_names: list[str]
    location: SourceLocation


@dataclass(frozen=True)
class ExportEntity:
    name: str | None
    export_kind: str
    location: SourceLocation


@dataclass(frozen=True)
class CallEntity:
    caller: str | None
    called_name: str
    location: SourceLocation


@dataclass(frozen=True)
class VariableEntity:
    name: str
    declaration_kind: str
    location: SourceLocation


@dataclass(frozen=True)
class RouteEntity:
    method: str
    path: str | None
    receiver: str
    location: SourceLocation
    handler: str | None = None


@dataclass(frozen=True)
class MiddlewareEntity:
    name: str | None
    receiver: str
    location: SourceLocation


@dataclass(frozen=True)
class DatabaseEvidence:
    technology: str
    symbol: str
    location: SourceLocation


@dataclass
class ParseResult:
    file: str
    language: str | None
    parse_error: str | None = None
    functions: list[FunctionEntity] = field(default_factory=list)
    classes: list[ClassEntity] = field(default_factory=list)
    methods: list[MethodEntity] = field(default_factory=list)
    imports: list[ImportEntity] = field(default_factory=list)
    exports: list[ExportEntity] = field(default_factory=list)
    calls: list[CallEntity] = field(default_factory=list)
    variables: list[VariableEntity] = field(default_factory=list)
    routes: list[RouteEntity] = field(default_factory=list)
    middleware: list[MiddlewareEntity] = field(default_factory=list)
    database_evidence: list[DatabaseEvidence] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class JavaScriptAstParser:
    """Extract deterministic structural facts from JavaScript and TypeScript."""

    def __init__(self) -> None:
        self._languages = {
            "javascript": Language(tree_sitter_javascript.language()),
            "typescript": Language(tree_sitter_typescript.language_typescript()),
            "tsx": Language(tree_sitter_typescript.language_tsx()),
        }

    def parse_file(self, path: Path | str, display_path: str | None = None) -> ParseResult:
        source_path = Path(path)
        relative_file = display_path or source_path.as_posix()
        language_name = SUPPORTED_EXTENSIONS.get(source_path.suffix.lower())
        if language_name is None:
            return ParseResult(
                file=relative_file,
                language=None,
                parse_error="unsupported file type",
            )
        try:
            source = source_path.read_bytes()
        except OSError as exc:
            return ParseResult(file=relative_file, language=language_name, parse_error=str(exc))
        return self.parse_source(source, relative_file, language_name)

    def parse_source(
        self, source: str | bytes, file: str = "<memory>", language: str = "javascript"
    ) -> ParseResult:
        if language not in self._languages:
            return ParseResult(file=file, language=None, parse_error="unsupported language")
        source_bytes = source.encode("utf-8") if isinstance(source, str) else source
        parser = Parser(self._languages[language])
        tree = parser.parse(source_bytes)
        result = ParseResult(file=file, language=language)
        if tree.root_node.has_error:
            result.parse_error = "syntax errors detected"
        self._extract(tree.root_node, source_bytes, result)
        return result

    def parse_directory(self, root: Path | str) -> list[ParseResult]:
        directory = Path(root)
        results: list[ParseResult] = []
        ignored = {".git", "node_modules", "build", "dist", "coverage", "target"}
        for path in sorted(directory.rglob("*")):
            if path.is_file() and not any(part in ignored for part in path.relative_to(directory).parts):
                if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    results.append(self.parse_file(path, path.relative_to(directory).as_posix()))
        return results

    def _extract(self, root: Any, source: bytes, result: ParseResult) -> None:
        def visit(node: Any, function_name: str | None = None, class_name: str | None = None) -> None:
            current_function = function_name
            current_class = class_name
            node_type = node.type
            if node_type in {"function_declaration", "generator_function_declaration"}:
                name = self._field_text(node, "name", source)
                result.functions.append(
                    FunctionEntity(name, self._parameters(node, source), self._location(node, result.file))
                )
                current_function = name
            elif node_type in {"function", "arrow_function", "function_expression"}:
                name = self._field_text(node, "name", source)
                result.functions.append(
                    FunctionEntity(name, self._parameters(node, source), self._location(node, result.file))
                )
                current_function = name
            elif node_type == "class_declaration":
                name = self._field_text(node, "name", source)
                result.classes.append(ClassEntity(name, self._location(node, result.file)))
                current_class = name
            elif node_type in {"method_definition", "method_signature"}:
                name_node = node.child_by_field_name("name")
                name = self._text(name_node, source) if name_node else None
                result.methods.append(
                    MethodEntity(
                        name,
                        current_class,
                        self._parameters(node, source),
                        self._location(node, result.file),
                    )
                )
                current_function = name
            elif node_type in {"import_statement", "import_declaration"}:
                result.imports.append(self._import_entity(node, source, result.file))
            elif node_type in {"export_statement", "export_declaration"}:
                result.exports.extend(self._export_entities(node, source, result.file))
            elif node_type == "assignment_expression":
                result.exports.extend(self._commonjs_exports(node, source, result.file))
            elif node_type == "call_expression":
                function_node = node.child_by_field_name("function")
                called_name = self._call_name(function_node, source)
                if called_name:
                    result.calls.append(
                        CallEntity(current_function, called_name, self._location(node, result.file))
                    )
                    if called_name == "require":
                        arguments = node.child_by_field_name("arguments")
                        argument = arguments.named_children[0] if arguments and arguments.named_children else None
                        if argument and argument.type in {"string", "string_fragment"}:
                            result.imports.append(
                                ImportEntity(
                                    self._text(argument, source).strip("\"'"),
                                    [],
                                    self._location(node, result.file),
                                )
                            )
                    self._extract_call_evidence(node, function_node, source, result)
            elif node_type in {"lexical_declaration", "variable_declaration"}:
                self._variables(node, source, result)
            for child in node.children:
                visit(child, current_function, current_class)

        visit(root)
        result.functions = self._prefer_named_functions(result.functions)
        result.classes = self._unique(result.classes)
        result.methods = self._unique(result.methods)
        result.imports = self._unique(result.imports)
        result.exports = self._unique(result.exports)
        result.calls = self._unique(result.calls)
        result.variables = self._unique(result.variables)
        result.routes = self._unique(result.routes)
        result.middleware = self._unique(result.middleware)
        result.database_evidence = self._unique(result.database_evidence)

    @staticmethod
    def _unique(items: list[Any]) -> list[Any]:
        unique: list[Any] = []
        for item in items:
            if item not in unique:
                unique.append(item)
        return unique

    @staticmethod
    def _prefer_named_functions(items: list[FunctionEntity]) -> list[FunctionEntity]:
        named = [item for item in items if item.name is not None]
        by_location: dict[SourceLocation, FunctionEntity] = {}
        for item in items:
            if item.name is None and any(
                named_item.location.start_line <= item.location.start_line
                and named_item.location.end_line >= item.location.end_line
                for named_item in named
            ):
                continue
            current = by_location.get(item.location)
            if current is None or (current.name is None and item.name is not None):
                by_location[item.location] = item
        return list(by_location.values())

    @staticmethod
    def _text(node: Any, source: bytes) -> str:
        return source[node.start_byte:node.end_byte].decode("utf-8", errors="replace")

    def _field_text(self, node: Any, field: str, source: bytes) -> str | None:
        child = node.child_by_field_name(field)
        return self._text(child, source) if child else None

    @staticmethod
    def _location(node: Any, file: str) -> SourceLocation:
        return SourceLocation(file, node.start_point[0] + 1, node.end_point[0] + 1)

    def _parameters(self, node: Any, source: bytes) -> list[str]:
        parameters = node.child_by_field_name("parameters")
        if not parameters:
            return []
        return [self._text(child, source) for child in parameters.named_children]

    def _import_entity(self, node: Any, source: bytes, file: str) -> ImportEntity:
        module_node = node.child_by_field_name("source")
        module = self._text(module_node, source).strip("\"'") if module_node else self._text(node, source)
        names = [
            self._text(child, source)
            for child in node.named_children
            if child.type in {"import_clause", "import_specifier", "namespace_import", "named_imports"}
        ]
        return ImportEntity(module, names, self._location(node, file))

    def _export_entities(self, node: Any, source: bytes, file: str) -> list[ExportEntity]:
        declarations = [
            child for child in node.named_children
            if child.type not in {"decorator", "export_clause", "from"}
        ]
        if not declarations:
            return [ExportEntity(None, "export", self._location(node, file))]
        entities: list[ExportEntity] = []
        for declaration in declarations:
            name = self._field_text(declaration, "name", source)
            if declaration.type == "export_specifier":
                name = self._field_text(declaration, "alias", source) or self._field_text(declaration, "name", source)
            entities.append(ExportEntity(name, declaration.type, self._location(declaration, file)))
        return entities

    def _commonjs_exports(self, node: Any, source: bytes, file: str) -> list[ExportEntity]:
        left = node.child_by_field_name("left")
        right = node.child_by_field_name("right")
        if not left or not right or self._text(left, source) != "module.exports":
            return []
        if right.type == "object":
            return [
                ExportEntity(
                    self._field_text(child, "name", source) or self._text(child, source),
                    "commonjs_export",
                    self._location(child, file),
                )
                for child in right.named_children
                if child.type in {"shorthand_property_identifier", "shorthand_property_identifier_pattern"}
                or child.type == "pair"
            ]
        return [ExportEntity(self._text(right, source), "commonjs_export", self._location(node, file))]

    def _variables(self, node: Any, source: bytes, result: ParseResult) -> None:
        kind = self._text(node.children[0], source) if node.children else "variable"
        for child in node.named_children:
            if child.type != "variable_declarator":
                continue
            name = self._field_text(child, "name", source)
            if name:
                result.variables.append(VariableEntity(name, kind, self._location(child, result.file)))

    def _call_name(self, node: Any, source: bytes) -> str | None:
        if not node:
            return None
        if node.type in {"identifier", "property_identifier"}:
            return self._text(node, source)
        if node.type == "member_expression":
            property_node = node.child_by_field_name("property")
            return self._text(property_node, source) if property_node else self._text(node, source)
        return self._text(node, source)

    def _extract_call_evidence(self, node: Any, function_node: Any, source: bytes, result: ParseResult) -> None:
        if not function_node or function_node.type != "member_expression":
            return
        receiver = function_node.child_by_field_name("object")
        property_node = function_node.child_by_field_name("property")
        method = self._text(property_node, source).lower() if property_node else ""
        receiver_name = self._text(receiver, source) if receiver else ""
        arguments = node.child_by_field_name("arguments")
        if receiver_name and method in {"get", "post", "put", "patch", "delete", "use", "options", "head"}:
            args = arguments.named_children if arguments else []
            path = self._text(args[0], source).strip("\"'") if args and args[0].type in {"string", "string_fragment"} else None
            if method == "use":
                middleware_name = self._call_name(args[0], source) if args else None
                result.middleware.append(MiddlewareEntity(middleware_name, receiver_name, self._location(node, result.file)))
            elif path is not None:
                handler = self._call_name(args[1], source) if len(args) > 1 else None
                result.routes.append(RouteEntity(method.upper(), path, receiver_name, self._location(node, result.file), handler))
        if receiver_name in {"mongoose", "model"} or "mongoose" in receiver_name.lower():
            result.database_evidence.append(DatabaseEvidence("Mongoose", receiver_name, self._location(node, result.file)))
