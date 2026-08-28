from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from backend.app.db.database import get_db
from backend.app.models import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("")
def list_audit_logs(limit: int = 150, db: Session = Depends(get_db)):
    return db.query(AuditLog).options(
        joinedload(AuditLog.recovery_case)
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()
