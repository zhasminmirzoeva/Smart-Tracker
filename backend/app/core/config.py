# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ORIGINS: str = "*"

    UPLOAD_DIR: str = "uploads"         # относительный путь внутри контейнера
    MAX_UPLOAD_MB: int = 5              # лимит на размер файла
    PUBLIC_BASE_URL: str | None = None  # если задан, делать абсолютные URL (напр. https://expiry-api.onrender.com)

    # OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    def normalized_db_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        parsed = urlparse(url)
        if parsed.hostname not in ("localhost", "127.0.0.1"):
            q = parse_qs(parsed.query)
            if "sslmode" not in q:
                q["sslmode"] = ["require"]
            url = urlunparse(parsed._replace(query=urlencode(q, doseq=True)))
        return url

settings = Settings()
