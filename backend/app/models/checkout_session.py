from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base
import datetime

class CheckoutSession(Base):
    __tablename__ = "checkout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    cart_value = Column(Float, nullable=False)
    items = Column(String, nullable=True) # Text representation of items JSON
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    abandoned_at = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE") # ACTIVE, ABANDONED, COMPLETED

    # Relationships
    customer = relationship("Customer", back_populates="checkout_sessions")
