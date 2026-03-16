#!/usr/bin/env bash
# setup.sh — ejecutar UNA VEZ para inicializar el proyecto en VSCode
# Uso: bash setup.sh

set -e
echo "🚀 FinAnalytics — Setup inicial"

# 1. Git
git init
git add .
git commit -m "chore: estructura inicial del proyecto"

echo ""
echo "✅ Git inicializado."
echo ""
echo "Para conectar con GitHub:"
echo "  git remote add origin https://github.com/TU_USUARIO/finanalytics.git"
echo "  git push -u origin main"
echo ""

# 2. Backend (entorno virtual)
echo "📦 Instalando dependencias del backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "✅ Backend listo."
echo ""

# 3. Frontend
echo "📦 Instalando dependencias del frontend..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Frontend listo."
echo ""

# 4. Variables de entorno
cp .env.example .env
echo "⚠  Edita el archivo .env con tus credenciales antes de continuar."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Para arrancar el proyecto:"
echo ""
echo "  Opción A — Docker (recomendado):"
echo "    docker-compose up --build"
echo ""
echo "  Opción B — Manual:"
echo "    Terminal 1 (backend):"
echo "      cd backend && source venv/bin/activate"
echo "      uvicorn app.main:app --reload --port 8000"
echo ""
echo "    Terminal 2 (frontend):"
echo "      cd frontend && npm run dev"
echo ""
echo "    Terminal 3 (PostgreSQL):"
echo "      docker run -e POSTGRES_USER=finanalytics -e POSTGRES_PASSWORD=pass123"
echo "               -e POSTGRES_DB=finanalytics_db -p 5432:5432 postgres:16-alpine"
echo ""
echo "Documentación API: http://localhost:8000/docs"
echo "Frontend:          http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
