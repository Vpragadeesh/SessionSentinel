from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    postgres_user: str = "sessionsentinel"
    postgres_password: str = "sessionsentinel"
    postgres_db: str = "sessionsentinel"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_sslmode: Optional[str] = None

    groq_api_key: Optional[str] = None
    nvidia_nim_api_key: Optional[str] = None
    agent_inactivity_reset_hours: int = 24

    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True

    @property
    def database_url(self) -> str:
        url = (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        if self.postgres_sslmode:
            url += f"?sslmode={self.postgres_sslmode}"
        return url

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()