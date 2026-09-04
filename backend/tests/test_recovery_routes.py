from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "revenue_at_risk" in data
    assert "revenue_recovered" in data
    assert "recovery_rate" in data

def test_get_recovery_cases():
    response = client.get("/api/recovery-cases")
    assert response.status_code == 200
    cases = response.json()
    assert "items" in cases
    assert "total" in cases
    assert isinstance(cases["items"], list)

def test_get_transactions():
    response = client.get("/api/transactions")
    assert response.status_code == 200
    txs = response.json()
    assert "items" in txs
    assert "total" in txs
    assert isinstance(txs["items"], list)
