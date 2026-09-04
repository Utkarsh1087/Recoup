from unittest.mock import MagicMock
from ml.predict import predict_case_probability

def test_predict_case_probability_bounds():
    mock_customer = MagicMock()
    mock_customer.total_orders = 10
    mock_customer.successful_orders = 9
    mock_customer.lifetime_value = 25000.0
    mock_customer.failed_payments = 1
    mock_customer.previous_returns = 0

    prob = predict_case_probability(mock_customer, "PAYMENT_FAILURE", 4500.0)
    assert isinstance(prob, float)
    assert 0.0 <= prob <= 1.0

def test_predict_case_probability_low_score_customer():
    mock_customer = MagicMock()
    mock_customer.total_orders = 5
    mock_customer.successful_orders = 1
    mock_customer.lifetime_value = 500.0
    mock_customer.failed_payments = 8
    mock_customer.previous_returns = 4

    prob = predict_case_probability(mock_customer, "RECEIVABLE_OVERDUE", 12000.0)
    assert isinstance(prob, float)
    assert prob < 0.50
