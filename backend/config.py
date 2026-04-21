from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://priceiq:priceiq@localhost:5432/priceiq"
    redis_url: str = "redis://localhost:6379/0"

    telegram_bot_token: str = ""
    telegram_group_id: str = ""
    telegram_admin_chat_id: str = ""

    anthropic_api_key: str = ""

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_min: int = 30
    jwt_refresh_token_expire_days: int = 7

    initial_admin_email: str = "admin@example.com"
    initial_admin_password: str = "changeme123!"

    alert_price_surge_threshold: float = 0.10
    alert_regional_overheat_threshold: float = 0.15

    agg_round1_time: str = "12:00"
    agg_round2_time: str = "17:00"

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
