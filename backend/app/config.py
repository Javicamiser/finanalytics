from pathlib import Path
from pydantic_settings import BaseSettings

# Busca el .env en la carpeta actual, en backend/ y en la raíz del proyecto
# Así funciona sin importar desde dónde se ejecute uvicorn
def _find_env() -> str:
    for candidate in [
        Path(".env"),                          # donde se ejecuta uvicorn
        Path(__file__).parent.parent / ".env", # backend/.env
        Path(__file__).parent.parent.parent / ".env",  # raíz finanalytics/.env
    ]:
        if candidate.exists():
            return str(candidate)
    return ".env"  # fallback — usará variables de entorno del sistema

class Settings(BaseSettings):
    # Base de datos — Railway inyecta DATABASE_URL automáticamente
    database_url: str = "postgresql://postgres:password@localhost:5432/finanalytics_db"

    # Seguridad JWT
    secret_key: str = "dev_secret_key_reemplazar_en_produccion"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 días
    refresh_token_expire_days: int = 7

    # Wompi
    wompi_public_key: str = ""          # pub_test_... o pub_prod_...
    wompi_private_key: str = ""         # prv_test_... o prv_prod_...
    wompi_events_secret: str = ""       # para verificar webhooks
    wompi_integrity_secret: str = ""    # para firmar transacciones
    wompi_mode: str = "sandbox"         # "sandbox" o "production"

    # Precios en pesos colombianos (centavos para Wompi — multiplica x 100)
    # Créditos sueltos
    precio_pack5_cop: int = 125000      # 5 créditos
    precio_pack15_cop: int = 300000     # 15 créditos
    precio_pack30_cop: int = 500000     # 30 créditos
    # Suscripción Pro
    precio_pro_mensual_cop: int = 220000
    precio_pro_trimestral_cop: int = 594000   # 10% dcto
    precio_pro_anual_cop: int = 2112000       # 20% dcto
    # Free
    creditos_free_por_mes: int = 1

    # Entorno
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = ""   # URLs separadas por coma para CORS en producción

    class Config:
        env_file = _find_env()
        extra = "ignore"

settings = Settings()