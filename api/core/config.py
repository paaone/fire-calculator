from __future__ import annotations

import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    cache_ttl_days: int = 30

    @staticmethod
    def from_env() -> "Settings":
        # Simple env loader without extra deps
        def env_list(name: str, default: list[str]) -> list[str]:
            raw = os.getenv(name)
            if not raw:
                return default
            return [x.strip() for x in raw.split(",") if x.strip()]

        return Settings(
            api_prefix=os.getenv("API_PREFIX", "/api/v1"),
            cors_origins=env_list("CORS_ORIGINS", [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]),
            cache_ttl_days=int(os.getenv("CACHE_TTL_DAYS", "30")),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()

