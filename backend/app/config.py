from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""

    embedding_provider: str = ""
    embedding_model: str = ""
    embedding_api_key: str = ""

    cognee_service_url: str = ""
    cognee_api_key: str = ""
    cognee_user_id: str = ""

    supabase_url: str = ""
    supabase_key: str = ""


settings = Settings()
