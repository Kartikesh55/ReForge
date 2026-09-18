from typing import Dict, Any, List
import uuid

class MigrationPlanner:
    """
    Formulates a topologically ordered migration DAG based on TAM specification.
    """
    def __init__(self, tam_spec: Dict[str, Any] | None = None):
        self.tam_spec = tam_spec or {}

    def generate_plan(self) -> Dict[str, Any]:
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        tasks = [
            {
                "id": "task_1_scaffold",
                "order": 1,
                "title": "Initialize Maven & Spring Boot 3 Base Project",
                "category": "CONFIG",
                "dependencies": [],
                "status": "PENDING"
            },
            {
                "id": "task_2_entities",
                "order": 2,
                "title": "Synthesize JPA Domain Entities & Relations",
                "category": "MODEL",
                "dependencies": ["task_1_scaffold"],
                "status": "PENDING"
            },
            {
                "id": "task_3_repositories",
                "order": 3,
                "title": "Synthesize Spring Data JPA Repositories",
                "category": "PERSISTENCE",
                "dependencies": ["task_2_entities"],
                "status": "PENDING"
            },
            {
                "id": "task_4_services",
                "order": 4,
                "title": "Synthesize Transactional Domain Services",
                "category": "BUSINESS_LOGIC",
                "dependencies": ["task_3_repositories"],
                "status": "PENDING"
            },
            {
                "id": "task_5_controllers",
                "order": 5,
                "title": "Synthesize REST Controllers with Validation",
                "category": "API",
                "dependencies": ["task_4_services"],
                "status": "PENDING"
            },
            {
                "id": "task_6_exception_handler",
                "order": 6,
                "title": "Synthesize Global Exception Handler",
                "category": "API",
                "dependencies": ["task_1_scaffold"],
                "status": "PENDING"
            },
            {
                "id": "task_7_tests",
                "order": 7,
                "title": "Synthesize JUnit 5 Integration Test Suites",
                "category": "TEST",
                "dependencies": ["task_5_controllers"],
                "status": "PENDING"
            }
        ]

        return {
            "plan_id": plan_id,
            "target_stack": "Java 17 + Spring Boot 3.2 + PostgreSQL + Spring Data JPA",
            "approval_status": "AWAITING_APPROVAL",
            "total_tasks": len(tasks),
            "tasks": tasks
        }
