from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
import datetime
from backend.app.db.database import get_db
from backend.app.models import RecoveryCase, Customer, Transaction, AuditLog
from backend.app.agent.orchestrator import orchestrator
from backend.app.tools import agent_tools
from scripts.seed_data import seed_database

router = APIRouter(tags=["Recovery Cases"])

@router.get("/recovery-cases")
def get_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    source_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(RecoveryCase).options(joinedload(RecoveryCase.customer))
    
    if status and status != "All":
        query = query.filter(RecoveryCase.status == status)
    if priority and priority != "All":
        query = query.filter(RecoveryCase.priority == priority)
    if source_type and source_type != "All":
        query = query.filter(RecoveryCase.source_type == source_type)
        
    return query.order_by(RecoveryCase.created_at.desc()).limit(limit).all()

@router.get("/recovery-cases/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).options(
        joinedload(RecoveryCase.customer),
        joinedload(RecoveryCase.audit_logs)
    ).filter(RecoveryCase.id == case_id).first()
    
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    # Sort audit logs by timestamp ascending
    sorted_logs = sorted(case.audit_logs, key=lambda x: x.timestamp)
    
    return {
        "id": case.id,
        "customer": case.customer,
        "source_type": case.source_type,
        "source_id": case.source_id,
        "amount_at_risk": case.amount_at_risk,
        "recovery_probability": case.recovery_probability,
        "priority": case.priority,
        "diagnosis": case.diagnosis,
        "recommended_action": case.recommended_action,
        "selected_action": case.selected_action,
        "status": case.status,
        "amount_recovered": case.amount_recovered,
        "created_at": case.created_at,
        "completed_at": case.completed_at,
        "audit_logs": sorted_logs
    }

@router.post("/recovery-cases/{case_id}/run")
def run_case_recovery(case_id: int, db: Session = Depends(get_db)):
    res = orchestrator.run_recovery_workflow(case_id, db)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/recovery-cases/{case_id}/escalate")
def manual_escalate(case_id: int, reason: str = "Manual merchant escalation", db: Session = Depends(get_db)):
    res = agent_tools.escalate_to_human(db, case_id, reason)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/recovery-cases/{case_id}/resolve")
def manual_resolve(case_id: int, db: Session = Depends(get_db)):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    res = agent_tools.mark_recovery_success(db, case_id, case.amount_at_risk)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/recovery-cases/{case_id}/stop")
def manual_stop(case_id: int, reason: str = "Manual merchant cancellation", db: Session = Depends(get_db)):
    res = agent_tools.stop_recovery(db, case_id, reason)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

# Payment Callback Simulator (Updates payment status)
@router.get("/recovery/callback/razorpay")
def payment_callback(tx_id: str, status: str = "SUCCESS", db: Session = Depends(get_db)):
    """
    Simulates the webhook/callback response from a gateway.
    """
    tx = None
    if tx_id.isdigit():
        tx = db.query(Transaction).filter(Transaction.id == int(tx_id)).first()
    if not tx:
        tx = db.query(Transaction).filter(Transaction.razorpay_reference == tx_id).first()
        
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Update transaction status
    tx.status = status
    db.commit()
    
    # Locate recovery case associated with this source
    case = db.query(RecoveryCase).filter(RecoveryCase.source_id == tx_id).first()
    if not case:
        case = db.query(RecoveryCase).filter(RecoveryCase.source_id == tx.razorpay_reference).first()
        
    if case:
        if status == "SUCCESS":
            agent_tools.mark_recovery_success(db, case.id, case.amount_at_risk)
        else:
            agent_tools.stop_recovery(db, case.id, f"Payment link payment failed: {status}")
            
    return {"status": "success", "message": f"Payment callback processed: {status}"}

# Demo triggers
@router.post("/demo/run")
def run_demo_batch(db: Session = Depends(get_db)):
    """
    Evaluates 5-10 pending recovery cases using the orchestrator.
    This lets the merchant witness the dashboard metrics shifting live during the presentation.
    """
    pending_cases = db.query(RecoveryCase).filter(
        RecoveryCase.status.in_(["DETECTED", "ACTION_PENDING"])
    ).limit(8).all()
    
    if not pending_cases:
        return {"processed": 0, "details": "No pending cases to run. Reset the database to get new cases."}
        
    results = []
    for case in pending_cases:
        res = orchestrator.run_recovery_workflow(case.id, db)
        results.append(res)
        
    return {
        "processed": len(results),
        "results": results
    }

@router.post("/demo/reset")
def reset_demo_database():
    """
    Resets the DB back to default seed data.
    """
    try:
        seed_database()
        return {"status": "success", "message": "Database reset completed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
