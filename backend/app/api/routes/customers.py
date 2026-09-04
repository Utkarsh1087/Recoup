from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from backend.app.db.database import get_db
from backend.app.models import Customer

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", include_in_schema=False)
@router.get("/")
def get_all_customers(
    search: Optional[str] = None,
    subscription_status: Optional[str] = None,
    segment: Optional[str] = None,
    sort_by: Optional[str] = "id_asc",
    skip: int = Query(0, ge=0),
    limit: Optional[int] = Query(50, ge=1, le=5000),
    all: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    
    if subscription_status and subscription_status != "All":
        query = query.filter(Customer.subscription_status == subscription_status)
        
    if segment and segment != "All":
        if segment == "FAILED_PAYMENTS":
            query = query.filter(Customer.failed_payments > 0)
        elif segment == "REPEAT_BUYERS":
            query = query.filter(Customer.successful_orders > 1)
        elif segment == "VIP":
            query = query.filter(Customer.lifetime_value >= 50000)

    if search:
        search_clean = search.strip()
        # Search by ID if digits provided
        if search_clean.isdigit():
            query = query.filter(Customer.id == int(search_clean))
        elif search_clean.upper().startswith("CUST-") and search_clean[5:].isdigit():
            query = query.filter(Customer.id == int(search_clean[5:]))
        elif search_clean.upper().startswith("#CUST-") and search_clean[6:].isdigit():
            query = query.filter(Customer.id == int(search_clean[6:]))
        else:
            query = query.filter(
                Customer.name.ilike(f"%{search_clean}%") | 
                Customer.email.ilike(f"%{search_clean}%") |
                Customer.phone.ilike(f"%{search_clean}%")
            )
            
    total = query.count()
    
    # Sorting
    if sort_by == "id_desc":
        query = query.order_by(Customer.id.desc())
    elif sort_by == "ltv_desc":
        query = query.order_by(Customer.lifetime_value.desc())
    elif sort_by == "ltv_asc":
        query = query.order_by(Customer.lifetime_value.asc())
    elif sort_by == "orders_desc":
        query = query.order_by(Customer.successful_orders.desc())
    elif sort_by == "failures_desc":
        query = query.order_by(Customer.failed_payments.desc())
    else:
        query = query.order_by(Customer.id.asc())
        
    if all:
        items = query.all()
    else:
        page_limit = limit or 50
        items = query.offset(skip).limit(page_limit).all()
        
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit or len(items)
    }

@router.get("/{customer_id}")
def get_customer_profile(customer_id: int, db: Session = Depends(get_db)):
    cust = db.query(Customer).options(
        joinedload(Customer.transactions),
        joinedload(Customer.recovery_cases)
    ).filter(Customer.id == customer_id).first()
    
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return cust
