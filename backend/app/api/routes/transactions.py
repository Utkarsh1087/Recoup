from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.models import Transaction

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("")
def list_transactions(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Transaction).order_by(Transaction.created_at.desc()).limit(limit).all()

@router.get("/{tx_id}")
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx
