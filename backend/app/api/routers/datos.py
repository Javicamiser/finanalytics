import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from app.db.database import get_db
from app.models.models import DatasetSIIS, EmpresaSIIS, CodigoCIIU
from app.schemas.schemas import DatasetOut, CIIUOut
from app.core.auth import get_current_user, require_admin
from app.models.models import Usuario
from app.core.motor import COL

router = APIRouter(prefix="/datos", tags=["Datos SIIS"])


@router.get("/estado", response_model=DatasetOut | None)
def estado_datos(db: Session = Depends(get_db)):
    """Retorna el dataset activo más reciente (sin autenticación)."""
    dataset = db.query(DatasetSIIS).filter(
        DatasetSIIS.activo == True
    ).order_by(DatasetSIIS.fecha_carga.desc()).first()
    return dataset


@router.get("/datasets", response_model=list[DatasetOut])
def listar_datasets(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    return db.query(DatasetSIIS).order_by(DatasetSIIS.fecha_carga.desc()).all()


@router.post("/cargar", response_model=DatasetOut, status_code=201)
def cargar_excel_siis(
    año: int,
    archivo: UploadFile = File(...),
    notas: str = "",
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """
    Admin sube el Excel descargado de Supersociedades/SIIS.
    Se parsea, se almacena en BD y se marca como dataset activo.
    Los datasets anteriores se desactivan.
    """
    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser .xlsx o .xls")

    try:
        contenido = archivo.file.read()
        df = pd.read_excel(io.BytesIO(contenido), sheet_name=0)
    except Exception as e:
        raise HTTPException(400, f"No se pudo leer el Excel: {e}")

    # Validar columnas mínimas
    cols_requeridas = [COL["ciiu"], COL["act_corr"], COL["act_total"],
                       COL["pas_corr"], COL["pas_total"]]
    faltantes = [c for c in cols_requeridas if c not in df.columns]
    if faltantes:
        raise HTTPException(400, f"Columnas faltantes en el Excel: {faltantes[:3]}...")

    # ── Filtrar: solo "Periodo Actual" ──────────────────────────────────────
    # SIIS exporta dos filas por empresa: "Periodo Actual" y "Periodo Anterior".
    # Solo se carga el Periodo Actual (el año más reciente del reporte).
    # SIIS exporta dos columnas relevantes:
    #   "Periodo"       → valores: "Periodo Actual" / "Periodo Anterior"
    #   "Fecha de Corte" → fecha exacta del corte (ej: 2024-01-31, 2023-12-31)
    # Se filtra por "Periodo Actual" — garantiza comparabilidad sin importar la fecha exacta.

    col_periodo = next(
        (c for c in df.columns if c.strip().lower() in ["periodo", "período"]),
        None
    )
    if col_periodo is None:
        col_periodo = next(
            (c for c in df.columns if "periodo" in c.lower() or "period" in c.lower()),
            None
        )

    # Guardar la Fecha de Corte como referencia informativa para mostrar en el dashboard
    # Columnas de período — nombres exactos de SIIS
    col_periodo     = next((c for c in df.columns if c.strip().lower() in ["periodo", "período"]), None)
    col_fecha_corte = next((c for c in df.columns if "fecha" in c.lower() and "corte" in c.lower()), None)
    periodo_usado   = None

    if col_periodo:
        mask_actual = df[col_periodo].astype(str).str.strip().str.lower().isin(
            ["periodo actual", "período actual", "actual"]
        )
        if mask_actual.sum() > 0:
            df = df[mask_actual].copy().reset_index(drop=True)

    # Detectar período de referencia desde Fecha de Corte (después del filtro)
    if col_fecha_corte and col_fecha_corte in df.columns:
        fechas = pd.to_datetime(df[col_fecha_corte], errors="coerce").dropna()
        if len(fechas) > 0:
            periodo_usado = str(fechas.max().date())
    if periodo_usado is None and col_periodo:
        periodo_usado = "Periodo Actual"

    # ── Eliminar NITs duplicados (por si quedan): mayor activo total gana ───
    col_nit = COL["nit"]
    col_at  = COL["act_total"]
    if col_nit in df.columns and col_at in df.columns:
        df[col_at] = pd.to_numeric(df[col_at], errors="coerce")
        df = (
            df.sort_values(col_at, ascending=False)
              .drop_duplicates(subset=[col_nit], keep="first")
              .reset_index(drop=True)
        )

    # Desactivar datasets anteriores
    db.query(DatasetSIIS).filter(DatasetSIIS.activo == True).update({"activo": False})

    # Crear nuevo dataset
    n_ciius = df[COL["ciiu"]].astype(str).str.strip().str[:5].nunique()
    dataset = DatasetSIIS(
        año=año,
        n_empresas=len(df),
        n_ciius=n_ciius,
        activo=True,
        admin_id=admin.id,
        notas=notas,
        periodo_datos=periodo_usado,   # ej: "2024-12-31"
    )
    db.add(dataset)
    db.flush()

    # Importar empresas en lotes
    BATCH = 500
    empresas = []
    for _, row in df.iterrows():
        def get_float(col_key):
            """Lee un valor numérico del Excel, devuelve None si está vacío o no es número."""
            nombre = COL.get(col_key, col_key)
            val = row.get(nombre)
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return None
            try:
                return float(str(val).replace(",", "").replace("$", "").strip())
            except (ValueError, TypeError):
                return None

        def get_str(col_key, maxlen=None):
            nombre = COL.get(col_key, col_key)
            val = str(row.get(nombre, "") or "").strip()
            return (val[:maxlen] if maxlen else val) or None

        e = EmpresaSIIS(
            dataset_id=dataset.id,
            # Identificación
            nit          = get_str("nit", 20),
            razon_social = get_str("nombre", 500),
            ciiu         = get_str("ciiu", 300),   # descripción completa ej: "F4290 - Construcción..."
            departamento = get_str("dpto", 100),
            ciudad       = get_str("ciudad", 100),
            # Solo las 7 cifras financieras necesarias para los índices
            activos_corrientes   = get_float("act_corr"),
            total_activos        = get_float("act_total"),
            pasivos_corrientes   = get_float("pas_corr"),
            total_pasivos        = get_float("pas_total"),
            patrimonio           = get_float("patrimonio"),
            utilidad_operacional = get_float("util_op"),
            costos_financieros   = get_float("gastos_int"),
        )
        empresas.append(e)
        if len(empresas) >= BATCH:
            db.bulk_save_objects(empresas)
            empresas = []

    if empresas:
        db.bulk_save_objects(empresas)

    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/ciiu", response_model=list[CIIUOut])
def listar_ciiu(
    buscar: str = "",
    db: Session = Depends(get_db),
):
    """Lista de códigos CIIU disponibles, con búsqueda opcional."""
    q = db.query(CodigoCIIU)
    if buscar:
        q = q.filter(
            CodigoCIIU.codigo.ilike(f"%{buscar}%") |
            CodigoCIIU.descripcion.ilike(f"%{buscar}%")
        )
    return q.order_by(CodigoCIIU.codigo).limit(100).all()