import os
import sys
import time
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Add the workspace root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.config.settings import settings
from backend.app.db.database import engine, Base, check_db_connection

# Import routers
from backend.app.api.routes.dashboard import router as dashboard_router
from backend.app.api.routes.recovery import router as recovery_router
from backend.app.api.routes.agent import router as agent_router
from backend.app.api.routes.transactions import router as transactions_router
from backend.app.api.routes.customers import router as customers_router
from backend.app.api.routes.audit_logs import router as audit_logs_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("recoup.server")

# Build tables if not exist on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready Agentic Revenue Recovery Platform API."
)

# Custom Middleware for Request Duration & Security Headers
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error occurred. Please check server logs."}
        )
        
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time * 1000:.2f}ms"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS configurations from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health & Readiness endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "type": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql"
        },
        "llm": {
            "provider": settings.LLM_PROVIDER,
            "live_mode": settings.has_live_llm,
            "configured_key": bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY)
        },
        "payments": {
            "gateway": "razorpay" if settings.has_live_payments else "mock_simulator",
            "live_mode": settings.has_live_payments
        }
    }

# Register API routers
app.include_router(dashboard_router, prefix="/api")
app.include_router(recovery_router, prefix="/api")
app.include_router(agent_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(customers_router, prefix="/api")
app.include_router(audit_logs_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=not settings.is_production)

