# ReForge — Project Structure & Directory Layout
## Repository Organization & Module Responsibilities

---

## 1. High-Level Repository Layout

```
ReForge/
├── backend/                  # Python 3.11+ FastAPI backend, LangGraph agents, MCP tools
├── frontend/                 # Vite + React 18 + TypeScript + Tailwind UI
├── sample_apps/              # Reference testbeds for source and target codebases
│   ├── source/               # Realistic Node.js + Express + MongoDB + Jest application
│   └── target_template/      # Clean Spring Boot 3 + Java 17 + Maven skeleton
├── docker/                   # Docker Compose & container configurations
├── docs/                     # Specifications, diagrams, and API documentation
├── storage/                  # Local runtime data (SQLite DB, workspaces)
├── scripts/                  # Development, bootstrapping, and testing utilities
├── .gitignore
├── README.md
└── docker-compose.yml        # Multi-service verification environment
```

---

## 2. Detailed Component Tree

### 2.1 Backend (`/backend`)
Built with Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy (Async), LangGraph, Tree-sitter, and PyDriller.

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application entry point, CORS, lifespan hooks
│   ├── config.py                   # Environment configuration (Pydantic Settings)
│   ├── dependencies.py             # FastAPI dependency injection (DB sessions, LLM client)
│   │
│   ├── core/                       # Core infrastructure & Event Bus
│   │   ├── __init__.py
│   │   ├── events.py               # Async EventBus (asyncio.Queue) for LangGraph -> WebSocket
│   │   └── security.py             # Path sandboxing & command sanitization utilities
│   │
│   ├── api/                        # REST & WebSocket Endpoints
│   │   ├── __init__.py
│   │   ├── router.py               # Top-level API router mounting sub-routers
│   │   ├── projects.py             # Project ingestion, upload, and status endpoints
│   │   ├── analysis.py             # Archaeology triggers and CKG graph retrieval
│   │   ├── exploration.py          # Codebase Q&A, flow tracing, and plain English explanations
│   │   ├── migration.py            # Migration plan generation, human approval, execution
│   │   ├── verification.py         # Dual-runner verification triggers and diff reports
│   │   ├── repair.py               # Autonomous self-healing manual/auto triggers
│   │   └── websocket.py            # Real-time WebSocket connection manager & streaming hub
│   │
│   ├── models/                     # Database & Domain Data Models
│   │   ├── __init__.py
│   │   ├── database.py             # SQLAlchemy async engine, base model, sessionmaker
│   │   ├── project.py              # Project and workspace database entities
│   │   ├── analysis.py             # Analysis runs, graph snapshots (JSON), and findings
│   │   ├── tam.py                  # Technology-Independent Application Model (Pydantic schema)
│   │   ├── plan.py                 # Migration DAG tasks, approval statuses, dependencies
│   │   ├── verification.py         # Test run logs, endpoint diffs, parity scores
│   │   └── repair.py               # Diagnostic logs, patch diffs, iteration tracking
│   │
│   ├── intelligence/               # AI Software Archaeology & Static Analysis
│   │   ├── __init__.py
│   │   ├── parsers/
│   │   │   ├── __init__.py
│   │   │   ├── base_parser.py      # Abstract base parser interface
│   │   │   ├── tree_sitter_js.py   # Tree-sitter queries for Express routes & Mongoose models
│   │   │   ├── tree_sitter_java.py # Tree-sitter queries for Java AST validation
│   │   │   └── query_patterns.py   # Tree-sitter S-expression query rules
│   │   ├── git/
│   │   │   ├── __init__.py
│   │   │   └── history_miner.py    # PyDriller integration: churn, commit frequency, hotspots
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── ckg_builder.py      # NetworkX Codebase Knowledge Graph builder
│   │   │   ├── traversals.py       # Route-to-DB flow pathfinder, cycle detection, topological sort
│   │   │   └── serializers.py      # Export CKG to Cytoscape / React Flow JSON format
│   │   └── index/
│   │       ├── __init__.py
│   │       └── symbol_index.py     # Fast in-memory AST symbol lookup for Q&A
│   │
│   ├── tam/                        # Technology-Independent Application Model (IR)
│   │   ├── __init__.py
│   │   ├── schema.py               # Complete TAM Pydantic schema definition
│   │   ├── extractor.py            # Synthesizes TAM from CKG nodes and Tree-sitter AST
│   │   └── validator.py            # Semantic consistency validation for TAM specifications
│   │
│   ├── agents/                     # LangGraph Multi-Agent Orchestration
│   │   ├── __init__.py
│   │   ├── state.py                # ReForgeState schema (shared agent context)
│   │   ├── graph.py                # LangGraph state machine definition, edges, conditional branches
│   │   ├── callbacks.py            # LangGraph callback handler emitting events to EventBus
│   │   ├── archaeologist.py        # Archaeology agent: executes static analysis & builds CKG
│   │   ├── flow_tracer.py          # Flow tracing agent: traces user/data paths
│   │   ├── architect.py            # Architect agent: converts CKG to TAM and creates Migration DAG
│   │   ├── engineer.py             # Migration engineer: translates TAM into Spring Boot code
│   │   ├── verifier.py             # Verification agent: runs test suites and behavioral differ
│   │   └── debugger.py             # Repair agent: analyzes error logs and applies code patches
│   │
│   ├── mcp/                        # Model Context Protocol (MCP) Server & Tool Registry
│   │   ├── __init__.py
│   │   ├── server.py               # FastMCP server instance exposing agent tools
│   │   ├── client.py               # In-process MCP client for agent tool execution
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── code_tools.py       # ast_extract_project_graph, symbol search, file reading
│   │       ├── git_tools.py        # git_analyze_history commit mining
│   │       ├── graph_tools.py      # graph_query_flow pathfinder
│   │       ├── runtime_tools.py    # environment_manage_runtime (Docker & Subprocess runner)
│   │       ├── diff_tools.py       # behavioral_compare_endpoints HTTP replay & diff
│   │       └── patch_tools.py      # project_scaffold_target, code_write_target_file, code_patch_target_file
│   │
│   ├── execution/                  # Runtime Execution Sandboxes
│   │   ├── __init__.py
│   │   ├── base.py                 # Abstract runtime interface
│   │   ├── docker_runner.py        # Docker Compose runner
│   │   └── process_runner.py       # Local isolated subprocess runner (zero-blocker fallback)
│   │
│   ├── synthesis/                  # Target Code Generators (Java / Spring Boot)
│   │   ├── __init__.py
│   │   ├── templates/              # Jinja2 / String templates for base files
│   │   │   ├── pom_xml.j2
│   │   │   ├── application_yml.j2
│   │   │   └── GlobalExceptionHandler_java.j2
│   │   ├── generators/
│   │   │   ├── __init__.py
│   │   │   ├── entity_gen.py       # Generates JPA @Entity classes
│   │   │   ├── repo_gen.py         # Generates Spring Data JpaRepository interfaces
│   │   │   ├── service_gen.py      # Generates @Service classes with transaction semantics
│   │   │   ├── controller_gen.py   # Generates @RestController with validation & error handling
│   │   │   ├── security_gen.py     # Generates Spring Security & JWT Filter classes
│   │   │   └── test_gen.py         # Generates JUnit 5 & MockMvc integration tests
│   │   └── compiler.py             # Maven build invoker & compiler diagnostic parser
│   │
│   └── verification/               # Behavioral Verification Engine
│       ├── __init__.py
│       ├── harness.py              # Dual HTTP replay executor
│       ├── normalizers.py          # Dynamic field normalizers (UUIDs, timestamps, hashes)
│       └── differ.py               # Semantic JSON differ and scoring engine
│
├── tests/                          # Backend Test Suite
│   ├── __init__.py
│   ├── test_ast_parsers.py         # Tests for Tree-sitter query extraction
│   ├── test_ckg_builder.py         # Tests for NetworkX graph construction
│   ├── test_tam_extraction.py      # Tests for TAM model accuracy
│   ├── test_diff_engine.py         # Tests for semantic response diffing
│   └── test_agent_graph.py         # Unit tests for LangGraph state transitions
│
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Python package and linter configuration
└── Dockerfile                      # Backend container definition
```

---

### 2.2 Frontend (`/frontend`)
Built with React 18, Vite, TypeScript, Tailwind CSS, React Flow, and Monaco Editor.

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
│
├── src/
│   ├── main.tsx                    # React root mounting
│   ├── App.tsx                     # Top-level routing, layout shell, global header
│   │
│   ├── components/                 # Reusable UI Components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Top navigation bar with project switcher & status
│   │   │   ├── Sidebar.tsx         # Phase navigation (Archaeology -> Plan -> Verify)
│   │   │   └── Terminal.tsx        # Live streaming log drawer
│   │   ├── graph/
│   │   │   ├── ArchitectureGraph.tsx # React Flow canvas
│   │   │   ├── CustomNodes.tsx     # RouteNode, ControllerNode, ModelNode, ServiceNode
│   │   │   ├── CustomEdges.tsx     # Animated flow edge components
│   │   │   └── GraphControls.tsx   # Filter by layer, zoom, search
│   │   ├── editor/
│   │   │   ├── MonacoDiffViewer.tsx # Side-by-side original vs migrated code editor
│   │   │   └── CodeSnippetModal.tsx # Provenance evidence viewer
│   │   └── chat/
│   │       ├── CodebaseChat.tsx    # Interactive Q&A chat interface
│   │       └── ChatMessage.tsx     # Message bubble with interactive evidence chips
│   │
│   ├── pages/                      # Major Phase Views
│   │   ├── DashboardPage.tsx       # Project overview, health score, quick actions
│   │   ├── IngestionPage.tsx       # File upload or GitHub URL input
│   │   ├── ArchaeologyPage.tsx     # Full CKG graph, layer breakdown, hotspot analysis
│   │   ├── FlowTracerPage.tsx      # Step-by-step interactive flow execution viewer
│   │   ├── MigrationPlanPage.tsx   # Visual DAG migration planner with human approval modal
│   │   ├── MigrationProgressPage.tsx # Live task execution, streaming build logs
│   │   ├── VerificationPage.tsx    # Side-by-side behavioral diff matrix & test results
│   │   └── RepairPage.tsx          # Self-healing diagnostic breakdown and patch history
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useProject.ts           # Project metadata & active workspace state
│   │   ├── useWebSocket.ts         # Auto-reconnecting WebSocket subscription hook
│   │   ├── useArchitectureGraph.ts # React Flow data transformer
│   │   └── useFlowTracer.ts        # Flow playback and node highlighting logic
│   │
│   ├── services/                   # API Client & Communication
│   │   ├── api.ts                  # Axios client for FastAPI REST endpoints
│   │   └── ws.ts                   # WebSocket event dispatcher
│   │
│   ├── types/                      # TypeScript Interfaces
│   │   ├── project.ts
│   │   ├── graph.ts
│   │   ├── tam.ts
│   │   ├── plan.ts
│   │   ├── verification.ts
│   │   └── ws_events.ts
│   │
│   └── utils/                      # Formatting and Graph Helpers
│       ├── graphLayout.ts          # Dagre hierarchical layout algorithm
│       └── diffHighlighter.ts      # Line diff formatting utilities
```

---

### 2.3 Sample Applications (`/sample_apps`)
Provides realistic, functional testbeds for source analysis and target verification.

```
sample_apps/
├── source/                         # Node.js + Express + MongoDB Source App
│   └── task-api/
│       ├── package.json            # express, mongoose, jsonwebtoken, dotenv, jest, supertest
│       ├── server.js               # Entry point, Express setup, MongoDB connection
│       ├── config/
│       │   └── db.js               # Mongoose connection logic
│       ├── middleware/
│       │   ├── auth.js             # JWT bearer verification middleware
│       │   └── errorHandler.js     # Centralized error handler
│       ├── models/
│       │   ├── User.js             # Mongoose User model (username, password, role)
│       │   └── Task.js             # Mongoose Task model (title, status, priority, user ref)
│       ├── routes/
│       │   ├── authRoutes.js       # /api/auth/register, /api/auth/login
│       │   └── taskRoutes.js       # /api/tasks (GET, POST, PUT, DELETE)
│       ├── controllers/
│       │   ├── authController.js   # Auth controller logic
│       │   └── taskController.js   # Task CRUD controller logic
│       └── tests/
│           ├── auth.test.js        # Supertest suites for auth
│           └── tasks.test.js       # Supertest suites for task CRUD
│
└── target_template/                # Spring Boot 3 Java Reference Skeleton
    └── spring-boot-skeleton/
        ├── pom.xml                 # Maven POM: Spring Boot 3.2, Java 17, JPA, PostgreSQL, Lombok
        ├── mvnw                    # Maven wrapper script (Unix)
        ├── mvnw.cmd                # Maven wrapper script (Windows)
        ├── .mvn/wrapper/           # Maven wrapper jar and properties
        └── src/
            ├── main/
            │   ├── java/com/reforge/app/
            │   │   ├── Application.java # @SpringBootApplication entry point
            │   │   └── exception/
            │   │       └── GlobalExceptionHandler.java # Standardized error JSON responses
            │   └── resources/
            │       └── application.yml  # DataSource, JPA, server port configuration
            └── test/
                └── java/com/reforge/app/
                    └── ApplicationTests.java
```

---

### 2.4 Docker & Environments (`/docker`)

```
docker/
├── source-app.Dockerfile           # Containerizes Node.js app + waits for MongoDB
├── target-app.Dockerfile           # Containerizes Spring Boot app + JDK 17 + Maven
├── docker-compose.verify.yml       # Orchestrates Node, Mongo, Spring Boot, Postgres
└── init-mongo.js                   # Seed data for source MongoDB
```

---

### 2.5 Storage (`/storage`)
Local runtime directory:
* `storage/reforge.db`: SQLite database for project metadata, graph snapshots, and execution logs.
* `storage/workspaces/{project_id}/source/`: Sandboxed directory for uploaded/cloned source files.
* `storage/workspaces/{project_id}/target/`: Sandboxed directory for generated Spring Boot files.
