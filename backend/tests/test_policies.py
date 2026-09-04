import pytest
from unittest.mock import MagicMock
from backend.app.agent.policies import PolicyEngine

def test_high_value_escalation():
    engine = PolicyEngine(high_value_threshold=50000.0)
    mock_case = MagicMock()
    mock_case.status = "PENDING"
    mock_case.amount_at_risk = 75000.0
    mock_case.audit_logs = []
    mock_case.customer = None

    # Should block direct retry for high-value risk
    result = engine.validate("payment_retry", mock_case)
    assert result["allowed"] is False
    assert "exceeds automated recovery threshold" in result["reason"]

    # Escalation to human must be allowed
    result_esc = engine.validate("escalate_to_human", mock_case)
    assert result_esc["allowed"] is True

def test_discount_cap_enforcement():
    engine = PolicyEngine(max_discount_pct=10.0)
    mock_case = MagicMock()
    mock_case.status = "PENDING"
    mock_case.amount_at_risk = 2500.0
    mock_case.audit_logs = []
    mock_case.customer = None

    # Over 10% discount should fail
    result_high = engine.validate("bounded_incentive", mock_case, {"discount_pct": 15.0})
    assert result_high["allowed"] is False
    assert "exceeds the strict safety cap" in result_high["reason"]

    # 10% or less should pass
    result_ok = engine.validate("bounded_incentive", mock_case, {"discount_pct": 8.0})
    assert result_ok["allowed"] is True

def test_max_attempts_cap():
    engine = PolicyEngine(max_attempts=2)
    mock_case = MagicMock()
    mock_case.status = "IN_PROGRESS"
    mock_case.amount_at_risk = 1500.0
    mock_case.customer = None

    # Create 2 previous intervention logs
    log1 = MagicMock(event_type="ACTION_EXECUTION", action="payment_retry")
    log2 = MagicMock(event_type="ACTION_EXECUTION", action="recovery_message")
    mock_case.audit_logs = [log1, log2]

    # Third automated action should be blocked
    result = engine.validate("recovery_message", mock_case)
    assert result["allowed"] is False
    assert "Maximum number of automated interventions" in result["reason"]
