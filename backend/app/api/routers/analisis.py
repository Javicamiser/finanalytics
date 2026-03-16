import io, zipfile
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Usuario, Analisis, DatasetSIIS, EmpresaSIIS, ModoAnalisisEnum
from app.schemas.schemas import ConfigAnalisisIn, AnalisisOut
from app.core.auth import get_current_user
from app.core.motor import MotorAnalisis, ConfigAnalisis, ExportadorExcel, GeneradorGraficas, COL
import pandas as pd

router = APIRouter(prefix="/analisis", tags=["Análisis"])


def _verificar_acceso(user: Usuario, db: Session) -> None:
    """Verifica que el usuario tenga créditos o suscripción vigente."""
    from datetime import date
    if user.plan == "pro" and user.suscripcion_hasta and user.suscripcion_hasta >= date.today():
        return  # suscripción activa → acceso libre

    if user.plan == "creditos" and user.creditos > 0:
        return  # tiene créditos

    # Plan free: verificar límite mensual
    mes_actual = date.today().strftime("%Y-%m")
    if user.mes_creditos_free != mes_actual:
        user.creditos_free_usados_este_mes = 0
        user.mes_creditos_free = mes_actual
        db.commit()

    from app.config import settings
    if user.creditos_free_usados_este_mes < settings.creditos_free_por_mes:
        return

    raise HTTPException(
        402,
        detail="Sin créditos disponibles. Compra créditos o suscríbete al plan Pro."
    )


def _consumir_credito(user: Usuario, db: Session) -> None:
    """Descuenta un crédito o registra uso del plan free."""
    from datetime import date
    mes_actual = date.today().strftime("%Y-%m")
    if user.plan == "pro":
        return
    elif user.plan == "creditos" and user.creditos > 0:
        user.creditos -= 1
    else:
        user.creditos_free_usados_este_mes += 1
        user.mes_creditos_free = mes_actual
    db.commit()


def _cargar_df_desde_bd(dataset_id: int | None, db: Session) -> pd.DataFrame:
    """Carga el dataset SIIS desde la BD y lo convierte en DataFrame.
    Solo incluye las columnas que el motor necesita — nada más."""
    if dataset_id:
        dataset = db.query(DatasetSIIS).filter(
            DatasetSIIS.id == dataset_id, DatasetSIIS.activo == True
        ).first()
    else:
        dataset = db.query(DatasetSIIS).filter(
            DatasetSIIS.activo == True
        ).order_by(DatasetSIIS.fecha_carga.desc()).first()

    if not dataset:
        raise HTTPException(404, "No hay datos SIIS cargados. Contacte al administrador.")

    empresas = db.query(EmpresaSIIS).filter(EmpresaSIIS.dataset_id == dataset.id).all()
    if not empresas:
        raise HTTPException(404, "El dataset no contiene empresas.")

    # Construir DataFrame con exactamente las columnas que necesita el motor
    rows = [{
        COL["nit"]:        e.nit,
        COL["nombre"]:     e.razon_social,
        COL["ciiu"]:       e.ciiu,
        COL["dpto"]:       e.departamento,
        COL["ciudad"]:     e.ciudad,
        COL["act_corr"]:   e.activos_corrientes,
        COL["act_total"]:  e.total_activos,
        COL["pas_corr"]:   e.pasivos_corrientes,
        COL["pas_total"]:  e.total_pasivos,
        COL["patrimonio"]: e.patrimonio,
        COL["util_op"]:    e.utilidad_operacional,
        COL["gastos_int"]: e.costos_financieros,
    } for e in empresas]
    return pd.DataFrame(rows)


# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/ejecutar", response_model=AnalisisOut, status_code=201)
def ejecutar_analisis(
    config_in: ConfigAnalisisIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    _verificar_acceso(user, db)

    # Cargar datos
    df = _cargar_df_desde_bd(config_in.dataset_id, db)

    # Ejecutar motor
    config = ConfigAnalisis(
        ciius=config_in.ciius,
        modo=config_in.modo,
        indices_empresa=config_in.indices_empresa,
        porcentaje_muestra=config_in.porcentaje_muestra,
        hi_umbral=config_in.hi_umbral,
        año_datos=config_in.año_datos,
    )
    try:
        motor = MotorAnalisis(df)
        resultado = motor.ejecutar(config)
    except ValueError as e:
        raise HTTPException(422, str(e))

    # Guardar en BD
    analisis = Analisis(
        usuario_id=user.id,
        modo=ModoAnalisisEnum(config_in.modo),
        ciius=config_in.ciius,
        porcentaje_muestra=config_in.porcentaje_muestra,
        hi_umbral=config_in.hi_umbral,
        indices_empresa=config_in.indices_empresa,
        resultado_json=resultado.a_dict(),
        n_poblacion=resultado.n_poblacion,
        n_muestra=resultado.n_muestra,
        credito_usado=True,
    )
    db.add(analisis)
    _consumir_credito(user, db)
    db.commit()
    db.refresh(analisis)
    return analisis


@router.get("/", response_model=list[AnalisisOut])
def listar_analisis(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    return db.query(Analisis).filter(
        Analisis.usuario_id == user.id
    ).order_by(Analisis.creado_en.desc()).offset(skip).limit(limit).all()


@router.get("/{analisis_id}", response_model=AnalisisOut)
def obtener_analisis(
    analisis_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    a = db.query(Analisis).filter(
        Analisis.id == analisis_id, Analisis.usuario_id == user.id
    ).first()
    if not a:
        raise HTTPException(404, "Análisis no encontrado")
    return a


@router.get("/{analisis_id}/excel")
def descargar_excel(
    analisis_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Genera y descarga el Excel con tablas de frecuencia y conclusiones."""
    if user.plan == "free":
        raise HTTPException(402, "Descarga disponible solo en planes de créditos o Pro.")

    a = db.query(Analisis).filter(
        Analisis.id == analisis_id, Analisis.usuario_id == user.id
    ).first()
    if not a or not a.resultado_json:
        raise HTTPException(404, "Análisis no encontrado o sin resultados")

    # Reconstruir resultado y generar Excel
    df = _cargar_df_desde_bd(None, db)
    config = ConfigAnalisis(
        ciius=a.ciius, modo=a.modo.value,
        indices_empresa=a.indices_empresa,
        porcentaje_muestra=a.porcentaje_muestra,
        hi_umbral=a.hi_umbral,
    )
    resultado = MotorAnalisis(df).ejecutar(config)
    xlsx_bytes = ExportadorExcel(resultado).generar()

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=analisis_{analisis_id}.xlsx"}
    )


@router.get("/{analisis_id}/graficas")
def descargar_graficas(
    analisis_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Descarga un ZIP con todas las gráficas PNG del análisis."""
    if user.plan == "free":
        raise HTTPException(402, "Descarga disponible solo en planes de créditos o Pro.")

    a = db.query(Analisis).filter(
        Analisis.id == analisis_id, Analisis.usuario_id == user.id
    ).first()
    if not a:
        raise HTTPException(404, "Análisis no encontrado")

    df = _cargar_df_desde_bd(None, db)
    config = ConfigAnalisis(
        ciius=a.ciius, modo=a.modo.value,
        indices_empresa=a.indices_empresa,
        porcentaje_muestra=a.porcentaje_muestra,
        hi_umbral=a.hi_umbral,
    )
    resultado = MotorAnalisis(df).ejecutar(config)
    zip_bytes = GeneradorGraficas(resultado).todas_como_zip()

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=graficas_{analisis_id}.zip"}
    )