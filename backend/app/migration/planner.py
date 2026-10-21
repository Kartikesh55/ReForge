from typing import Dict, List, Any

def _normalize_stack(stack: Any, default_lang: str = "Java", default_fw: str = "Spring Boot") -> Dict[str, str]:
    if isinstance(stack, dict):
        return {
            "language": stack.get("language", default_lang),
            "framework": stack.get("framework", default_fw),
            "database": stack.get("database", "PostgreSQL"),
            "testing": stack.get("testing", "JUnit 5")
        }
    elif isinstance(stack, str):
        parts = [p.strip() for p in stack.split('+')]
        return {
            "language": parts[0] if len(parts) > 0 else default_lang,
            "framework": parts[1] if len(parts) > 1 else default_fw,
            "database": parts[2] if len(parts) > 2 else "PostgreSQL",
            "testing": parts[3] if len(parts) > 3 else "JUnit 5"
        }
    return {"language": default_lang, "framework": default_fw, "database": "PostgreSQL", "testing": "JUnit 5"}

def create_migration_plan(
    source_stack: Any, 
    target_stack: Any, 
    parsed_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generates an architectural migration plan translating source components
    into target stack constructs, categorizing transformation risks and
    defining source-to-target component mappings.
    Handles any source language (JavaScript, Python, Go, Java) to any target stack.
    """
    src_norm = _normalize_stack(source_stack, default_lang="JavaScript", default_fw="Express")
    tgt_norm = _normalize_stack(target_stack, default_lang="Java", default_fw="Spring Boot")

    source_lang = src_norm["language"]
    target_lang = tgt_norm["language"]
    target_framework = tgt_norm["framework"]
    target_db = tgt_norm["database"]
    target_test = tgt_norm["testing"]

    mappings = []
    files_affected = []

    # 1. Routes & Controllers / Handlers
    for ctrl in parsed_data.get("controllers", []):
        src_file = ctrl.get("file", "")
        ctrl_name = ctrl.get("name", "App")
        clean_name = ctrl_name.replace("Controller", "").replace("controller", "").replace("views", "").replace("router", "")
        pascal_name = "".join(p.capitalize() for p in clean_name.split("_") if p) or "Main"
        pascal_ctrl = f"{pascal_name}Controller"

        if target_lang == "Java":
            target_file = f"src/main/java/com/reforge/app/controller/{pascal_ctrl}.java"
            trans_type = f"{source_lang} Handlers -> Spring Boot @RestController + @RequestMapping"
        elif target_lang == "Python":
            target_file = f"app/routers/{clean_name or 'api'}.py"
            trans_type = f"{source_lang} Handlers -> FastAPI APIRouter"
        elif target_lang == "Go":
            target_file = f"handlers/{clean_name or 'api'}.go"
            trans_type = f"{source_lang} Handlers -> Gin Context Handlers"
        elif target_lang == "TypeScript":
            target_file = f"src/controllers/{clean_name or 'app'}.controller.ts"
            trans_type = f"{source_lang} Handlers -> NestJS @Controller"
        else:
            target_file = f"src/controllers/{pascal_ctrl}.cs"
            trans_type = f"{source_lang} Handlers -> ASP.NET Core ControllerBase"

        mappings.append({
            "source": src_file,
            "target": target_file,
            "type": "controller-migration",
            "description": trans_type,
            "risk": "Low"
        })
        if src_file:
            files_affected.append(src_file)

    # 2. Services
    for svc in parsed_data.get("services", []):
        src_file = svc.get("file", "")
        svc_name = svc.get("name", "App")
        clean_svc = svc_name.replace("Service", "").replace("service", "")
        pascal_name = "".join(p.capitalize() for p in clean_svc.split("_") if p) or "Core"
        pascal_svc = f"{pascal_name}Service"

        is_high_risk = any(k in svc_name.lower() for k in ('payment', 'auth', 'billing', 'security'))

        if target_lang == "Java":
            target_file = f"src/main/java/com/reforge/app/service/{pascal_svc}.java"
            trans_type = f"{source_lang} Service -> Spring @Service with Dependency Injection"
        elif target_lang == "Python":
            target_file = f"app/services/{clean_svc or 'service'}.py"
            trans_type = f"{source_lang} Service -> Python Service Class"
        elif target_lang == "Go":
            target_file = f"services/{clean_svc or 'service'}.go"
            trans_type = f"{source_lang} Service -> Go Service Struct & Interface"
        else:
            target_file = f"src/services/{pascal_svc}.cs"
            trans_type = f"{source_lang} Service -> C# Injectable Service"

        mappings.append({
            "source": src_file,
            "target": target_file,
            "type": "service-migration",
            "description": trans_type,
            "risk": "High" if is_high_risk else "Medium"
        })
        if src_file:
            files_affected.append(src_file)

    # 3. Models / Schemas
    for m in parsed_data.get("models", []):
        src_file = m.get("file", "")
        m_name = m.get("name", "Entity")
        pascal_name = "".join(p.capitalize() for p in m_name.split("_") if p) or "Entity"

        if target_lang == "Java":
            target_file = f"src/main/java/com/reforge/app/model/{pascal_name}.java"
            trans_type = f"{source_lang} Model -> JPA @Entity with Hibernate ({target_db})"
        elif target_lang == "Python":
            target_file = f"app/models/{m_name.lower()}.py"
            trans_type = f"{source_lang} Model -> SQLAlchemy ORM Model & Pydantic Schema"
        elif target_lang == "Go":
            target_file = f"models/{m_name.lower()}.go"
            trans_type = f"{source_lang} Model -> GORM Struct ({target_db})"
        else:
            target_file = f"src/models/{pascal_name}.cs"
            trans_type = f"{source_lang} Model -> Entity Framework Core Entity"

        mappings.append({
            "source": src_file,
            "target": target_file,
            "type": "model-migration",
            "description": trans_type,
            "risk": "Medium"
        })
        if src_file:
            files_affected.append(src_file)

    # 4. Tests
    for t in parsed_data.get("tests", []):
        src_file = t.get("file", "")
        t_name = t.get("name", "Test")
        pascal_test = "".join(p.capitalize() for p in t_name.replace(".test", "").replace("test_", "").split("_") if p) + "Test"

        if target_lang == "Java":
            target_file = f"src/test/java/com/reforge/app/{pascal_test}.java"
            trans_type = f"Source Tests -> {target_test} + Mockito"
        elif target_lang == "Python":
            target_file = f"tests/test_{t_name.lower().replace('.test', '')}.py"
            trans_type = "Source Tests -> pytest + unittest.mock"
        else:
            target_file = f"tests/{t_name.lower()}_test.go"
            trans_type = "Source Tests -> Go testing suite"

        mappings.append({
            "source": src_file,
            "target": target_file,
            "type": "test-migration",
            "description": trans_type,
            "risk": "Low"
        })
        if src_file:
            files_affected.append(src_file)

    # 5. Build Manifest & Config
    if target_lang == "Java":
        mappings.append({
            "source": "requirements.txt" if source_lang == "Python" else "package.json",
            "target": "pom.xml",
            "type": "build-migration",
            "description": f"{source_lang} dependencies -> Maven pom.xml (Spring Boot, JPA, {target_db})",
            "risk": "Medium"
        })
        mappings.append({
            "source": ".env",
            "target": "src/main/resources/application.properties",
            "type": "config-migration",
            "description": "Environment configs -> Spring application.properties",
            "risk": "Low"
        })
    elif target_lang == "Python":
        mappings.append({
            "source": "package.json" if source_lang == "JavaScript" else "requirements.txt",
            "target": "requirements.txt",
            "type": "build-migration",
            "description": f"{source_lang} dependencies -> pip requirements.txt (fastapi, uvicorn, sqlalchemy)",
            "risk": "Low"
        })

    risks = {
        "HIGH": [
            {"component": "Authentication & Session Security", "reason": "Password hashes, token issuance, and middleware intercepts require contract verification."},
            {"component": "Database Schema Mapping", "reason": f"Translating {source_lang} schemas into {target_db} relations with foreign key constraints."},
            {"component": "Third-Party External Integrations", "reason": "Ensure payment gateways, emails, and webhook callers maintain identical contracts."}
        ],
        "MEDIUM": [
            {"component": "Data Validation & DTOs", "reason": "Ensure request body validation rules match between source and target runtimes."},
            {"component": "Configuration & Environment", "reason": "Map environment properties accurately to target configuration files."}
        ],
        "LOW": [
            {"component": "Controller Route Dispatches", "reason": "REST endpoints have straightforward 1:1 decorator mapping in target web framework."},
            {"component": "Pure Business Logic Utilities", "reason": "Deterministic translation with zero runtime dependencies."}
        ]
    }

    return {
        "source_stack": source_stack,
        "target_stack": target_stack,
        "mappings": mappings,
        "risks": risks,
        "confidence": 0.95,
        "total_files_mapped": len(mappings),
        "files_affected": sorted(list(set(files_affected))),
        "parsed_data": parsed_data
    }
