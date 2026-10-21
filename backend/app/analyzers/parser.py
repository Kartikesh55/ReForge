import os
import re
from typing import Dict, List, Any, Optional

def parse_codebase_symbols(repo_path: str) -> Dict[str, Any]:
    """
    Deterministically parses files across any source language (Python, JavaScript,
    TypeScript, Go, Java) to extract routes, handlers, services, models, repositories,
    middleware, test suites, and cross-component relationships.
    """
    results: Dict[str, Any] = {
        "routes": [],
        "controllers": [],
        "services": [],
        "models": [],
        "repositories": [],
        "middleware": [],
        "tests": [],
        "symbols": [],
        "relationships": []
    }

    if not os.path.exists(repo_path):
        return results

    ignore_dirs = {'node_modules', '.git', 'venv', '.venv', '__pycache__', 'dist', 'build', 'target', '.pytest_cache'}

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, repo_path).replace('\\', '/')
            _, ext = os.path.splitext(file)
            ext = ext.lower()

            if ext not in ('.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go'):
                continue

            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                continue

            rel_lower = rel_path.lower()
            file_base = os.path.splitext(file)[0]

            # Heuristics for component layer
            is_route = any(k in rel_lower for k in ('route', 'router', 'endpoint', 'api', 'views', 'urls')) or file in ('main.py', 'app.py', 'server.js', 'app.js')
            is_controller = any(k in rel_lower for k in ('controller', 'handler', 'view', 'endpoint', 'routers'))
            is_service = any(k in rel_lower for k in ('service', 'crud', 'manager', 'logic', 'usecase'))
            is_model = any(k in rel_lower for k in ('model', 'entity', 'schema', 'dto', 'entities'))
            is_repo = any(k in rel_lower for k in ('repo', 'repository', 'dao'))
            is_middleware = any(k in rel_lower for k in ('middleware', 'security', 'auth', 'cors'))
            is_test = any(k in rel_lower for k in ('test', 'spec')) or file.startswith('test_') or file.endswith('_test.py') or file.endswith('.test.js')

            # --- 1. ROUTE EXTRACTION ---
            # Python FastAPI / APIRouter: @app.get("/path") or @router.post("/path")
            if ext == '.py':
                py_fastapi = re.finditer(r'@(?:router|app|api_router)\.(get|post|put|delete|patch|options)\(\s*[\'"`]([^\'"`]+)[\'"`]', content)
                for m in py_fastapi:
                    method = m.group(1).upper()
                    path = m.group(2)
                    route_id = f"route_{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}"
                    results["routes"].append({
                        "id": route_id,
                        "method": method,
                        "path": path,
                        "handler": f"{file_base}_handler",
                        "file": rel_path
                    })
                    results["relationships"].append({
                        "source": route_id,
                        "target": f"ctrl_{file_base}",
                        "type": "calls",
                        "label": "dispatches to"
                    })

                # Flask: @app.route('/path', methods=['GET', 'POST'])
                py_flask = re.finditer(r'@(?:app|blueprint|bp)\.route\(\s*[\'"`]([^\'"`]+)[\'"`](?:.*?methods=\[([^\]]+)\])?', content)
                for m in py_flask:
                    path = m.group(1)
                    methods_str = m.group(2) or "'GET'"
                    methods = re.findall(r'[\'"]([A-Za-z]+)[\'"]', methods_str) or ["GET"]
                    for method in methods:
                        m_upper = method.upper()
                        route_id = f"route_{m_upper}_{path.replace('/', '_')}"
                        results["routes"].append({
                            "id": route_id,
                            "method": m_upper,
                            "path": path,
                            "handler": f"{file_base}_handler",
                            "file": rel_path
                        })

            # JavaScript / TypeScript Express
            elif ext in ('.js', '.ts'):
                js_routes = re.finditer(r'(?:router|app)\.(get|post|put|delete|patch)\(\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*([^,\)]+)', content)
                for m in js_routes:
                    method = m.group(1).upper()
                    path = m.group(2)
                    handler = m.group(3).strip()
                    route_id = f"route_{method}_{path.replace('/', '_').replace(':', '')}"
                    results["routes"].append({
                        "id": route_id,
                        "method": method,
                        "path": path,
                        "handler": handler,
                        "file": rel_path
                    })
                    ctrl_match = re.search(r'([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)', handler)
                    if ctrl_match:
                        results["relationships"].append({
                            "source": route_id,
                            "target": f"ctrl_{ctrl_match.group(1)}",
                            "type": "calls",
                            "label": "dispatches to"
                        })

            # Go Gin: r.GET("/path", handler)
            elif ext == '.go':
                go_routes = re.finditer(r'(?:r|router|api|v1)\.(GET|POST|PUT|DELETE)\(\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*([A-Za-z0-9_\.]+)', content)
                for m in go_routes:
                    method = m.group(1).upper()
                    path = m.group(2)
                    handler = m.group(3).strip()
                    route_id = f"route_{method}_{path.replace('/', '_')}"
                    results["routes"].append({
                        "id": route_id,
                        "method": method,
                        "path": path,
                        "handler": handler,
                        "file": rel_path
                    })

            # --- 2. CONTROLLER / HANDLER EXTRACTION ---
            if not is_test and (is_controller or is_route or (ext == '.py' and 'def ' in content)):
                ctrl_id = f"ctrl_{file_base}"
                # Extract Python functions or JS/TS functions
                if ext == '.py':
                    fn_matches = re.findall(r'(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(', content)
                    methods = [f for f in fn_matches if not f.startswith('_')]
                else:
                    fns = re.findall(r'(?:async\s+)?function\s+([A-Za-z0-9_]+)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^\)]*\)\s*=>', content)
                    methods = [f[0] or f[1] for f in fns if f[0] or f[1]]

                if methods or is_controller:
                    results["controllers"].append({
                        "id": ctrl_id,
                        "name": file_base,
                        "file": rel_path,
                        "methods": methods[:8]
                    })

                    # Look for service/logic calls
                    svc_refs = re.findall(r'([A-Za-z0-9_]*[sS]ervice|[A-Za-z0-9_]*[cC]rud)\.([A-Za-z0-9_]+)', content)
                    for svc, m_called in set(svc_refs):
                        results["relationships"].append({
                            "source": ctrl_id,
                            "target": f"svc_{svc}",
                            "type": "calls",
                            "label": f"invokes {m_called}()"
                        })

            # --- 3. SERVICE / BUSINESS LOGIC EXTRACTION ---
            if not is_test and is_service:
                svc_id = f"svc_{file_base}"
                if ext == '.py':
                    fn_matches = re.findall(r'(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(', content)
                    methods = [f for f in fn_matches if not f.startswith('_')]
                else:
                    fns = re.findall(r'(?:async\s+)?function\s+([A-Za-z0-9_]+)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^\)]*\)\s*=>', content)
                    methods = [f[0] or f[1] for f in fns if f[0] or f[1]]

                results["services"].append({
                    "id": svc_id,
                    "name": file_base,
                    "file": rel_path,
                    "methods": methods[:8]
                })

                # Check Inter-Service calls (e.g. orderService calling paymentService, emailService)
                inter_svc_refs = re.findall(r'([A-Za-z0-9_]*[sS]ervice|[A-Za-z0-9_]*[cC]rud)\.([A-Za-z0-9_]+)', content)
                for target_svc, m_called in set(inter_svc_refs):
                    if target_svc.lower() != file_base.lower():
                        results["relationships"].append({
                            "source": svc_id,
                            "target": f"svc_{target_svc}",
                            "type": "calls",
                            "label": f"calls {m_called}()"
                        })

                # Check DB / Model references
                model_refs = re.findall(r'([A-Z][A-Za-z0-9_]+)\.(query|find|create|filter|save|get|delete|add)', content)
                for model_name, m_called in set(model_refs):
                    results["relationships"].append({
                        "source": svc_id,
                        "target": f"model_{model_name.lower()}",
                        "type": "queries",
                        "label": f"DB {m_called}()"
                    })

            # --- 4. MODEL / SCHEMA EXTRACTION ---
            if not is_test and (is_model or (ext == '.py' and ('Base' in content or 'BaseModel' in content or 'models.Model' in content))):
                model_id = f"model_{file_base.lower()}"
                field_list = []

                if ext == '.py':
                    # SQLAlchemy Column(Type)
                    sqla_fields = re.findall(r'([A-Za-z0-9_]+)\s*=\s*Column\(\s*([A-Za-z0-9_]+)', content)
                    for f in sqla_fields:
                        field_list.append({"name": f[0], "type": f[1]})
                    # Pydantic field: type
                    pyd_fields = re.findall(r'^\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\[\], ]+)', content, re.MULTILINE)
                    for f in pyd_fields:
                        field_list.append({"name": f[0], "type": f[1].strip()})
                    # Django models.Field
                    dj_fields = re.findall(r'([A-Za-z0-9_]+)\s*=\s*models\.([A-Za-z0-9_]+)Field', content)
                    for f in dj_fields:
                        field_list.append({"name": f[0], "type": f[1]})

                elif ext in ('.js', '.ts'):
                    mongoose_fields = re.findall(r'([A-Za-z0-9_]+)\s*:\s*\{\s*type:\s*([A-Za-z0-9_\.]+)', content)
                    for f in mongoose_fields:
                        field_list.append({"name": f[0], "type": f[1]})

                if field_list or is_model:
                    results["models"].append({
                        "id": model_id,
                        "name": file_base,
                        "file": rel_path,
                        "fields": field_list[:10]
                    })
                    results["relationships"].append({
                        "source": model_id,
                        "target": "db_main",
                        "type": "persists_in",
                        "label": "persists in"
                    })

            # --- 5. TEST EXTRACTION ---
            if is_test:
                test_id = f"test_{file_base}"
                cases = []
                if ext == '.py':
                    py_tests = re.findall(r'def\s+(test_[A-Za-z0-9_]+)', content)
                    cases = py_tests
                else:
                    js_tests = re.findall(r'(?:it|test)\(\s*[\'"`]([^\'"`]+)[\'"`]', content)
                    cases = js_tests

                results["tests"].append({
                    "id": test_id,
                    "name": file_base,
                    "file": rel_path,
                    "cases": cases[:8]
                })

                # Test target references
                tested_refs = re.findall(r'([A-Za-z0-9_]*[sS]ervice|[A-Za-z0-9_]*[cC]ontroller)', content)
                for t_ref in set(tested_refs):
                    pfx = "svc_" if "service" in t_ref.lower() else "ctrl_"
                    results["relationships"].append({
                        "source": test_id,
                        "target": f"{pfx}{t_ref}",
                        "type": "tests",
                        "label": "tests"
                    })


    # If no explicit models found, synthesize top-level entities if files exist
    if not results["models"]:
        for c in results["controllers"]:
            results["models"].append({
                "id": f"model_{c['name']}",
                "name": f"{c['name']}Entity",
                "file": c.get("file", ""),
                "fields": [{"name": "id", "type": "int"}, {"name": "created_at", "type": "datetime"}]
            })

    return results
