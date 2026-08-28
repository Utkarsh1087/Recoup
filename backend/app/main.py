import os
import sys

# Add the workspace root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config.settings import settings
from backend.app.db.database import engine, Base

# Import routers
from backend.app.api.routes.dashboard import router as dashboard_router
from backend.app.api.routes.recovery import router as recovery_router
from backend.app.api.routes.agent import router as agent_router
from backend.app.api.routes.transactions import router as transactions_router
from backend.app.api.routes.customers import router as customers_router
from backend.app.api.routes.audit_logs import router as audit_logs_router

# Build tables if not exist on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for RecoverAI - Bounded revenue recovery agent platform."
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this. For hackathon, allow all.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER
    }

# Register routers
app.include_router(dashboard_router, prefix="/api")
app.include_router(recovery_router, prefix="/api")
app.include_router(agent_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(customers_router, prefix="/api")
app.include_router(audit_logs_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
