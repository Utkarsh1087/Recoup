from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db.database import Base
import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    recovery_case_id = Column(Integer, ForeignKey("recovery_cases.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String, nullable=False) # e.g. DETECTION, DIAGNOSIS, POLICY_CHECK, ACTION_EXECUTION, VERIFICATION
    agent_reasoning_summary = Column(Text, nullable=True)
    tool_called = Column(String, nullable=True)
    tool_input_summary = Column(Text, nullable=True)
    tool_result_summary = Column(Text, nullable=True)
    action = Column(String, nullable=True)
    result = Column(String, nullable=True)
    policy_check = Column(String, nullable=True) # e.g., "PASSED: incentive within limit", "FAILED: max attempts exceeded"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    recovery_case = relationship("RecoveryCase", back_populates="audit_logs")
