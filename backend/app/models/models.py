"""
Modelos de base de datos — FinAnalytics
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    Date, Text, JSON, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base


class PlanEnum(str, enum.Enum):
    free = "free"
    creditos = "creditos"
    pro = "pro"


class EstadoPagoEnum(str, enum.Enum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"
    cancelado = "cancelado"


class ModoAnalisisEnum(str, enum.Enum):
    objetivo = "A"          # Modo A — análisis objetivo del sector
    empresa = "B"           # Modo B — acercarse a índices de empresa


# ─────────────────────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    nombre          = Column(String(255), nullable=False)
    firma           = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    plan            = Column(SAEnum(PlanEnum), default=PlanEnum.free, nullable=False)
    creditos        = Column(Integer, default=0, nullable=False)
    suscripcion_hasta = Column(Date, nullable=True)
    creditos_free_usados_este_mes = Column(Integer, default=0, nullable=False)
    mes_creditos_free = Column(String(7), nullable=True)  # "2025-01"
    es_admin        = Column(Boolean, default=False, nullable=False)
    activo          = Column(Boolean, default=True, nullable=False)
    session_token   = Column(String(64), nullable=True)   # token de sesión activa — una sola por usuario
    ultimo_ip       = Column(String(45), nullable=True)    # IP del último login
    ultimo_login    = Column(DateTime, nullable=True)      # fecha del último login
    creado_en       = Column(DateTime, default=datetime.utcnow, nullable=False)
    actualizado_en  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    analisis        = relationship("Analisis", back_populates="usuario")
    transacciones   = relationship("Transaccion", back_populates="usuario")


class DatasetSIIS(Base):
    """Registro de cada carga de datos de Supersociedades."""
    __tablename__ = "datasets_siis"

    id          = Column(Integer, primary_key=True, index=True)
    año         = Column(Integer, nullable=False)
    fecha_carga = Column(DateTime, default=datetime.utcnow, nullable=False)
    n_empresas  = Column(Integer, nullable=False)
    n_ciius     = Column(Integer, nullable=False)
    activo      = Column(Boolean, default=True, nullable=False)
    admin_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas          = Column(Text, nullable=True)
    periodo_datos  = Column(String(20), nullable=True)   # "2024-12-31" — detectado al cargar

    empresas    = relationship("EmpresaSIIS", back_populates="dataset")


class EmpresaSIIS(Base):
    """
    Una empresa del Excel de Supersociedades/SIIS.
    Solo se guardan las columnas estrictamente necesarias para
    calcular los 5 índices financieros (IL, IE, RCI, RP, RA).
    Los índices se calculan en memoria al ejecutar cada análisis.
    """
    __tablename__ = "empresas_siis"

    id         = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets_siis.id"), nullable=False, index=True)

    # ── Identificación ──────────────────────────────────────────────────────
    nit          = Column(String(20),  nullable=True, index=True)
    razon_social = Column(String(500), nullable=True)
    ciiu         = Column(String(10),  nullable=True, index=True)
    departamento = Column(String(100), nullable=True, index=True)
    ciudad       = Column(String(100), nullable=True)

    # ── Cifras financieras (miles de pesos, como reporta Supersociedades) ──
    # Solo las 7 cifras que entran en las fórmulas de los índices:
    activos_corrientes   = Column(Float, nullable=True)   # → IL, CT
    total_activos        = Column(Float, nullable=True)   # → IE, RA
    pasivos_corrientes   = Column(Float, nullable=True)   # → IL, CT
    total_pasivos        = Column(Float, nullable=True)   # → IE
    patrimonio           = Column(Float, nullable=True)   # → RP
    utilidad_operacional = Column(Float, nullable=True)   # → RCI, RP, RA
    costos_financieros   = Column(Float, nullable=True)   # → RCI

    dataset = relationship("DatasetSIIS", back_populates="empresas")


class Analisis(Base):
    """Cada análisis ejecutado por un usuario."""
    __tablename__ = "analisis"

    id              = Column(Integer, primary_key=True, index=True)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    dataset_id      = Column(Integer, ForeignKey("datasets_siis.id"), nullable=True)
    modo            = Column(SAEnum(ModoAnalisisEnum), nullable=False)
    ciius           = Column(JSON, nullable=False)          # ["F4290","F4321"]
    porcentaje_muestra = Column(Float, default=0.03)
    hi_umbral       = Column(Float, default=0.59)
    indices_empresa = Column(JSON, nullable=True)           # Solo modo B
    # Resultados guardados como JSON para no recalcular
    resultado_json  = Column(JSON, nullable=True)
    # Metadata
    n_poblacion     = Column(Integer, nullable=True)
    n_muestra       = Column(Integer, nullable=True)
    nombre          = Column(String(200), nullable=True)    # nombre personalizado del análisis
    credito_usado   = Column(Boolean, default=False)
    creado_en       = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario         = relationship("Usuario", back_populates="analisis")


class TipoTransaccionEnum(str, enum.Enum):
    pack5       = "pack5"           # 5 créditos
    pack15      = "pack15"          # 15 créditos
    pack30      = "pack30"          # 30 créditos
    pro_mensual = "pro_mensual"
    pro_trimestral = "pro_trimestral"
    pro_anual   = "pro_anual"


class Transaccion(Base):
    """Historial de pagos con Wompi."""
    __tablename__ = "transacciones"

    id                  = Column(Integer, primary_key=True, index=True)
    usuario_id          = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    tipo                = Column(SAEnum(TipoTransaccionEnum), nullable=False)
    monto_cop           = Column(Integer, nullable=False)        # en pesos (no centavos)
    creditos_comprados  = Column(Integer, default=0)
    estado              = Column(SAEnum(EstadoPagoEnum), default=EstadoPagoEnum.pendiente)
    # Wompi refs
    wompi_id            = Column(String(100), nullable=True, index=True)   # id transacción Wompi
    wompi_referencia    = Column(String(100), nullable=True, index=True)   # referencia interna
    wompi_response      = Column(JSON, nullable=True)                      # payload completo
    # Suscripción
    suscripcion_hasta   = Column(Date, nullable=True)    # fecha fin que se activa
    creado_en           = Column(DateTime, default=datetime.utcnow, nullable=False)
    acreditado_en       = Column(DateTime, nullable=True)  # cuando se procesó el webhook

    usuario             = relationship("Usuario", back_populates="transacciones")


class CodigoCIIU(Base):
    """Tabla de referencia de códigos CIIU para el selector del frontend."""
    __tablename__ = "codigos_ciiu"

    codigo      = Column(String(10), primary_key=True)
    descripcion = Column(String(500), nullable=False)
    seccion     = Column(String(5), nullable=True)    # "F", "G", etc.
    division    = Column(String(5), nullable=True)    # "43", "47", etc.