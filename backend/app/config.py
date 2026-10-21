import os
from pydantic_settings import BaseSettings

BASE_REFORGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(BASE_REFORGE_DIR, 'reforge.db').replace('\\', '/')

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "codellama"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DB_PATH}"
    GITHUB_TOKEN: str | None = None
    MAX_REPAIR_ATTEMPTS: int = 3
    UPLOAD_DIR: str = os.path.join(BASE_REFORGE_DIR, "uploads")
    PROJECTS_DIR: str = os.path.join(BASE_REFORGE_DIR, "projects")
    SAMPLE_PROJECT_DIR: str = os.path.join(BASE_REFORGE_DIR, "sample-project")
    DEMO_MODE: bool = True

    class Config:
        env_file = (os.path.join(BASE_REFORGE_DIR, ".env"), ".env")
        extra = "ignore"

settings = Settings()
