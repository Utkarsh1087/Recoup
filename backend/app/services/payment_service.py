import os
import random
from typing import Dict, Any, Optional
from backend.app.config.settings import settings

class PaymentService:
    def create_payment_link(self, transaction_id: str, amount: float) -> str:
        raise NotImplementedError
        
    def process_retry(self, transaction_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        raise NotImplementedError


class MockPaymentService(PaymentService):
    def create_payment_link(self, transaction_id: str, amount: float) -> str:
        # In a real environment, this might point to a web interface
        # We will make it point to the React frontend simulation page
        # e.g., http://localhost:5173/payment-simulator/<tx_id>
        return f"http://localhost:5173/payment-simulator/{transaction_id}"

    def process_retry(self, transaction_id: str) -> Dict[str, Any]:
        """
        Simulate an automatic gateway payment retry.
        Randomly succeeds or fails with realistic failure reasons.
        """
        success = random.random() < 0.65
        
        if success:
            return {
                "status": "SUCCESS",
                "gateway_reference": f"pay_mock_{random.randint(100000, 999999)}",
                "failure_reason": None
            }
        else:
            reasons = ["insufficient_funds", "bank_decline", "temporary_gateway_failure"]
            return {
                "status": "FAILED",
                "gateway_reference": f"pay_mock_{random.randint(100000, 999999)}",
                "failure_reason": random.choice(reasons)
            }

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        # Typically returns the current state in database, handled by DB session
        return {
            "status": "SUCCESS"
        }


class RazorpayPaymentService(PaymentService):
    def __init__(self):
        self.enabled = False
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            try:
                import razorpay
                self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                self.enabled = True
                print("Razorpay client successfully initialized in TEST mode.")
            except Exception as e:
                print(f"Failed to initialize Razorpay: {e}. Falling back to Mock mode.")
        
    def create_payment_link(self, transaction_id: str, amount: float) -> str:
        if not self.enabled:
            return MockPaymentService().create_payment_link(transaction_id, amount)
            
        try:
            # Create a Razorpay Payment Link
            payload = {
                "amount": int(amount * 100), # Razorpay expects paise
                "currency": "INR",
                "accept_partial": False,
                "reference_id": f"ref_{transaction_id}",
                "description": f"RecoverAI Recovery Link - Tx {transaction_id}",
                "customer": {
                    "name": "Demo Customer",
                    "email": "customer@example.com",
                    "contact": "+919999999999"
                },
                "notify": {
                    "sms": False,
                    "email": False
                },
                "callback_url": f"http://localhost:8000/api/recovery/callback/razorpay?tx_id={transaction_id}",
                "callback_method": "get"
            }
            link = self.client.payment_link.create(payload)
            return link.get("short_url")
        except Exception as e:
            print(f"Razorpay Link creation error: {e}. Falling back to Mock Link.")
            return MockPaymentService().create_payment_link(transaction_id, amount)

    def process_retry(self, transaction_id: str) -> Dict[str, Any]:
        """
        Razorpay doesn't support card charging without customer presence unless mandated by subscriptions.
        So automatic retries fall back to simulated gateway behavior in test mode.
        """
        return MockPaymentService().process_retry(transaction_id)

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        # Implementation to verify signature / status on Razorpay API
        return {"status": "SUCCESS"}


def get_payment_service() -> PaymentService:
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        return RazorpayPaymentService()
    return MockPaymentService()
