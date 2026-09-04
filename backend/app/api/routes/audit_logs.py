from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from backend.app.db.database import get_db
from backend.app.models import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("", include_in_schema=False)
@router.get("/")
def list_audit_logs(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(50, ge=1, le=5000),
    all: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).options(joinedload(AuditLog.recovery_case))
    
    if event_type and event_type != "All":
        query = query.filter(AuditLog.event_type == event_type)
        
    if search:
        search_clean = search.strip()
        if search_clean.isdigit():
            query = query.filter((AuditLog.id == int(search_clean)) | (AuditLog.recovery_case_id == int(search_clean)))
        elif search_clean.upper().startswith("REC-") and search_clean[4:].isdigit():
            query = query.filter(AuditLog.recovery_case_id == int(search_clean[4:]))
        elif search_clean.upper().startswith("#REC-") and search_clean[5:].isdigit():
            query = query.filter(AuditLog.recovery_case_id == int(search_clean[5:]))
        else:
            query = query.filter(
                AuditLog.agent_reasoning_summary.ilike(f"%{search_clean}%") |
                AuditLog.tool_called.ilike(f"%{search_clean}%") |
                AuditLog.action.ilike(f"%{search_clean}%") |
                AuditLog.result.ilike(f"%{search_clean}%")
            )
            
    total = query.count()
    
    if all:
        items = query.order_by(AuditLog.timestamp.desc()).all()
    else:
        page_limit = limit or 50
        items = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(page_limit).all()
        
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit or len(items)
    }
