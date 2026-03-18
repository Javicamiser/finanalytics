"""
Script de diagnóstico para el Modo B.
Ejecutar desde backend/ con venv activo:
    python debug_modo_b.py
"""
import sys
sys.path.insert(0, '.')
import requests

EMAIL    = "javierantoniomedinacorrea@gmail.com"
PASSWORD = "Javicam090983"
URL      = "http://localhost:8000"

# Login
token = requests.post(f"{URL}/api/auth/login",
    json={"email": EMAIL, "password": PASSWORD}).json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Ejecutar análisis Modo B con 30 empresas
r = requests.post(f"{URL}/api/analisis/ejecutar", headers=headers, json={
    "ciius": ["A0111", "A0112", "A0113", "A0114", "A0115",
              "A0119", "A0121", "A0122", "G4511"],
    "modo": "B",
    "n_empresas_b": 30,
    "porcentaje_muestra": 0.03,
    "hi_umbral": 0.59,
    "indices_empresa": {
        "IL": 2.0, "IE": 0.50, "RCI": 3.0, "RP": 0.20, "RA": 0.50
    }
})

data = r.json()
rj   = data.get("resultado_json", {})
res  = rj.get("resumen", {})

print(f"Status: {r.status_code}")
print(f"n_poblacion : {res.get('n_poblacion')}")
print(f"n_muestra   : {res.get('n_muestra')}  ← debe ser 30")
print(f"n_empresas_b en config: {rj.get('config', {}).get('n_empresas_b')}")

resumen_b = res.get("resumen_modo_b", {})
if resumen_b:
    for idx, m in resumen_b.items():
        print(f"  {idx}: n_empresas={m.get('n_empresas')}, objetivo={m.get('objetivo')}, promedio={m.get('promedio_grupo')}")