# ReForge Implementation Status

**Inventory date:** 2026-09-18

## Scope and method

This inventory compares the checked-in files under `archaeologist/`, `backend/`, `mcp/`, and `migration/` with the requirements described in `ARCHITECTURE.md`, `AGENT_DESIGN.md`, `API_SPEC.md`, `DATA_MODEL.md`, `DEVELOPMENT_PLAN.md`, `PROJECT_STRUCTURE.md`, and `MCP_TOOLS.md`.

Only behavior visible in the current source was counted as implemented. Specification examples, function names, docstrings, and placeholder return values were not treated as completed functionality.

## Verification performed

- `python -m compileall -q archaeologist backend mcp migration`: passed.
- FastAPI application import: passed; the application exposes 7 routes.
- Core module imports for the scanner, graph builder, migration planner, synthesizer, and MCP server: passed.
- No test files, test configuration, dependency manifest, packaging configuration, frontend package, or sample application were found in the repository tree.

## Implemented or partially functional

### FastAPI application

- `backend/app/main.py` creates the FastAPI application, configures CORS, mounts the health and API routers, and exposes root metadata.
- `backend/app/api/health.py` provides health responses at the root `/health` route and, through the top-level API router, `/api/health`.
- `backend/app/api/projects.py` provides project creation, listing, retrieval, and deletion under `/api/projects`.
- Project metadata is stored as JSON in `projects/{project_id}/meta.json`, with an in-memory cache loaded at startup and during relevant reads.
- Project creation creates empty source and target directories.
- The project API is not the documented complete API: listing returns an array rather than the documented `{ "projects": [...] }` envelope, and the project detail response does not include pipeline phase or analysis metrics.
- Persistence is file-based and in-memory. The documented SQLite/SQLAlchemy relational store is not present.

### Event bus

- `backend/app/core/events.py` contains an in-memory asynchronous publish/subscribe queue.
- There is no WebSocket connection manager or API integration consuming this event bus.

### Agent state and orchestration

- `backend/agents/state.py` defines the documented pipeline phases, execution modes, and most fields of `ReForgeState`.
- `backend/agents/graph.py` builds the expected high-level LangGraph sequence and repair-loop topology.
- The registered nodes only append audit messages and update small pieces of state. They do not invoke archaeology, flow tracing, TAM extraction, code generation, compilation, behavioral verification, or repair tools.
- The compile node unconditionally reports success, and the verifier unconditionally reports a 100.0 parity score. These are placeholder values, not verification evidence.
- Approval is represented only by a state check. There is no approval endpoint, persistence, interrupt/resume mechanism, or plan review UI.

### Archaeologist package

- `archaeologist/scanner.py` recursively lists files, reads `package.json` when available, reports dependency and script names, and heuristically detects Node.js, Express, Mongoose, and Jest.
- The scanner returns an error object for a missing root path, caps the returned file list at 50 entries, and silently ignores JSON parsing and filesystem-read exceptions.
- `archaeologist/graph.py` provides a NetworkX directed graph wrapper, stores node/edge metadata and evidence fields, and serializes the graph to a basic React Flow-shaped structure.
- Graph layout is index-based. Tree-sitter AST extraction, evidence validation, route-to-database flow tracing, Git mining, and graph persistence are not connected.

### Migration package

- `migration/planner.py` returns a fixed seven-task plan with generated plan IDs and an awaiting-approval status.
- The planner accepts a TAM-like object but does not inspect or validate it, derive tasks from entities/endpoints, or validate the dependency graph.
- `migration/synthesizer.py` returns a hard-coded completed result for any task and does not write target files or generate Java/Spring Boot code.

### MCP server

- `mcp/reforge_server.py` registers the named MCP tool surface described in `MCP_TOOLS.md`.
- The tools return skeleton responses. Repository reads, AST extraction/parsing, Git analysis, graph queries, target scaffolding, file writes, patches, compilation, runtime management, and behavioral comparison do not perform their documented operations.
- The MCP layer does not currently enforce the specified project filesystem sandbox, command allowlist, syntax validation, evidence requirements, runtime execution, secret redaction, or behavioral comparison.

## Not present or not implemented

The following specification areas are absent from the checked-in tree:

- React/Vite frontend, graph explorer, Monaco diff viewer, dashboard, chat, and WebSocket client.
- SQLAlchemy async models, SQLite database initialization, migrations, and records for projects, analyses, TAM specifications, plans, verification runs, and repairs.
- Tree-sitter JavaScript/TypeScript and Java parsers.
- PyDriller history mining, churn analysis, and hotspot calculation.
- Evidence-grounded TAM schemas, extraction, and semantic validation.
- Dedicated archaeology, flow tracer, architect, engineer, verifier, and debugger agent modules.
- Target Spring Boot scaffolding/templates and Java code generators.
- Maven compilation and structured compiler diagnostic parsing.
- Docker and local subprocess runtime managers.
- HTTP replay, response normalization, behavioral diffing, parity reports, and repair iterations.
- REST endpoints for upload, clone, analysis, graph, hotspots, TAM, flow tracing, chat, migration planning/approval/execution, verification, repair, and WebSocket streaming.
- Tests, dependency manifests, packaging configuration, Docker configuration, scripts, sample applications, and frontend assets.

## Current assessment

ReForge currently provides an importable FastAPI shell, basic JSON-backed project CRUD, an in-memory event bus, a LangGraph topology, a basic repository scanner, a NetworkX wrapper, a fixed migration-plan skeleton, and MCP tool registration.

The core autonomous migration behavior described by the specifications is not implemented. In particular, placeholder paths currently report successful extraction, compilation, verification, patching, or migration completion without performing those operations. Those values must not be used as evidence that the corresponding capability is complete.

No implementation code was changed for this inventory; only this status document was created or refreshed.
