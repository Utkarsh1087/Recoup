from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.app.db.database import get_db
from backend.app.models import Transaction

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", include_in_schema=False)
@router.get("/")
def list_transactions(
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(50, ge=1, le=50000),
    all: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    
    if status and status != "All":
        query = query.filter(Transaction.status == status)
    if payment_method and payment_method != "All":
        query = query.filter(Transaction.payment_method == payment_method)
        
    if start_date:
        query = query.filter(Transaction.created_at >= start_date)
    if end_date:
        query = query.filter(Transaction.created_at <= end_date)
        
    if search:
        search_clean = search.strip()
        if search_clean.isdigit():
            query = query.filter((Transaction.id == int(search_clean)) | (Transaction.customer_id == int(search_clean)))
        elif search_clean.upper().startswith("TX-") and search_clean[3:].isdigit():
            query = query.filter(Transaction.id == int(search_clean[3:]))
        elif search_clean.upper().startswith("#TX-") and search_clean[4:].isdigit():
            query = query.filter(Transaction.id == int(search_clean[4:]))
        elif search_clean.upper().startswith("CUST-") and search_clean[5:].isdigit():
            query = query.filter(Transaction.customer_id == int(search_clean[5:]))
        elif search_clean.upper().startswith("#CUST-") and search_clean[6:].isdigit():
            query = query.filter(Transaction.customer_id == int(search_clean[6:]))
        else:
            query = query.filter(
                Transaction.razorpay_reference.ilike(f"%{search_clean}%") |
                Transaction.failure_reason.ilike(f"%{search_clean}%") |
                Transaction.payment_method.ilike(f"%{search_clean}%")
            )
            
    total = query.count()
    
    if all:
        items = query.order_by(Transaction.created_at.desc()).all()
    else:
        page_limit = limit or 50
        items = query.order_by(Transaction.created_at.desc()).offset(skip).limit(page_limit).all()
        
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit or len(items)
    }

@router.get("/{tx_id}")
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

