"""
Router de pagos — Wompi Colombia
─────────────────────────────────────────────────────────────────
Endpoints:
  GET  /api/pagos/planes           → catálogo de planes
  POST /api/pagos/iniciar          → genera referencia + firma
  POST /api/pagos/webhook          → recibe notificación de Wompi
  GET  /api/pagos/estado/{ref}     → estado de una transacción
  GET  /api/pagos/historial        → historial del usuario
"""
import hashlib
import hmac as hmac_lib
import json
import uuid
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import (
    Usuario, Transaccion, TipoTransaccionEnum,
    EstadoPagoEnum, PlanEnum
)
from app.core.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])

# ── Catálogo de planes ─────────────────────────────────────────────────────
PLANES = {
    "pack5": {
        "nombre": "Pack 5 créditos", "descripcion": "5 análisis financieros",
        "monto_cop": settings.precio_pack5_cop, "creditos": 5,
        "tipo": TipoTransaccionEnum.pack5, "es_sub": False,
    },
    "pack15": {
        "nombre": "Pack 15 créditos", "descripcion": "15 análisis financieros",
        "monto_cop": settings.precio_pack15_cop, "creditos": 15,
        "tipo": TipoTransaccionEnum.pack15, "es_sub": False,
    },
    "pack30": {
        "nombre": "Pack 30 créditos", "descripcion": "30 análisis financieros",
        "monto_cop": settings.precio_pack30_cop, "creditos": 30,
        "tipo": TipoTransaccionEnum.pack30, "es_sub": False,
    },
    "pro_mensual": {
        "nombre": "Plan Pro Mensual", "descripcion": "Análisis ilimitados por 1 mes",
        "monto_cop": settings.precio_pro_mensual_cop, "creditos": 0,
        "tipo": TipoTransaccionEnum.pro_mensual, "es_sub": True, "dias": 30,
    },
    "pro_trimestral": {
        "nombre": "Plan Pro Trimestral", "descripcion": "Análisis ilimitados por 3 meses",
        "monto_cop": settings.precio_pro_trimestral_cop, "creditos": 0,
        "tipo": TipoTransaccionEnum.pro_trimestral, "es_sub": True, "dias": 90,
    },
    "pro_anual": {
        "nombre": "Plan Pro Anual", "descripcion": "Análisis ilimitados por 1 año",
        "monto_cop": settings.precio_pro_anual_cop, "creditos": 0,
        "tipo": TipoTransaccionEnum.pro_anual, "es_sub": True, "dias": 365,
    },
}


def _firma_integridad(referencia: str, monto_centavos: int, moneda: str) -> str:
    """SHA-256(referencia + monto + moneda + integrity_secret)"""
    cadena = f"{referencia}{monto_centavos}{moneda}{settings.wompi_integrity_secret}"
    return hashlib.sha256(cadena.encode()).hexdigest()


def _acreditar(usuario: Usuario, txn: Transaccion, db: Session):
    """Acredita créditos o activa suscripción según tipo de plan."""
    plan = PLANES.get(txn.tipo.value, {})
    if plan.get("es_sub"):
        base        = max(date.today(), usuario.suscripcion_hasta or date.today())
        nueva_fecha = base + timedelta(days=plan["dias"])
        usuario.suscripcion_hasta = nueva_fecha
        usuario.plan  = PlanEnum.pro
        txn.suscripcion_hasta = nueva_fecha
    else:
        usuario.creditos = (usuario.creditos or 0) + plan["creditos"]
        if usuario.plan == PlanEnum.free:
            usuario.plan = PlanEnum.creditos
    txn.estado        = EstadoPagoEnum.aprobado
    txn.acreditado_en = datetime.utcnow()
    db.commit()


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/planes")
def listar_planes():
    return {
        k: {
            "id": k, "nombre": p["nombre"], "descripcion": p["descripcion"],
            "monto_cop": p["monto_cop"], "creditos": p["creditos"],
            "es_sub": p["es_sub"], "dias": p.get("dias"),
        }
        for k, p in PLANES.items()
    }


@router.post("/iniciar")
def iniciar_pago(
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    plan_id = payload.get("plan_id")
    if plan_id not in PLANES:
        raise HTTPException(400, f"Plan '{plan_id}' no existe")

    plan           = PLANES[plan_id]
    referencia     = f"FA-{user.id}-{plan_id}-{uuid.uuid4().hex[:8].upper()}"
    monto_centavos = plan["monto_cop"] * 100

    txn = Transaccion(
        usuario_id=user.id,
        tipo=plan["tipo"],
        monto_cop=plan["monto_cop"],
        creditos_comprados=plan["creditos"],
        estado=EstadoPagoEnum.pendiente,
        wompi_referencia=referencia,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return {
        "referencia":     referencia,
        "monto_centavos": monto_centavos,
        "moneda":         "COP",
        "firma":          _firma_integridad(referencia, monto_centavos, "COP"),
        "public_key":     settings.wompi_public_key,
        "redirect_url":   f"{settings.frontend_url}/pago/resultado?ref={referencia}",
        "plan":           {k: v for k, v in plan.items() if k != "tipo"},
        "txn_id":         txn.id,
    }


@router.post("/webhook")
async def webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_event_checksum: str = Header(None, alias="x-event-checksum"),
):
    body_bytes = await request.body()
    body_str   = body_bytes.decode("utf-8")

    if not body_str.strip():
        return {"ok": True, "ignorado": True, "razon": "body vacío"}

    # Verificar firma HMAC-SHA256
    if settings.wompi_events_secret and x_event_checksum:
        firma_esp = hmac_lib.new(
            settings.wompi_events_secret.encode(),
            body_str.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac_lib.compare_digest(firma_esp, x_event_checksum):
            raise HTTPException(401, "Firma de webhook inválida")

    try:
        data = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(400, "Body inválido")

    evento  = data.get("event", "")
    if evento != "transaction.updated":
        return {"ok": True, "ignorado": True}

    txn_data   = data.get("data", {}).get("transaction", {})
    referencia = txn_data.get("reference")
    estado     = txn_data.get("status")  # APPROVED | DECLINED | VOIDED | ERROR

    txn = db.query(Transaccion).filter(
        Transaccion.wompi_referencia == referencia
    ).first()

    if not txn or txn.estado == EstadoPagoEnum.aprobado:
        return {"ok": True, "ignorado": True}

    txn.wompi_id       = txn_data.get("id")
    txn.wompi_response = txn_data

    if estado == "APPROVED":
        usuario = db.query(Usuario).filter(Usuario.id == txn.usuario_id).first()
        if usuario:
            _acreditar(usuario, txn, db)
    elif estado in ("DECLINED", "VOIDED", "ERROR"):
        txn.estado = EstadoPagoEnum.rechazado
        db.commit()

    return {"ok": True}


@router.get("/estado/{referencia}")
def estado_pago(
    referencia: str,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    txn = db.query(Transaccion).filter(
        Transaccion.wompi_referencia == referencia,
        Transaccion.usuario_id == user.id,
    ).first()
    if not txn:
        raise HTTPException(404, "Transacción no encontrada")
    return {
        "referencia": txn.wompi_referencia, "estado": txn.estado.value,
        "tipo": txn.tipo.value, "monto_cop": txn.monto_cop,
        "creditos": txn.creditos_comprados, "creado_en": txn.creado_en,
        "acreditado_en": txn.acreditado_en, "suscripcion_hasta": txn.suscripcion_hasta,
    }


@router.get("/historial")
def historial_pagos(
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    rows = db.query(Transaccion).filter(
        Transaccion.usuario_id == user.id
    ).order_by(Transaccion.creado_en.desc()).limit(50).all()
    return [
        {
            "id": t.id, "tipo": t.tipo.value, "monto_cop": t.monto_cop,
            "creditos": t.creditos_comprados, "estado": t.estado.value,
            "referencia": t.wompi_referencia, "creado_en": t.creado_en,
            "acreditado_en": t.acreditado_en, "suscripcion_hasta": t.suscripcion_hasta,
        }
        for t in rows
    ]