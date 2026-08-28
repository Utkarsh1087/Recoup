from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from backend.app.db.database import get_db
from backend.app.models import Customer

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/{customer_id}")
def get_customer_profile(customer_id: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).options(
        joinedload(Customer.transactions),
        joinedload(Customer.recovery_cases)
    ).filter(Customer.id == customer_id).first()
    
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return cust
