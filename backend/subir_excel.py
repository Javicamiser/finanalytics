"""
Script para subir el Excel de SIIS al sistema.
Ejecutar desde la carpeta backend/ con el venv activo:
    python subir_excel.py
"""
import requests

EMAIL    = "javierantoniomedinacorrea@gmail.com"
PASSWORD = "Javicam090983"
AÑO      = 2024
RUTA_EXCEL = r"C:\Users\Javier\Desktop\WAP ENTERPRISE\SOFTWARE INDICES FINANCIEROS\bd_analisis_financiero.xlsx"
URL_BASE = "http://localhost:8000"

# 1. Login
print("Haciendo login...")
r = requests.post(f"{URL_BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
if r.status_code != 200:
    print(f"Error en login: {r.text}")
    exit(1)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("✅ Login exitoso")

# 2. Verificar que el archivo existe y tiene contenido
import os
if not os.path.exists(RUTA_EXCEL):
    print(f"❌ Archivo no encontrado: {RUTA_EXCEL}")
    exit(1)
size = os.path.getsize(RUTA_EXCEL)
print(f"📄 Archivo encontrado: {size/1024/1024:.1f} MB")

# 3. Leer primeras columnas para verificar estructura
import pandas as pd
print("Leyendo columnas del Excel...")
df = pd.read_excel(RUTA_EXCEL, sheet_name=0, nrows=3)
print(f"   Filas de muestra: {len(df)}")
print(f"   Columnas ({len(df.columns)}):")
for col in df.columns:
    print(f"     - {repr(col)}")

# 4. Subir
print(f"\nSubiendo al backend...")
with open(RUTA_EXCEL, "rb") as f:
    r = requests.post(
        f"{URL_BASE}/api/datos/cargar?año={AÑO}",
        headers=headers,
        files={"archivo": ("siis.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        timeout=300
    )

print(f"Status: {r.status_code}")
if r.status_code == 201:
    data = r.json()
    print(f"✅ Datos cargados exitosamente:")
    print(f"   Empresas cargadas : {data.get('n_empresas')}")
    print(f"   CIIUs distintos   : {data.get('n_ciius')}")
    print(f"   Período detectado : {data.get('periodo_datos')}")
else:
    print(f"Error: {r.text[:500]}")