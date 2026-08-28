from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from backend.app.db.database import Base
import datetime

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    lifetime_value = Column(Float, default=0.0)
    total_orders = Column(Integer, default=0)
    successful_orders = Column(Integer, default=0)
    failed_payments = Column(Integer, default=0)
    previous_returns = Column(Integer, default=0)
    subscription_status = Column(String, default="NONE") # ACTIVE, PAST_DUE, CANCELLED, NONE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer")
    checkout_sessions = relationship("CheckoutSession", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    recovery_cases = relationship("RecoveryCase", back_populates="customer")
