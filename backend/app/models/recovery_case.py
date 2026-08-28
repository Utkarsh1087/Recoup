from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base
import datetime

class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    source_type = Column(String, nullable=False) # PAYMENT_FAILURE, CHECKOUT_ABANDONMENT, SUBSCRIPTION_FAILURE, RECEIVABLE_OVERDUE
    source_id = Column(String, nullable=False) # string ID of source event
    amount_at_risk = Column(Float, nullable=False)
    recovery_probability = Column(Float, default=0.5)
    priority = Column(String, default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    diagnosis = Column(String, nullable=True)
    recommended_action = Column(String, nullable=True)
    selected_action = Column(String, nullable=True)
    status = Column(String, default="DETECTED") # DETECTED, ANALYZING, ACTION_PENDING, IN_PROGRESS, RECOVERED, FAILED, ESCALATED, STOPPED
    amount_recovered = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="recovery_cases")
    audit_logs = relationship("AuditLog", back_populates="recovery_case")
