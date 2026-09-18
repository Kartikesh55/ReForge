# ReForge — Hackathon Development & Delivery Plan
## Implementation Roadmap & Milestone Strategy

---

## 1. Plan Overview & Core Principles

The development strategy follows a strict **"Vertical Slice First"** philosophy. To succeed under hackathon time constraints, we prioritize depth over breadth:
* **One Golden Path:** Node.js + Express + MongoDB + Jest $\longrightarrow$ Java 17 + Spring Boot 3 + PostgreSQL + JUnit 5.
* **Deterministic Verification:** Working software at each milestone, validated with automated tests.
* **No Blind Rewriting:** Every milestone respects the pipeline: Understand $\to$ Model $\to$ Plan $\to$ Migrate $\to$ Verify $\to$ Repair.
* **Dual-Mode Execution Resilience:** Primary Docker Compose execution with an immediate, zero-latency Local Subprocess fallback.

---

## 2. Milestone Summary Timeline

| Milestone | Focus Area | Primary Deliverables | Estimated Timeframe |
| :--- | :--- | :--- | :--- |
| **M1: Foundation & Project Scaffolding** | Workspace, Core Schemas, Project Structure | Backend FastAPI shell, Frontend Vite scaffolding, Sample source app | Hours 0 - 3 |
| **M2: The AI Archaeologist & Knowledge Graph** | Tree-sitter, PyDriller, NetworkX | Deterministic AST extractor, CKG synthesis, evidence extraction | Hours 3 - 8 |
| **M3: Archaeologist UI & Flow Tracer** | React Flow, Monaco, Flow Exploration | Visual architecture graph (Dagre layout), flow tracer, codebase Q&A | Hours 8 - 13 |
| **M4: TAM (IR) & Migration Planner** | Technology-Independent Model, DAG Planner | TAM Pydantic models, Express $\to$ Spring mapping, Migration DAG & approval | Hours 13 - 18 |
| **M5: Autonomous Migration Engine** | Target Synthesis, Spring Boot Scaffolding | Template scaffolding, JPA entity/repo/controller/handler synthesis, Maven compile | Hours 18 - 25 |
| **M6: Verification Harness & Dual-Runner** | Dual Environment, HTTP Replay Differ | Dual-mode runner (Docker/Subprocess), HTTP traffic replay, JSON diffing | Hours 25 - 31 |
| **M7: Autonomous Repair Loop** | Diagnostics, Self-Healing, LangGraph Cycle | Compiler/test error feedback loop, surgical patch applicator, direct re-verify | Hours 31 - 36 |
| **M8: End-to-End Polish & Demo Delivery** | Integrated UI flow, Walkthrough, Demo Video | Unified dashboard, EventBus live progress streaming, benchmark report | Hours 36 - 40 |

---

## 3. Detailed Milestone Breakdowns

### Milestone 1: Workspace Scaffolding & Sample Ingestion Target
* **Objective:** Establish the development environment, baseline schemas, directory structure, and a realistic, self-contained reference application.
* **Tasks:**
  1. Initialize Python virtual environment with FastAPI, Pydantic v2, SQLAlchemy (Async), LangGraph, Tree-sitter, and PyDriller.
  2. Implement in-memory `EventBus` (`asyncio.Queue`) for decoupled WebSocket streaming.
  3. Initialize Frontend Vite + React + TypeScript + Tailwind CSS project with Lucide icons and dark-mode layout shell.
  4. Create `sample_apps/source/task-api`: A complete Node.js/Express/MongoDB/Mongoose application with:
     * User registration & JWT authentication middleware.
     * Task CRUD operations (`title`, `description`, `status`, `priority`, `user`).
     * Mongoose schema validation & custom business logic.
     * Jest test suite testing endpoints via Supertest.
  5. Create `sample_apps/target_template/spring-boot-skeleton`: A clean Spring Boot 3 + Java 17 + Maven skeleton with `pom.xml` including PostgreSQL, Spring Data JPA, Spring Web, Validation, and Lombok.
* **Verification:** Run `npm test` inside `sample_apps/source/task-api` to ensure source tests pass cleanly. Ensure FastAPI starts up and returns `200 OK` on `/api/health`.

---

### Milestone 2: AI Archaeologist & Knowledge Graph Engine
* **Objective:** Implement deterministic AST parsing and Git history mining to construct the Codebase Knowledge Graph (CKG).
* **Tasks:**
  1. Implement Tree-sitter JavaScript/TypeScript parser:
     * Build bulk extraction tool `ast_extract_project_graph` to parse Express routes (`router.get`, `router.post`, etc.), Mongoose schemas (`mongoose.Schema`), middleware bindings, and controller exports in a single sub-second pass.
  2. Implement PyDriller Git analyzer:
     * Compute file churn rates, commit frequency, and identify high-complexity files.
  3. Implement NetworkX Knowledge Graph builder:
     * Create typed nodes: `ROUTE`, `MIDDLEWARE`, `CONTROLLER`, `SERVICE`, `MODEL`, `FIELD`, `CONFIG`, `TEST`.
     * Create typed edges: `HANDLES_ROUTE`, `USES_MIDDLEWARE`, `CALLS`, `USES_MODEL`, `HAS_FIELD`, `READS_CONFIG`, `TESTS`.
     * Attach strict **Evidence Provenance** (`source_file`, `start_line`, `end_line`, `symbol`, `evidence_type`).
  4. Store the serialized CKG as a complete JSON snapshot inside `analysis_runs.graph_snapshot_json`.
* **Verification:** Run unit tests asserting that `task-api` produces a graph with expected nodes (`POST /api/tasks`, `Task`, `auth`) and valid source line references.

---

### Milestone 3: Interactive Architecture Explorer & Flow Tracer
* **Objective:** Deliver the presentation layer for inspecting the repository structure, tracing execution paths, and interactive chat.
* **Tasks:**
  1. Implement React Flow canvas with Dagre hierarchical auto-layout (`Route` $\to$ `Middleware` $\to$ `Controller` $\to$ `Service` $\to$ `Model`).
     * Custom styled node components for Routes (blue), Controllers (purple), Models (green), and Database entities (amber).
     * Filterable by component type and searchable by symbol name.
  2. Implement Execution Flow Tracer:
     * Trace request path: e.g., `POST /api/tasks` $\to$ `auth` $\to$ `taskController.createTask` $\to$ `Task.save()`.
     * Highlight path on React Flow canvas with animated glowing edges.
  3. Implement Codebase Q&A Chat:
     * LangGraph-backed chat agent querying the Knowledge Graph and AST symbol index.
     * Every answer cites exact source lines and displays the snippet in Monaco Editor.
* **Verification:** Manual verification in browser: upload `task-api`, click `POST /api/tasks`, observe glowing flow trace, ask "Where is authentication enforced?" and verify source citation.

---

### Milestone 4: Technology-Independent Application Model (TAM) & Migration Planner
* **Objective:** Bridge the semantic gap by translating source AST into the TAM and formulating a topological migration plan.
* **Tasks:**
  1. Define Pydantic v2 models for TAM:
     * `DomainEntity` (fields, types: STRING, INTEGER, UUID, DATETIME, ENUM, relations, constraints).
     * `EndpointContract` (path, method, parameters, request body schema, response schemas, middleware).
  2. Build TAM Extractor:
     * Map Mongoose schemas to relational TAM domain models (handling `_id` $\to$ UUID mapping).
     * Map Express routes to RESTful TAM endpoints.
  3. Build Migration Planner Agent:
     * Generate topological migration DAG:
       1. Base Configuration (`pom.xml`, `application.yml`, `GlobalExceptionHandler.java`).
       2. Domain Entities (`User.java`, `Task.java`).
       3. Spring Data Repositories (`UserRepository.java`, `TaskRepository.java`).
       4. Service Layer (`UserService.java`, `TaskService.java`).
       5. Controller Layer (`UserController.java`, `TaskController.java`).
       6. Security Filters (`JwtAuthenticationFilter.java`).
       7. Integration Tests (`TaskControllerTest.java`).
  4. Implement Human-in-the-Loop approval endpoints (`POST /api/projects/{id}/plan/approve`).
* **Verification:** Generate TAM JSON for `task-api` and validate against JSON schema. Verify migration DAG contains no unresolved dependencies.

---

### Milestone 5: Autonomous Migration Engine & Target Synthesis
* **Objective:** Execute the migration DAG to generate a complete, idiomatic Spring Boot 3 application.
* **Tasks:**
  1. Implement Target Scaffolding via MCP tool `project_scaffold_target`:
     * Copy `sample_apps/target_template/spring-boot-skeleton` into the target workspace with pre-configured dependencies.
  2. Implement Code Synthesis using MCP tool `code_write_target_file`:
     * Synthesize JPA `@Entity` classes with Jakarta persistence annotations.
     * Synthesize Spring Data `JpaRepository` interfaces.
     * Synthesize transactional `@Service` classes implementing business logic.
     * Synthesize `@RestController` classes with `@Valid` input validation.
     * Synthesize `@RestControllerAdvice` Global Exception Handler to guarantee consistent error response payloads.
  3. Validate syntax of every generated file with `ast_parse_java`.
  4. Compile Target Project with MCP tool `build_compile_target`:
     * Invoke `./mvnw clean test-compile` inside target workspace.
     * Parse and structure any compiler diagnostics.
* **Verification:** Execute `mvn test-compile` on the generated Spring Boot project. Verify zero compiler errors.

---

### Milestone 6: Dual-Mode Behavioral Verification Harness
* **Objective:** Prove functional equivalence between Node.js and Spring Boot by executing side-by-side traffic replay.
* **Tasks:**
  1. Implement Dual-Mode Runtime Manager (`environment_manage_runtime`):
     * Primary: Docker Compose orchestrating Node/Mongo and Spring/Postgres.
     * Resilient Fallback: Local Subprocesses running Node.js on port 3000 and Spring Boot on port 8080.
  2. HTTP Replay & Behavioral Differ (`behavioral_compare_endpoints`):
     * Synthesize sequential HTTP test requests directly from TAM endpoint contracts:
       * Health check (`GET /health`).
       * User Registration & Token retrieval (`POST /api/auth/register`).
       * Authenticated Create (`POST /api/tasks`).
       * Query All (`GET /api/tasks`).
       * Update Status (`PUT /api/tasks/{id}`).
       * Validation Rejection (`POST /api/tasks` with invalid payload).
  3. Diff Engine:
     * Strict comparison of HTTP Status Codes.
     * Normalized JSON response body comparison (ignoring dynamic timestamp formatting and database ID representations via semantic normalizers).
* **Verification:** Run replay harness across both environments and produce an automated Behavioral Parity Matrix report.

---

### Milestone 7: Autonomous Self-Healing & Direct Repair Loop
* **Objective:** Diagnose and automatically repair discrepancies detected by the compiler or behavioral differ.
* **Tasks:**
  1. Implement Direct LangGraph Repair Cycle:
     * Node: `DebuggerNode`.
     * Receives structured compiler diagnostics or HTTP response diffs.
     * Formulates root-cause hypothesis and identifies target file/lines.
     * Invokes MCP tool `code_patch_target_file` to apply surgical patch.
     * **Crucial Transition:** Routes directly to `CompileCheckNode` to verify the fix immediately (not re-generating the whole project).
  2. Guardrails:
     * Hard cap at 3 repair iterations. If unresolved, escalate with diagnostic report.
* **Verification:** Inject an intentional validation bug into the generated Spring controller, run verification, and observe the Debugger Agent apply a surgical patch that brings parity to 100%.

---

### Milestone 8: Full Web Dashboard & Hackathon Polish
* **Objective:** Unify all components into a polished web dashboard with real-time feedback.
* **Tasks:**
  1. Connect WebSocket event stream to UI via `EventBus`:
     * Progress bar across the 6 pipeline phases.
     * Live streaming agent logs, terminal output, and tool invocations.
     * Interactive before-and-after side-by-side Monaco diff viewer.
     * Real-time parity score badge (e.g., "100% Behavioral Parity").
  2. Implement Plan Approval modal with visual DAG dependency tree.
  3. Script 3-minute hackathon demo walkthrough.
* **Verification:** Full end-to-end dry run: Ingest `task-api`, watch archaeology, inspect graph, approve plan, watch live Spring Boot synthesis and compilation, see behavioral verification, review final report.

---

## 4. Risk Matrix & Hackathon Contingency Fallbacks

| Risk / Failure Mode | Likelihood | Impact | Built-in Mitigation & Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **Docker daemon unavailable on host** | Medium | High | **Zero-Blocker Dual Mode:** Switch immediately to `LOCAL_PROCESS` mode running Node and Spring Boot as subprocesses on ports 3000 and 8080. |
| **Maven build slow or network timeout** | Medium | High | Target skeleton includes pre-warmed `.mvn/wrapper` and cached dependencies; compile runs in offline mode (`mvn -o test-compile`). |
| **LLM rate limit or slow inference** | Medium | High | Support Ollama with local `qwen2.5-coder` or `deepseek-coder`, with structured temperature=0 caching for repeated AST queries. |
| **Spring validation response differs from Express** | High | Medium | Standardize error handling by generating a `@RestControllerAdvice` in Spring Boot returning identical `{ "error": message }` JSON. |
| **Repair loop thrashing** | Medium | Medium | Hard cap at 3 repair iterations. If unresolved, mark task as `NEEDS_HUMAN_REVIEW` with exact diagnostic diff and continue pipeline. |
