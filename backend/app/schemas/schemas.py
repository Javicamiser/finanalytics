"""Schemas Pydantic — FinAnalytics"""
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, EmailStr, field_validator


# ─── Auth ──────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    email: EmailStr
    nombre: str
    firma: str | None = None
    password: str

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    firma: str | None
    plan: str
    creditos: int
    suscripcion_hasta: date | None
    es_admin: bool
    creado_en: datetime
    class Config:
        from_attributes = True


# ─── Análisis ──────────────────────────────────────────────────────────────

class ConfigAnalisisIn(BaseModel):
    ciius: list[str]
    modo: str = "A"                           # "A" | "B"
    indices_empresa: dict[str, float] | None = None
    porcentaje_muestra: float = 0.03
    hi_umbral: float = 0.59
    año_datos: int | None = None
    dataset_id: int | None = None
    n_empresas_b: int | None = None           # Modo B: número fijo de empresas            # None = usar el más reciente

    @field_validator("ciius")
    @classmethod
    def ciius_no_vacios(cls, v):
        if not v:
            raise ValueError("Debe seleccionar al menos un código CIIU")
        return v

    @field_validator("modo")
    @classmethod
    def modo_valido(cls, v):
        if v not in ("A", "B"):
            raise ValueError("El modo debe ser 'A' o 'B'")
        return v

    @field_validator("porcentaje_muestra")
    @classmethod
    def pct_valido(cls, v):
        if not (0.01 <= v <= 1.0):
            raise ValueError("El porcentaje de muestra debe estar entre 1% y 100%")
        return v


class AnalisisOut(BaseModel):
    id: int
    modo: str
    ciius: list[str]
    n_poblacion: int | None
    n_muestra: int | None
    resultado_json: dict[str, Any] | None
    creado_en: datetime
    class Config:
        from_attributes = True


# ─── Datos SIIS ────────────────────────────────────────────────────────────

class DatasetOut(BaseModel):
    id: int
    año: int
    fecha_carga: datetime
    n_empresas: int
    n_ciius: int
    activo: bool
    notas: str | None
    periodo_datos: str | None   # "2024-12-31" — corte detectado automáticamente
    class Config:
        from_attributes = True


# ─── Pagos ─────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    tipo: str          # "credito" | "suscripcion"
    cantidad: int = 1  # número de créditos (ignorado para suscripción)

class TransaccionOut(BaseModel):
    id: int
    tipo: str
    monto_cop: int
    creditos_comprados: int
    estado: str
    creado_en: datetime
    class Config:
        from_attributes = True


# ─── CIIU ──────────────────────────────────────────────────────────────────

class CIIUOut(BaseModel):
    codigo: str
    descripcion: str
    seccion: str | None
    division: str | None
    class Config:
        from_attributes = True