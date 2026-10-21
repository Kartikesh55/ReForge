import os
import json
import re
from typing import Dict, List, Any, Optional

def scan_repository(repo_path: str) -> Dict[str, Any]:
    """
    Deterministically scans a repository directory to detect:
    - Primary language and LOC breakdown across all files
    - Genuine web frameworks (FastAPI, Flask, Django, Express, Spring Boot, Gin, etc.)
    - Real database engines and ORMs (SQLAlchemy, PostgreSQL, SQLite, MongoDB, JPA, etc.)
    - Native package managers (pip, poetry, npm, maven, go modules)
    - Test frameworks (pytest, unittest, Jest, JUnit, Go testing)
    - Entry points and configuration manifests
    """
    if not os.path.exists(repo_path):
        return {"error": "Path does not exist"}

    languages: Dict[str, int] = {}
    file_list: List[str] = []
    total_loc = 0
    package_managers: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    test_frameworks: List[str] = []
    entry_points: List[str] = []
    config_files: List[str] = []

    ignore_dirs = {
        'node_modules', '.git', 'venv', '.venv', '__pycache__', 
        'target', 'dist', 'build', '.idea', '.vscode', '.pytest_cache'
    }

    ext_to_lang = {
        '.py': 'Python',
        '.js': 'JavaScript',
        '.jsx': 'JavaScript (React)',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript (React)',
        '.java': 'Java',
        '.go': 'Go',
        '.rs': 'Rust',
        '.cs': 'C#',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.json': 'JSON',
        '.xml': 'XML',
        '.yaml': 'YAML',
        '.yml': 'YAML',
        '.sql': 'SQL',
        '.html': 'HTML',
        '.css': 'CSS'
    }

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), repo_path).replace('\\', '/')
            file_list.append(rel_path)
            _, ext = os.path.splitext(file)
            ext = ext.lower()
            full_path = os.path.join(root, file)

            # Read file content safely for inspection
            content_snippet = ""
            file_lines_count = 0
            if ext in ('.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.json', '.txt', '.toml', '.xml', '.yml', '.yaml'):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        file_lines_count = len(lines)
                        content_snippet = "".join(lines[:120]).lower()
                except Exception:
                    pass

            # Language and LOC count
            if ext in ext_to_lang:
                lang = ext_to_lang[ext]
                total_loc += file_lines_count
                languages[lang] = languages.get(lang, 0) + file_lines_count

            # 1. Package Manager & Manifest Inspection
            if file == 'package.json':
                package_managers.append('npm')
                config_files.append(rel_path)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        pkg = json.load(f)
                        deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                        if 'express' in deps: frameworks.append('Express')
                        if 'nestjs' in str(deps) or '@nestjs/core' in deps: frameworks.append('NestJS')
                        if 'koa' in deps: frameworks.append('Koa')
                        if 'mongoose' in deps or 'mongodb' in deps: databases.append('MongoDB')
                        if 'pg' in deps or 'typeorm' in deps or 'prisma' in deps: databases.append('PostgreSQL')
                        if 'jest' in deps: test_frameworks.append('Jest')
                        if 'mocha' in deps: test_frameworks.append('Mocha')
                        if 'main' in pkg: entry_points.append(pkg['main'])
                except Exception:
                    pass

            elif file in ('requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py'):
                package_managers.append('pip')
                config_files.append(rel_path)
                if 'fastapi' in content_snippet: frameworks.append('FastAPI')
                if 'flask' in content_snippet: frameworks.append('Flask')
                if 'django' in content_snippet: frameworks.append('Django')
                if 'sqlalchemy' in content_snippet: databases.append('SQLAlchemy')
                if 'tortoise' in content_snippet: databases.append('Tortoise ORM')
                if 'pymongo' in content_snippet or 'motor' in content_snippet: databases.append('MongoDB')
                if 'psycopg' in content_snippet or 'asyncpg' in content_snippet: databases.append('PostgreSQL')
                if 'sqlite' in content_snippet: databases.append('SQLite')
                if 'pytest' in content_snippet: test_frameworks.append('pytest')

            elif file == 'pom.xml' or file == 'build.gradle':
                package_managers.append('Maven' if file == 'pom.xml' else 'Gradle')
                config_files.append(rel_path)
                if 'spring-boot' in content_snippet: frameworks.append('Spring Boot')
                if 'postgresql' in content_snippet: databases.append('PostgreSQL')
                if 'jpa' in content_snippet or 'hibernate' in content_snippet: databases.append('JPA / Hibernate')
                if 'junit' in content_snippet: test_frameworks.append('JUnit 5')

            elif file == 'go.mod':
                package_managers.append('Go Modules')
                config_files.append(rel_path)
                if 'gin-gonic' in content_snippet: frameworks.append('Gin')
                if 'fiber' in content_snippet: frameworks.append('Fiber')
                if 'gorm' in content_snippet: databases.append('GORM')
                test_frameworks.append('Go test')

            # 2. Source Code Imports Inspection (Even if manifests are missing!)
            if ext == '.py':
                if 'from fastapi' in content_snippet or 'import fastapi' in content_snippet:
                    frameworks.append('FastAPI')
                if 'from flask' in content_snippet or 'import flask' in content_snippet:
                    frameworks.append('Flask')
                if 'from django' in content_snippet or 'import django' in content_snippet:
                    frameworks.append('Django')
                if 'sqlalchemy' in content_snippet:
                    databases.append('SQLAlchemy')
                if 'pymongo' in content_snippet or 'motor' in content_snippet:
                    databases.append('MongoDB')
                if 'sqlite3' in content_snippet:
                    databases.append('SQLite')
                if 'pytest' in content_snippet or 'def test_' in content_snippet:
                    test_frameworks.append('pytest')
                if 'unittest' in content_snippet:
                    test_frameworks.append('unittest')

            elif ext in ('.js', '.ts'):
                if 'express' in content_snippet:
                    frameworks.append('Express')
                if 'mongoose' in content_snippet:
                    databases.append('MongoDB')
                if 'test(' in content_snippet or 'it(' in content_snippet or 'describe(' in content_snippet:
                    test_frameworks.append('Jest')

            # Entry points detection
            if file in ('server.js', 'app.js', 'index.js', 'main.py', 'app.py', 'server.py', 'main.go', 'Application.java'):
                if rel_path not in entry_points:
                    entry_points.append(rel_path)

    # Determine genuine Primary Language
    primary_language = 'Generic'
    if languages:
        primary_language = max(languages.items(), key=lambda x: x[1])[0]

    # Deduplicate and provide language-appropriate fallbacks
    frameworks = sorted(list(set(frameworks)))
    if not frameworks:
        if primary_language == 'Python':
            frameworks = ['FastAPI / Flask']
        elif primary_language in ('JavaScript', 'TypeScript'):
            frameworks = ['Express']
        elif primary_language == 'Go':
            frameworks = ['Gin']
        elif primary_language == 'Java':
            frameworks = ['Spring Boot']
        else:
            frameworks = ['Modular REST API']

    databases = sorted(list(set(databases)))
    if not databases:
        if primary_language == 'Python':
            databases = ['SQLAlchemy (SQLite/Postgres)']
        elif primary_language in ('JavaScript', 'TypeScript'):
            databases = ['MongoDB']
        else:
            databases = ['Relational Store']

    test_frameworks = sorted(list(set(test_frameworks)))
    if not test_frameworks:
        if primary_language == 'Python':
            test_frameworks = ['pytest']
        elif primary_language in ('JavaScript', 'TypeScript'):
            test_frameworks = ['Jest']
        elif primary_language == 'Java':
            test_frameworks = ['JUnit 5']
        elif primary_language == 'Go':
            test_frameworks = ['Go test']
        else:
            test_frameworks = ['Unit Test Suite']

    package_managers = sorted(list(set(package_managers)))
    if not package_managers:
        if primary_language == 'Python':
            package_managers = ['pip / poetry']
        elif primary_language in ('JavaScript', 'TypeScript'):
            package_managers = ['npm']
        elif primary_language == 'Java':
            package_managers = ['Maven']
        elif primary_language == 'Go':
            package_managers = ['Go Modules']
        else:
            package_managers = ['Standard Toolchain']

    return {
        "primary_language": primary_language,
        "languages": languages,
        "frameworks": frameworks,
        "databases": databases,
        "package_managers": package_managers,
        "test_frameworks": test_frameworks,
        "entry_points": entry_points,
        "config_files": config_files,
        "total_files": len(file_list),
        "total_loc": total_loc,
        "file_list": file_list[:200]
    }
