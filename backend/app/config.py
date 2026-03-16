from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base de datos
    database_url: str = "postgresql://finanalytics:1234@localhost:5432/finanalytics_db"

    # Seguridad JWT
    secret_key: str = "dev_secret_key_reemplazar_en_produccion"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # PayU
    payu_api_key: str = ""
    payu_merchant_id: str = ""
    payu_account_id: str = ""
    payu_mode: str = "sandbox"

    # Planes
    precio_credito_cop: int = 25000
    precio_suscripcion_mensual_cop: int = 220000
    creditos_free_por_mes: int = 2

    # Entorno
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
