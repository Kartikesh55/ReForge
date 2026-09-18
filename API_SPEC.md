# ReForge — REST & WebSocket API Specification
## FastAPI Interface & Communication Protocols

---

## 1. Overview & Conventions

* **Base URL:** `http://localhost:8000/api`
* **WebSocket URL:** `ws://localhost:8000/ws/projects/{project_id}`
* **Content-Type:** `application/json` (unless multipart form data for uploads)
* **Error Envelope:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project with id 'proj_123' does not exist.",
    "details": {}
  }
}
```

---

## 2. REST API Endpoints

### 2.1 Project Ingestion & Management

#### `POST /api/projects/upload`
Upload a zipped repository archive for ingestion.
* **Content-Type:** `multipart/form-data`
* **Form Parameters:**
  * `file`: Binary zip file
  * `name`: string (optional project name)
* **Response (201 Created):**
```json
{
  "project_id": "proj_9a8b7c6d",
  "name": "task-api",
  "status": "INITIALIZED",
  "source_path": "/storage/workspaces/proj_9a8b7c6d/source",
  "created_at": "2026-09-18T10:00:00Z"
}
```

#### `POST /api/projects/clone`
Clone a remote Git repository.
* **Request Body:**
```json
{
  "repo_url": "https://github.com/example/task-api.git",
  "branch": "main",
  "name": "task-api"
}
```
* **Response (202 Accepted):**
```json
{
  "project_id": "proj_9a8b7c6d",
  "status": "CLONING",
  "message": "Git clone operation initiated."
}
```

#### `GET /api/projects`
List all ingested projects.
* **Response (200 OK):**
```json
{
  "projects": [
    {
      "project_id": "proj_9a8b7c6d",
      "name": "task-api",
      "status": "ANALYZED",
      "source_tech": "Node.js + Express + MongoDB",
      "target_tech": "Java + Spring Boot + PostgreSQL",
      "created_at": "2026-09-18T10:00:00Z"
    }
  ]
}
```

#### `GET /api/projects/{project_id}`
Retrieve project summary and current pipeline state.
* **Response (200 OK):**
```json
{
  "project_id": "proj_9a8b7c6d",
  "name": "task-api",
  "status": "ANALYZED",
  "current_phase": "ARCHAEOLOGY",
  "metrics": {
    "total_files": 12,
    "lines_of_code": 850,
    "routes_count": 6,
    "models_count": 2,
    "tests_count": 8
  }
}
```

---

### 2.2 AI Archaeology & Knowledge Graph

#### `POST /api/projects/{project_id}/analyze`
Trigger the AI Archaeologist pipeline (AST extraction, Git mining, CKG synthesis).
* **Request Body (Optional):**
```json
{
  "force_reparse": false,
  "include_git_history": true
}
```
* **Response (202 Accepted):**
```json
{
  "analysis_id": "anlz_11223344",
  "status": "PROCESSING",
  "message": "Archaeologist agent started analyzing codebase."
}
```

#### `GET /api/projects/{project_id}/graph`
Retrieve the full Codebase Knowledge Graph formatted for React Flow.
* **Query Parameters:**
  * `layer`: optional filter (`routes`, `models`, `controllers`, `services`, `all`)
* **Response (200 OK):**
```json
{
  "project_id": "proj_9a8b7c6d",
  "nodes": [
    {
      "id": "node_route_post_tasks",
      "type": "routeNode",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "POST /api/tasks",
        "method": "POST",
        "path": "/api/tasks",
        "auth_required": true,
        "evidence": {
          "source_file": "routes/taskRoutes.js",
          "start_line": 14,
          "end_line": 14,
          "symbol": "router.post('/', auth, taskController.createTask)",
          "evidence_type": "AST"
        }
      }
    },
    {
      "id": "node_model_task",
      "type": "modelNode",
      "position": { "x": 450, "y": 300 },
      "data": {
        "label": "Task (Mongoose)",
        "fields": ["title", "status", "priority", "user"],
        "evidence": {
          "source_file": "models/Task.js",
          "start_line": 5,
          "end_line": 32,
          "symbol": "TaskSchema",
          "evidence_type": "AST"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_route_post_tasks",
      "target": "node_model_task",
      "label": "USES_MODEL",
      "animated": false
    }
  ]
}
```

#### `GET /api/projects/{project_id}/hotspots`
Retrieve Git churn and complexity hotspots identified by PyDriller.
* **Response (200 OK):**
```json
{
  "hotspots": [
    {
      "file_path": "controllers/taskController.js",
      "commit_count": 42,
      "churn_lines": 580,
      "complexity_score": "HIGH",
      "risk_assessment": "Core domain logic with frequent modifications."
    }
  ]
}
```

---

### 2.3 Semantic Application Model (TAM)

#### `GET /api/projects/{project_id}/tam`
Retrieve the framework-independent Technology-Independent Application Model (IR).
* **Response (200 OK):**
```json
{
  "app_id": "proj_9a8b7c6d",
  "name": "task-api",
  "entities": [
    {
      "name": "Task",
      "fields": [
        { "name": "id", "type": "UUID", "primary_key": true },
        { "name": "title", "type": "STRING", "required": true, "max_length": 100 },
        { "name": "status", "type": "ENUM", "enum_values": ["TODO", "IN_PROGRESS", "DONE"], "default": "TODO" },
        { "name": "priority", "type": "ENUM", "enum_values": ["LOW", "MEDIUM", "HIGH"], "default": "MEDIUM" },
        { "name": "user_id", "type": "UUID", "required": true }
      ],
      "relationships": [
        { "target_entity": "User", "relation_type": "MANY_TO_ONE", "foreign_key": "user_id" }
      ]
    }
  ],
  "endpoints": [
    {
      "endpoint_id": "ep_create_task",
      "http_method": "POST",
      "path": "/api/tasks",
      "auth_type": "BEARER_JWT",
      "request_body_schema": {
        "type": "object",
        "required": ["title"],
        "properties": {
          "title": { "type": "string" },
          "priority": { "type": "string", "enum": ["LOW", "MEDIUM", "HIGH"] }
        }
      },
      "responses": {
        "201": { "description": "Task created successfully" },
        "400": { "description": "Validation failure" },
        "401": { "description": "Unauthorized" }
      }
    }
  ]
}
```

---

### 2.4 Codebase Exploration & Flow Tracing

#### `POST /api/projects/{project_id}/trace-flow`
Trace the full execution path from an incoming request to database interaction.
* **Request Body:**
```json
{
  "endpoint": "POST /api/tasks"
}
```
* **Response (200 OK):**
```json
{
  "flow_id": "flow_post_tasks",
  "endpoint": "POST /api/tasks",
  "steps": [
    {
      "sequence": 1,
      "component_type": "MIDDLEWARE",
      "name": "auth",
      "file": "middleware/auth.js",
      "lines": "8-25",
      "action": "Validates JWT header and sets req.user"
    },
    {
      "sequence": 2,
      "component_type": "CONTROLLER",
      "name": "taskController.createTask",
      "file": "controllers/taskController.js",
      "lines": "12-30",
      "action": "Extracts title and priority; instantiates Task model"
    },
    {
      "sequence": 3,
      "component_type": "MODEL",
      "name": "Task.save",
      "file": "models/Task.js",
      "lines": "30-32",
      "action": "Executes MongoDB collection insert"
    }
  ],
  "graph_path_node_ids": [
    "node_route_post_tasks",
    "node_mw_auth",
    "node_ctrl_create_task",
    "node_model_task"
  ]
}
```

#### `POST /api/projects/{project_id}/chat`
Ask natural language questions grounded in codebase evidence.
* **Request Body:**
```json
{
  "query": "How is task creation validated and authenticated?"
}
```
* **Response (200 OK):**
```json
{
  "answer": "Task creation requires a valid JWT token verified in `middleware/auth.js`. The title field is validated at the model level in `models/Task.js` to ensure non-empty strings.",
  "evidence": [
    {
      "file": "middleware/auth.js",
      "start_line": 10,
      "end_line": 15,
      "snippet": "const token = req.header('Authorization')?.replace('Bearer ', '');"
    },
    {
      "file": "models/Task.js",
      "start_line": 7,
      "end_line": 9,
      "snippet": "title: { type: String, required: true, trim: true }"
    }
  ]
}
```

---

### 2.5 Migration Planning & Human Approval

#### `POST /api/projects/{project_id}/plan-migration`
Synthesize the target migration DAG from the TAM.
* **Request Body:**
```json
{
  "target_framework": "SPRING_BOOT_3",
  "target_language": "JAVA_17",
  "target_database": "POSTGRESQL_16"
}
```
* **Response (200 OK):**
```json
{
  "plan_id": "plan_998877",
  "approval_status": "AWAITING_APPROVAL",
  "tasks": [
    { "id": "t1", "title": "Base Maven Project Configuration", "category": "CONFIG", "dependencies": [], "status": "PENDING" },
    { "id": "t2", "title": "Entity: User (JPA)", "category": "MODEL", "dependencies": ["t1"], "status": "PENDING" },
    { "id": "t3", "title": "Entity: Task (JPA)", "category": "MODEL", "dependencies": ["t2"], "status": "PENDING" },
    { "id": "t4", "title": "Repository: TaskRepository", "category": "PERSISTENCE", "dependencies": ["t3"], "status": "PENDING" },
    { "id": "t5", "title": "Service: TaskService", "category": "BUSINESS_LOGIC", "dependencies": ["t4"], "status": "PENDING" },
    { "id": "t6", "title": "Controller: TaskController", "category": "API", "dependencies": ["t5"], "status": "PENDING" },
    { "id": "t7", "title": "Security: JwtAuthenticationFilter", "category": "SECURITY", "dependencies": ["t1"], "status": "PENDING" },
    { "id": "t8", "title": "Tests: TaskControllerTest", "category": "TEST", "dependencies": ["t6"], "status": "PENDING" }
  ]
}
```

#### `POST /api/projects/{project_id}/plan/approve`
Approve the synthesized migration plan and resume autonomous execution.
* **Response (200 OK):**
```json
{
  "project_id": "proj_9a8b7c6d",
  "plan_id": "plan_998877",
  "approval_status": "APPROVED",
  "message": "Migration plan approved. Ready to execute."
}
```

#### `POST /api/projects/{project_id}/execute-migration`
Trigger autonomous code generation across the approved migration DAG.
* **Response (202 Accepted):**
```json
{
  "execution_id": "exec_554433",
  "status": "RUNNING",
  "message": "Migration execution initiated."
}
```

---

### 2.6 Behavioral Verification & Autonomous Repair

#### `POST /api/projects/{project_id}/verify`
Execute behavioral comparison using Docker or Local Subprocesses.
* **Request Body (Optional):**
```json
{
  "mode": "LOCAL_PROCESS"
}
```
* **Response (202 Accepted):**
```json
{
  "verification_id": "vrfy_001122",
  "mode": "LOCAL_PROCESS",
  "status": "RUNNING",
  "message": "Executing synthetic HTTP test suite against source and target applications."
}
```

#### `GET /api/projects/{project_id}/diff-report`
Retrieve behavioral parity comparison results.
* **Response (200 OK):**
```json
{
  "parity_score": 92.5,
  "endpoints_tested": 6,
  "endpoints_passed": 5,
  "endpoints_failed": 1,
  "results": [
    {
      "endpoint": "POST /api/tasks (Valid Payload)",
      "method": "POST",
      "status": "PASSED",
      "source_status": 201,
      "target_status": 201,
      "body_diff": null
    },
    {
      "endpoint": "POST /api/tasks (Empty Title)",
      "method": "POST",
      "status": "FAILED",
      "source_status": 400,
      "target_status": 500,
      "body_diff": {
        "source_body": { "error": "Title is required" },
        "target_body": { "status": 500, "error": "Internal Server Error" }
      },
      "root_cause_hint": "Spring Boot threw MethodArgumentNotValidException which was not caught by a GlobalExceptionHandler."
    }
  ]
}
```

#### `POST /api/projects/{project_id}/repair`
Trigger the Autonomous Repair Agent to diagnose and patch errors.
* **Response (200 OK):**
```json
{
  "repair_id": "rep_776655",
  "status": "PATCHED",
  "iterations": 1,
  "file_patched": "src/main/java/com/reforge/app/exception/GlobalExceptionHandler.java",
  "diff_applied": "+ @ExceptionHandler(MethodArgumentNotValidException.class)\n+ public ResponseEntity<?> handleValidation(...)",
  "retest_parity_score": 100.0
}
```

---

## 3. Real-Time WebSocket Protocol

### 3.1 Connection
Client connects to: `ws://localhost:8000/ws/projects/{project_id}`

### 3.2 Event Frame Format
All events dispatched through the backend `EventBus` adhere to this schema:
```json
{
  "event_id": "evt_123456",
  "project_id": "proj_9a8b7c6d",
  "timestamp": "2026-09-18T10:05:30.123Z",
  "type": "AGENT_STEP",
  "phase": "MIGRATION_EXECUTION",
  "payload": {
    "agent": "EngineerAgent",
    "task_id": "t6",
    "action": "Synthesizing TaskController.java",
    "status": "RUNNING",
    "details": "Adding @RestController and @Valid annotations."
  }
}
```

### 3.3 Message Types
| Event Type | Direction | Description |
| :--- | :--- | :--- |
| `AGENT_STEP` | Server $\to$ Client | Live step-by-step reasoning and current task status. |
| `TERMINAL_OUTPUT` | Server $\to$ Client | Streaming stdout/stderr from Maven compile, tests, or Docker. |
| `GRAPH_UPDATE` | Server $\to$ Client | Incremental nodes or edges added during archaeology. |
| `DIFF_STREAM` | Server $\to$ Client | Live progress of endpoints tested during behavioral comparison. |
| `REPAIR_PROGRESS` | Server $\to$ Client | Live diagnostic hypothesis and code patch preview. |
| `PLAN_AWAITING_APPROVAL` | Server $\to$ Client | Emitted when the migration plan is ready for human review. |
