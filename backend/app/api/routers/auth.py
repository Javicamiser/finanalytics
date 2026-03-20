import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Usuario
from app.schemas.schemas import UsuarioCreate, UsuarioLogin, Token, UsuarioOut
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=UsuarioOut, status_code=201)
def register(data: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(400, "El email ya está registrado")
    user = Usuario(
        email=data.email,
        nombre=data.nombre,
        firma=data.firma,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(data: UsuarioLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == data.email, Usuario.activo == True).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    # Sesión única — invalidar sesión anterior si existe
    session_tok        = secrets.token_hex(32)
    user.session_token = session_tok
    user.ultimo_login  = datetime.utcnow()
    # Guardar IP del cliente
    client_ip = request.client.host if request.client else "unknown"
    user.ultimo_ip = client_ip
    db.commit()

    token = create_access_token({"sub": str(user.id), "sid": session_tok})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UsuarioOut)
def me(user: Usuario = Depends(get_current_user)):
    return user


@router.post("/refresh")
def refresh_token(
    current_user: Usuario = Depends(get_current_user),
):
    """Renueva el token JWT manteniendo el session_token activo."""
    nuevo_token = create_access_token({
        "sub": str(current_user.id),
        "sid": current_user.session_token or "",
    })
    return {"access_token": nuevo_token, "token_type": "bearer"}

@router.patch("/perfil")
def actualizar_perfil(
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Actualiza nombre o firma del usuario."""
    if "nombre" in payload and payload["nombre"].strip():
        user.nombre = payload["nombre"].strip()[:255]
    if "firma" in payload:
        user.firma = payload["firma"].strip()[:255]
    db.commit()
    db.refresh(user)
    return user


@router.post("/cambiar-password")
def cambiar_password(
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Cambia la contraseña verificando la actual."""
    if not verify_password(payload.get("password_actual", ""), user.hashed_password):
        raise HTTPException(400, "La contraseña actual es incorrecta")
    nueva = payload.get("password_nuevo", "")
    if len(nueva) < 8:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 8 caracteres")
    user.hashed_password = hash_password(nueva)
    db.commit()
    return {"ok": True}


@router.get("/usuarios")
def listar_usuarios(
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Lista todos los usuarios — solo admins."""
    if not user.es_admin:
        raise HTTPException(403, "Acceso solo para administradores")
    return db.query(Usuario).order_by(Usuario.creado_en.desc()).all()


@router.patch("/usuarios/{uid}")
def actualizar_usuario(
    uid: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Actualiza plan o rol de un usuario — solo admins."""
    if not user.es_admin:
        raise HTTPException(403, "Acceso solo para administradores")
    target = db.query(Usuario).filter(Usuario.id == uid).first()
    if not target:
        raise HTTPException(404, "Usuario no encontrado")
    if "plan" in payload:
        from app.models.models import PlanEnum
        from datetime import date, timedelta
        target.plan = PlanEnum(payload["plan"])
        # Al asignar Pro manualmente, dar 1 año de suscripción si no tiene fecha
        if payload["plan"] == "pro" and not target.suscripcion_hasta:
            target.suscripcion_hasta = date.today() + timedelta(days=365)
        # Al bajar a free o créditos, limpiar suscripción
        if payload["plan"] in ("free", "creditos"):
            target.suscripcion_hasta = None
    if "es_admin" in payload:
        target.es_admin = bool(payload["es_admin"])
    if "creditos" in payload:
        target.creditos = int(payload["creditos"])
    db.commit()
    return {"ok": True}