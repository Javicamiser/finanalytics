from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import engine, Base
from app.models import models  # importar para que SQLAlchemy registre los modelos
from app.api.routers import auth, analisis, datos, pagos

# Crear tablas (en producción usar Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinAnalytics API",
    description="Plataforma de análisis de indicadores financieros — Colombia",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api")
app.include_router(analisis.router, prefix="/api")
app.include_router(datos.router,    prefix="/api")
app.include_router(pagos.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}