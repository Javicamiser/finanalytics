"""Tests del motor con metodología real del documento SETP."""
import sys, traceback
import numpy as np, pandas as pd
sys.path.insert(0, "/home/claude/finanalytics/backend/app/core")
from motor import MotorAnalisis, ConfigAnalisis, ExportadorExcel, GeneradorGraficas, RANGOS, DIRECCION, COL

def df_sintetico(n=200, seed=42):
    rng = np.random.default_rng(seed)
    ciius = ["F4290","F4321","G4799","G4741","F4330"]
    deptos = ["BOGOTA D.C.","ANTIOQUIA","HUILA","VALLE DEL CAUCA","CUNDINAMARCA","SANTANDER","ATLANTICO"]
    ac = rng.uniform(1e8, 5e9, n); pc = rng.uniform(5e7, 3e9, n)
    at = ac + rng.uniform(5e8, 8e9, n); pt = rng.uniform(2e8, 6e9, n)
    pa = at - pt; uo = rng.uniform(-2e8, 1e9, n); gi = rng.uniform(1e6, 2e8, n)
    return pd.DataFrame({
        "NIT": [f"8{i:08d}" for i in range(n)],
        "Razón social de la sociedad": [f"Empresa {i+1} S.A.S." for i in range(n)],
        COL["ciiu"]: rng.choice(ciius, size=n),
        COL["dpto"]: rng.choice(deptos, size=n),
        COL["ciudad"]: rng.choice(["BOGOTÁ","MEDELLÍN","NEIVA","CALI"], size=n),
        COL["act_corr"]: ac, COL["pas_corr"]: pc, COL["act_total"]: at,
        COL["pas_total"]: pt, COL["patrimonio"]: pa, COL["util_op"]: uo, COL["gastos_int"]: gi,
    })

class T:
    def __init__(self): self.ok=0; self.fail=0; self.errs=[]
    def run(self, name, fn):
        try: fn(); print(f"  ✅  {name}"); self.ok+=1
        except AssertionError as e: print(f"  ❌  {name}: {e}"); self.fail+=1; self.errs.append((name,str(e)))
        except Exception as e: print(f"  💥  {name}: {e}"); self.fail+=1; self.errs.append((name,traceback.format_exc()[:300]))
    def resumen(self):
        print(f"\n{'='*52}\n  {self.ok}/{self.ok+self.fail} tests pasaron\n{'='*52}")
        for n,e in self.errs: print(f"\n  [{n}]\n  {e}")
        return self.fail==0

df = df_sintetico(300)
motor = MotorAnalisis(df)
CIIUS = ["F4290","F4321","F4330"]
t = T()
print("\n🔬 FinAnalytics — Test Suite (metodología real SETP)\n")

# 1. Filtro CIIU
def test_filtro():
    df_f = motor._filtrar_ciiu(df, CIIUS)
    assert len(df_f) > 0, "0 empresas tras filtro CIIU"
    assert df_f[COL["ciiu"]].str[:5].isin(CIIUS).all(), "Hay CIIUs no solicitados"
t.run("Filtro CIIU", test_filtro)

# 2. Muestra estratificada
def test_muestra():
    df_s = motor._filtrar_ciiu(df, CIIUS)
    mue = motor._seleccionar_muestra(df_s, 0.03, 42)
    assert len(mue) > 0, "Muestra vacía"
    assert len(mue) <= len(df_s), "Muestra > población"
    # Reproducibilidad
    mue2 = motor._seleccionar_muestra(df_s, 0.03, 42)
    assert list(mue["NIT"]) == list(mue2["NIT"]), "No reproducible"
t.run("Muestra estratificada proporcional por depto", test_muestra)

# 3. Cálculo de índices
def test_indices():
    df_calc = motor._calcular_indices(df.head(50))
    for idx in ["IL","IE","RCI","RP","RA","CT"]:
        assert idx in df_calc.columns, f"Falta {idx}"
    # IL = act_corr / pas_corr
    r0 = df_calc.iloc[0]
    ac = pd.to_numeric(df.iloc[0][COL["act_corr"]])
    pc = pd.to_numeric(df.iloc[0][COL["pas_corr"]])
    assert abs(r0["IL"] - ac/pc) < 1e-6, "Fórmula IL incorrecta"
t.run("Cálculo de índices (fórmulas correctas)", test_indices)

# 4. Tabla de frecuencias — Hi descendente (IL)
def test_hi_descendente():
    serie = pd.Series([0.5,1.0,1.2,1.6,1.8,2.5,3.1,4.0,5.0])
    tabla = motor._tabla_frecuencias("IL", serie, 0.59)
    his = [f["_hi_raw"] for f in tabla.filas]
    # Hi[0] debe ser 1.0 (100%)
    assert abs(his[0] - 1.0) < 1e-9, f"Hi[0] debería ser 1.0, es {his[0]}"
    # Hi debe ser no-creciente
    for i in range(len(his)-1):
        assert his[i] >= his[i+1] - 1e-9, f"Hi no es descendente en posición {i}"
    # Índice recomendado debe ser >= 0
    assert tabla.indice_recomendado >= 0
t.run("Hi acumulada descendente (IL, RCI, RP, RA)", test_hi_descendente)

# 5. Tabla de frecuencias — Hi ascendente (IE)
def test_hi_ascendente():
    serie = pd.Series([0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85])
    tabla = motor._tabla_frecuencias("IE", serie, 0.59)
    his = [f["_hi_raw"] for f in tabla.filas]
    # Hi debe ser no-decreciente para IE
    for i in range(len(his)-1):
        assert his[i] <= his[i+1] + 1e-9, f"Hi IE no es ascendente en posición {i}"
    # IE: rango concentrado debe ser el primero que cruza el umbral
    assert tabla.hi_concentrado >= 0.59 or tabla.n_total < 5
t.run("Hi acumulada ascendente (IE — menor es mejor)", test_hi_ascendente)

# 6. Lógica exacta del documento SETP para IL
def test_logica_documento():
    # Reproducir exactamente la tabla del documento SETP:
    # 15 empresas en 0-0.99 (22%), 13 en 1-1.49 (19%), 3 en 1.5-1.99 (4%)...
    # Hi en 1.5-1.99 = 59% → recomendación IL ≥ 2.0
    vals = (
        [0.5]*15 +     # 0-0.99
        [1.2]*13 +     # 1-1.49
        [1.7]*3  +     # 1.5-1.99
        [2.2]*3  +     # 2-2.49
        [2.7]*5  +     # 2.5-2.99
        [3.2]*6  +     # 3-3.49
        [3.7]*3  +     # 3.5-3.99
        [4.2]*5  +     # 4-4.49
        [5.0]*15       # 4.5+
    )  # Total = 68 (igual que el documento)
    serie = pd.Series(vals)
    tabla = motor._tabla_frecuencias("IL", serie, 0.59)
    # Hi en rango 1.5-1.99 debe ser ≈ 59% (40/68 ≈ 0.588)
    fila_15 = next(f for f in tabla.filas if "1,50" in f["Rango"])
    assert abs(fila_15["_hi_raw"] - 40/68) < 0.01, \
        f"Hi en 1.5-1.99 debería ser {40/68:.2%}, es {fila_15['_hi_raw']:.2%}"
    # Índice recomendado debe ser 2.0 (límite superior del rango concentrado)
    assert abs(tabla.indice_recomendado - 2.0) < 0.001, \
        f"Recomendación debería ser 2.0, es {tabla.indice_recomendado}"
t.run("Lógica exacta documento SETP (IL → recom. 2.0)", test_logica_documento)

# 7. Modo A completo
def test_modo_a():
    config = ConfigAnalisis(ciius=CIIUS, modo="A")
    res = motor.ejecutar(config)
    assert res.n_poblacion > 0
    assert res.n_muestra > 0
    assert res.n_muestra <= res.n_poblacion
    assert len(res.resultados) == 5
    for idx in ["IL","IE","RCI","RP","RA"]:
        assert idx in res.resultados
        r = res.resultados[idx]
        assert r.tabla.indice_recomendado >= 0
        assert 0 <= r.tabla.pct_cumplen <= 1
        assert len(r.tabla.narrativa) > 50
        assert r.objetivo_empresa is None  # Modo A no tiene objetivo empresa
t.run("Modo A — análisis objetivo completo", test_modo_a)

# 8. Modo B — objetivo empresa
def test_modo_b():
    obj = {"IL": 2.0, "IE": 0.70, "RCI": 3.0, "RP": 0.01, "RA": 0.01}
    config = ConfigAnalisis(ciius=CIIUS, modo="B", indices_empresa=obj)
    res = motor.ejecutar(config)
    for idx in ["IL","IE","RCI","RP","RA"]:
        r = res.resultados[idx]
        assert r.objetivo_empresa == obj[idx], f"Objetivo {idx} incorrecto"
        assert r.pct_sector_cumple is not None
        assert 0 <= r.pct_sector_cumple <= 1
        assert r.indice_inclusivo is not None
        assert r.narrativa_b is not None and len(r.narrativa_b) > 50
        # Opción inclusiva debe ser el índice recomendado objetivo
        assert abs(r.indice_inclusivo - r.tabla.indice_recomendado) < 1e-9
t.run("Modo B — objetivo empresa con opción inclusiva/exigente", test_modo_b)

# 9. % sector cumple IL en Modo B
def test_pct_cumple():
    # Con IL objetivo = 0 (todos lo cumplen → 100%)
    obj = {"IL": 0.0, "IE": 1.0, "RCI": -999, "RP": -999, "RA": -999}
    config = ConfigAnalisis(ciius=CIIUS, modo="B", indices_empresa=obj)
    res = motor.ejecutar(config)
    # IL ≥ 0 → prácticamente todos
    assert res.resultados["IL"].pct_sector_cumple > 0.80, \
        "Con IL objetivo=0, deberían cumplir casi todas"
t.run("% sector cumple es correcto según objetivo", test_pct_cumple)

# 10. Serialización
def test_serial():
    config = ConfigAnalisis(ciius=CIIUS, modo="A")
    res = motor.ejecutar(config)
    d = res.a_dict()
    assert "indices" in d and "geografico" in d
    for idx in ["IL","IE","RCI","RP","RA"]:
        assert idx in d["indices"]
        assert "tabla_frecuencias" in d["indices"][idx]
        filas = d["indices"][idx]["tabla_frecuencias"]
        assert len(filas) > 0
        assert all("_" not in k for k in filas[0].keys()), "Campos internos en output"
t.run("Serialización a dict (sin campos internos)", test_serial)

# 11. Excel
def test_excel():
    import zipfile, io
    config = ConfigAnalisis(ciius=CIIUS, modo="A")
    res = motor.ejecutar(config)
    xlsx = ExportadorExcel(res).generar()
    assert len(xlsx) > 5000
    with zipfile.ZipFile(io.BytesIO(xlsx)) as zf:
        hojas = [n for n in zf.namelist() if "worksheets/sheet" in n]
    assert len(hojas) >= 4, f"Esperadas ≥4 hojas, hay {len(hojas)}"
t.run("Exportador Excel con hojas correctas", test_excel)

# 12. Gráficas
def test_graficas():
    config = ConfigAnalisis(ciius=CIIUS, modo="A")
    res = motor.ejecutar(config)
    gen = GeneradorGraficas(res)
    for idx in ["IL","IE","RCI","RP","RA"]:
        png = gen.histograma_indice(idx)
        assert png[:4] == b"\x89PNG", f"{idx}: no es PNG"
        assert len(png) > 1000, f"{idx}: PNG demasiado pequeño"
    assert gen.distribucion_departamentos()[:4] == b"\x89PNG"
    assert gen.panel_resumen()[:4] == b"\x89PNG"
t.run("Gráficas PNG (histograma por índice + panel resumen)", test_graficas)

# 13. ZIP gráficas
def test_zip():
    import zipfile, io
    config = ConfigAnalisis(ciius=CIIUS, modo="A")
    res = motor.ejecutar(config)
    z = GeneradorGraficas(res).todas_como_zip()
    with zipfile.ZipFile(io.BytesIO(z)) as zf:
        archivos = zf.namelist()
    assert len(archivos) == 7, f"Esperados 7 archivos, hay {len(archivos)}"  # 5 indices + 2 paneles
t.run("ZIP con 7 gráficas (5 índices + departamentos + resumen)", test_zip)

# 14. Modo B + Excel
def test_modo_b_excel():
    import zipfile, io
    obj = {"IL": 2.5, "IE": 0.60, "RCI": 3.5, "RP": 0.05, "RA": 0.03}
    config = ConfigAnalisis(ciius=CIIUS, modo="B", indices_empresa=obj)
    res = motor.ejecutar(config)
    xlsx = ExportadorExcel(res).generar()
    assert len(xlsx) > 5000
t.run("Modo B completo + Excel descargable", test_modo_b_excel)

# 15. Validaciones de config
def test_validaciones():
    try: ConfigAnalisis(ciius=[], modo="A").validar(); assert False
    except ValueError: pass
    try: ConfigAnalisis(ciius=CIIUS, modo="B", indices_empresa=None).validar(); assert False
    except ValueError: pass
    try: ConfigAnalisis(ciius=CIIUS, modo="B", indices_empresa={"IL":1.0}).validar(); assert False
    except ValueError: pass
t.run("Validaciones de configuración", test_validaciones)

import sys; sys.exit(0 if t.resumen() else 1)
