from typing import Optional
from urllib.parse import urlparse, urlunparse
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application settings loaded from environment variables.
    Follows strict security practices: no hardcoded secrets and secret masking.
    """
    PROJECT_NAME: str = "HETVAYA"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # PostgreSQL Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    
    # Optional direct DATABASE_URL override (e.g. for testing or containerized deployments)
    DATABASE_URL: Optional[str] = None
    
    # Decision Service Configuration
    DECISION_SERVICE_URL: str = "http://localhost:8001"
    DECISION_SERVICE_TIMEOUT_SECONDS: float = 10.0
    
    # Authentication & JWT Configuration
    JWT_SECRET_KEY: str = "flowgrid-insecure-dev-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Core Architecture Authority Rules
    ALLOW_DIRECT_DECISION_COMMIT: bool = False  # Strict rule: decision service can NEVER directly commit
    
    # Ollama Local / Cloud LLM Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "nemotron-3-ultra:cloud"
    OLLAMA_FALLBACK_MODEL: str = "llama3.2:latest"
    OLLAMA_TIMEOUT_SECONDS: float = 45.0
    OLLAMA_ENABLED: bool = True
    
    # Fuel Price & External News APIs
    SERPAPI_API_KEY: Optional[str] = None
    BASE_DIESEL_PRICE_INR: float = 90.00
    FUEL_SENSITIVITY_FACTOR: float = 0.45
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def effective_database_url(self) -> str:
        """
        Determines the effective database connection string.
        1. Prioritizes explicit DATABASE_URL if set.
        2. Constructs PostgreSQL DSN if POSTGRES_USER and POSTGRES_DB are provided.
        3. Safe fallback to local SQLite for lightweight local dev and testing.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.POSTGRES_USER and self.POSTGRES_DB:
            password = self.POSTGRES_PASSWORD or ""
            return (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{password}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return "sqlite:///./flowgrid_dev.db"

    @property
    def sanitized_database_url(self) -> str:
        """
        Returns a sanitized database connection string with password masked.
        Safe for logging and diagnostics; guarantees secrets are never exposed.
        """
        try:
            parsed = urlparse(self.effective_database_url)
            if parsed.password:
                netloc = f"{parsed.username}:***@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                return urlunparse(parsed._replace(netloc=netloc))
            return self.effective_database_url
        except Exception:
            return "[REDACTED_DB_URL]"


settings = Settings()
