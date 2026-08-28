from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    suggested_actions: Optional[List[Dict[str, Any]]] = None

class AgentDecision(BaseModel):
    diagnosis: str = Field(description="Detailed analysis of why the payment failed or was abandoned.")
    priority: str = Field(description="LOW, MEDIUM, HIGH, or CRITICAL.")
    recommended_action: str = Field(description="Action name: payment_retry, alternative_payment_method, recovery_message, bounded_incentive, escalate_to_human, stop_recovery.")
    reasoning: str = Field(description="Step-by-step logic detailing why this recommendation is safe, optimal, and compliant with policy.")
    discount_pct: Optional[float] = Field(default=0.0, description="If bounded_incentive is selected, specify the discount percentage (0 to 10 max).")
