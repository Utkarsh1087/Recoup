from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard_summary(db)

@router.get("/sources")
def get_sources(db: Session = Depends(get_db)):
    return AnalyticsService.get_recovery_by_source(db)

@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    return AnalyticsService.get_timeline_data(db)
