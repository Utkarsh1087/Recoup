from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base
import datetime

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    plan = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    billing_cycle = Column(String, default="MONTHLY") # MONTHLY, ANNUALLY
    status = Column(String, default="ACTIVE") # ACTIVE, PAST_DUE, CANCELLED
    next_billing_date = Column(DateTime, nullable=True)
    payment_failure_count = Column(Integer, default=0)

    # Relationships
    customer = relationship("Customer", back_populates="subscriptions")
