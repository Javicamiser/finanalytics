# FinAnalytics — Plataforma de Análisis de Indicadores Financieros

## Stack
- **Backend**: Python 3.11 + FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Deploy**: Docker Compose

## Estructura
```
finanalytics/
├── backend/
│   ├── app/
│   │   ├── main.py           ← Entrypoint FastAPI
│   │   ├── api/routers/      ← auth, analisis, pagos, datos, usuarios
│   │   ├── core/             ← motor.py, exportador.py, graficas.py
│   │   ├── models/           ← SQLAlchemy ORM
│   │   ├── schemas/          ← Pydantic schemas
│   │   └── db/               ← database.py, migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/         ← llamadas a API
│   │   └── store/            ← Zustand
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Arranque rápido
```bash
cp .env.example .env
docker-compose up --build
```
Backend: http://localhost:8000/docs
Frontend: http://localhost:5173
