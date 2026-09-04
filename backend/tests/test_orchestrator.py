from unittest.mock import MagicMock
from backend.app.agent.orchestrator import Orchestrator
from backend.app.agent.schemas import AgentDecision

def test_mock_decision_generation():
    orchestrator = Orchestrator()
    mock_customer = MagicMock()
    mock_customer.name = "Jane Doe"
    mock_customer.lifetime_value = 15000.0
    mock_customer.total_orders = 8
    mock_customer.successful_orders = 7
    mock_customer.failed_payments = 0
    mock_customer.subscription_status = "ACTIVE"

    mock_case = MagicMock()
    mock_case.id = 999
    mock_case.source_type = "PAYMENT_FAILURE"
    mock_case.source_id = "TX-999"
    mock_case.amount_at_risk = 3200.0

    decision = orchestrator.get_decision(mock_customer, mock_case, 0.85)
    assert isinstance(decision, AgentDecision)
    assert decision.priority in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert decision.recommended_action in [
        "payment_retry",
        "alternative_payment_method",
        "recovery_message",
        "bounded_incentive",
        "escalate_to_human",
        "stop_recovery"
    ]
    assert isinstance(decision.discount_pct, (int, float))
    assert 0.0 <= decision.discount_pct <= 10.0
