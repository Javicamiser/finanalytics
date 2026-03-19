import io, zipfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
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
    """
    Reglas de acceso para ejecutar un análisis:

    Admin          → acceso total, sin límites, sin descuento
    Pro (activo)   → acceso total, sin descuento
    Créditos       → necesita al menos 1 crédito, descuenta 1
    Free           → 1 análisis por mes (sin descarga de Excel ni gráficas)
    Sin plan       → bloqueado, debe comprar créditos o suscribirse
    """
    from datetime import date

    # Admin: acceso total sin restricciones
    if user.es_admin:
        return

    # Pro con suscripción vigente: acceso total
    if user.plan == "pro" and user.suscripcion_hasta and user.suscripcion_hasta >= date.today():
        return

    # Plan créditos: necesita al menos 1 crédito disponible
    if user.plan == "creditos":
        if user.creditos > 0:
            return
        raise HTTPException(
            402,
            detail="Sin créditos disponibles. Compra más créditos para continuar."
        )

    # Plan free: 1 análisis por mes, sin descarga
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
        detail=(
            f"Límite del plan gratuito alcanzado ({settings.creditos_free_por_mes} análisis/mes). "
            "Compra créditos o suscríbete al plan Pro para continuar."
        )
    )


def _consumir_credito(user: Usuario, db: Session) -> None:
    """Descuenta un crédito según el plan. Admin y Pro no consumen."""
    from datetime import date
    if user.es_admin:
        return  # admin: sin costo
    if user.plan == "pro":
        return  # pro: sin costo
    mes_actual = date.today().strftime("%Y-%m")
    if user.plan == "creditos" and user.creditos > 0:
        user.creditos -= 1
    else:
        # Free: registrar uso mensual
        user.creditos_free_usados_este_mes += 1
        user.mes_creditos_free = mes_actual
    db.commit()


def _puede_descargar(user: Usuario) -> bool:
    """
    Solo pueden descargar Excel y gráficas:
    - Admin (siempre)
    - Plan Pro con suscripción vigente
    - Plan Créditos (ya pagó por el análisis)
    El plan Free puede ver resultados en pantalla pero NO descargar.
    """
    from datetime import date
    if user.es_admin:
        return True
    if user.plan == "pro" and user.suscripcion_hasta and user.suscripcion_hasta >= date.today():
        return True
    if user.plan == "creditos":
        return True
    return False  # Free: solo vista en pantalla


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
        n_empresas_b=config_in.n_empresas_b,
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
        nombre=config_in.nombre,
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
    if not _puede_descargar(user):
        raise HTTPException(
            402,
            "El plan gratuito no incluye descarga. "
            "Compra créditos o suscríbete al plan Pro para descargar."
        )

    a = db.query(Analisis).filter(
        Analisis.id == analisis_id, Analisis.usuario_id == user.id
    ).first()
    if not a or not a.resultado_json:
        raise HTTPException(404, "Análisis no encontrado o sin resultados")

    # Reconstruir resultado y generar Excel — usar exactamente la misma config del análisis
    df = _cargar_df_desde_bd(None, db)
    config = ConfigAnalisis(
        ciius=a.ciius, modo=a.modo.value,
        indices_empresa=a.indices_empresa,
        porcentaje_muestra=a.porcentaje_muestra,
        hi_umbral=a.hi_umbral,
        n_empresas_b=a.resultado_json.get("config", {}).get("n_empresas_b") if a.resultado_json else None,
    )
    resultado = MotorAnalisis(df).ejecutar(config)
    xlsx_bytes = ExportadorExcel(resultado).generar()

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=analisis_{analisis_id}.xlsx"}
    )


@router.post("/{analisis_id}/graficas")
async def descargar_graficas(
    analisis_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
    # Personalización via query params
    paleta: str = "corporativo",
    incluir_conclusion: bool = True,
    indices: str = "",
    color_activa: str = "",
    color_normal: str = "",
    color_linea: str = "",
    # Marca de agua via form (opcional)
    marca_agua: UploadFile | None = File(None),
):
    """Descarga un ZIP con gráficas PNG personalizadas del análisis."""
    if not _puede_descargar(user):
        raise HTTPException(
            402,
            "El plan gratuito no incluye descarga. "
            "Compra créditos o suscríbete al plan Pro para descargar."
        )

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
        n_empresas_b=a.resultado_json.get("config", {}).get("n_empresas_b") if a.resultado_json else None,
    )
    resultado = MotorAnalisis(df).ejecutar(config)

    # Construir color personalizado si se envió
    color_custom = None
    if any([color_activa, color_normal, color_linea]):
        color_custom = {}
        if color_activa: color_custom["bar_activa"] = color_activa
        if color_normal: color_custom["bar_normal"] = color_normal
        if color_linea:  color_custom["linea"]      = color_linea

    indices_list = [i.strip().upper() for i in indices.split(",") if i.strip()] or None

    # Leer marca de agua si se envió
    marca_bytes = None
    if marca_agua:
        marca_bytes = await marca_agua.read()

    gen = GeneradorGraficas(
        resultado,
        paleta=paleta,
        incluir_conclusion=incluir_conclusion,
        indices=indices_list,
        color_personalizado=color_custom,
        marca_agua=marca_bytes,
    )
    zip_bytes = gen.todas_como_zip()

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=graficas_{analisis_id}.zip"}
    )


# ─────────────────────────────────────────────────────────────────────────────
#  ENDPOINT: Calcular Hi óptimo antes del análisis final
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/calcular-hi", tags=["Análisis"])
def calcular_hi_optimo(
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """
    Recibe los CIIUs y el porcentaje de muestra, ejecuta un análisis
    preliminar y devuelve el Hi óptimo calculado por segunda derivada
    (punto de inflexión de la curva acumulada) para cada índice.

    El cliente puede usar este resultado para sugerir al usuario un umbral
    Hi más representativo de la distribución real del sector.
    """
    from app.core.motor import MotorAnalisis, ConfigAnalisis, RANGOS, DIRECCION
    import numpy as np

    ciius = payload.get("ciius", [])
    pct   = float(payload.get("porcentaje_muestra", 0.03))

    if not ciius:
        raise HTTPException(400, "Debe indicar al menos un CIIU.")

    # Cargar datos
    df = _cargar_df_desde_bd(None, db)
    motor = MotorAnalisis(df)

    # Filtrar sector y obtener muestra
    from app.core.motor import COL
    col_ciiu = COL["ciiu"]
    df_sector = df[df[col_ciiu].astype(str).str.strip().str[:5].isin(ciius)].copy()
    n_poblacion = len(df_sector)

    if n_poblacion == 0:
        raise HTTPException(404, f"No hay empresas con los CIIUs {ciius}.")

    # Muestra estratificada
    n_obj = max(10, round(n_poblacion * pct))
    col_dpto = COL["dpto"]
    if col_dpto in df_sector.columns:
        grupos = df_sector.groupby(col_dpto, group_keys=False)
        sel = []
        for _, g in grupos:
            n_g = max(1, round(n_obj * len(g) / n_poblacion))
            sel.append(g.sample(n=min(n_g, len(g)), random_state=42))
        df_muestra = pd.concat(sel).reset_index(drop=True)
    else:
        df_muestra = df_sector.sample(n=min(n_obj, n_poblacion), random_state=42)

    # Calcular índices
    df_muestra = motor._calcular_indices(df_muestra)
    n_muestra = len(df_muestra)

    # Calcular Hi óptimo por segunda derivada para cada índice
    resultados = {}
    for indice in RANGOS:
        serie = df_muestra[indice].dropna()
        rangos = RANGOS[indice]
        direccion = DIRECCION[indice]
        n = len(serie)

        if n < 3:
            resultados[indice] = {
                "hi_optimo": 0.59,
                "hi_optimo_pct": "59%",
                "rango_concentrado": "Sin datos suficientes",
                "indice_recomendado": None,
                "metodo": "default",
                "curva_hi": [],
            }
            continue

        # Calcular frecuencias
        filas = []
        for etiq, li, ls in rangos:
            if li is None and ls is not None:
                mask = serie < ls
            elif ls is None and li is not None:
                mask = serie >= li
            elif li is not None and ls is not None:
                mask = (serie >= li) & (serie < ls)
            else:
                mask = pd.Series([True] * n, index=serie.index)
            filas.append({"etiq": etiq, "li": li, "ls": ls, "freq": int(mask.sum())})

        # Hi acumulada
        if direccion == "mayor":
            acum = n
            for f in filas:
                f["hi"] = round(acum / n, 4)
                acum -= f["freq"]
        else:
            acum = 0
            for f in filas:
                acum += f["freq"]
                f["hi"] = round(acum / n, 4)

        # Segunda derivada → punto de inflexión
        his = [f["hi"] for f in filas]
        d1 = [his[i+1] - his[i] for i in range(len(his)-1)]
        d2 = [abs(d1[i+1] - d1[i]) for i in range(len(d1)-1)]

        pos = d2.index(max(d2)) + 1
        pos = min(pos, len(filas) - 1)
        f_opt = filas[pos]

        hi_optimo     = f_opt["hi"]
        idx_rec       = f_opt["ls"] if f_opt["ls"] is not None else (f_opt["li"] or 0.0)
        rango_conc    = f_opt["etiq"]

        resultados[indice] = {
            "hi_optimo":          round(hi_optimo, 4),
            "hi_optimo_pct":      f"{hi_optimo:.0%}",
            "rango_concentrado":  rango_conc,
            "indice_recomendado": round(float(idx_rec), 4),
            "metodo":             "segunda_derivada",
            "curva_hi": [
                {
                    "rango":     f["etiq"],
                    "hi":        f["hi"],
                    "hi_pct":    f"{f['hi']:.0%}",
                    "freq":      f["freq"],
                    "es_optimo": (f["etiq"] == rango_conc),
                }
                for f in filas
            ],
        }

    # Hi global sugerido: promedio ponderado de los Hi óptimos por índice
    valores_hi = [v["hi_optimo"] for v in resultados.values() if v["metodo"] == "segunda_derivada"]
    hi_global  = round(sum(valores_hi) / len(valores_hi), 4) if valores_hi else 0.59

    return {
        "n_poblacion":    n_poblacion,
        "n_muestra":      n_muestra,
        "hi_global_sugerido":     hi_global,
        "hi_global_sugerido_pct": f"{hi_global:.0%}",
        "por_indice":     resultados,
        "explicacion": (
            f"El Hi óptimo se calculó identificando el punto de inflexión "
            f"de la curva acumulada Hi para cada índice financiero "
            f"(segunda derivada discreta). Este punto representa donde la "
            f"distribución del sector cambia de concentrada a dispersa. "
            f"Con los {len(ciius)} CIIU(s) seleccionados y {n_muestra} empresas "
            f"de muestra, el sistema sugiere usar Hi = {hi_global:.0%}."
        ),
    }


@router.patch("/{analisis_id}/nombre", tags=["Análisis"])
def renombrar_analisis(
    analisis_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Renombra un análisis existente."""
    a = db.query(Analisis).filter(
        Analisis.id == analisis_id, Analisis.usuario_id == user.id
    ).first()
    if not a:
        raise HTTPException(404, "Análisis no encontrado")
    a.nombre = payload.get("nombre", "")[:200]
    db.commit()
    return {"id": a.id, "nombre": a.nombre}