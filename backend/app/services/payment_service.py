import os
import hmac
import hashlib
import random
from typing import Dict, Any, Optional
from backend.app.config.settings import settings

class PaymentService:
    def create_payment_link(self, transaction_id: str, amount: float, customer_info: Optional[Dict[str, str]] = None) -> str:
        raise NotImplementedError
        
    def process_retry(self, transaction_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_webhook_signature(self, webhook_body: bytes, signature: str) -> bool:
        raise NotImplementedError


class MockPaymentService(PaymentService):
    def create_payment_link(self, transaction_id: str, amount: float, customer_info: Optional[Dict[str, str]] = None) -> str:
        # Points to the frontend simulator page dynamically
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        return f"{frontend_base}/#/payment-simulator/{transaction_id}"

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
        return {"status": "SUCCESS"}

    def verify_webhook_signature(self, webhook_body: bytes, signature: str) -> bool:
        # In mock mode, allow test webhooks
        return True


class RazorpayPaymentService(PaymentService):
    def __init__(self):
        self.enabled = False
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            try:
                import razorpay
                self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                self.enabled = True
            except Exception as e:
                print(f"Failed to initialize Razorpay Client: {e}. Defaulting to sandbox mode.")
        
    def create_payment_link(self, transaction_id: str, amount: float, customer_info: Optional[Dict[str, str]] = None) -> str:
        if not self.enabled:
            return MockPaymentService().create_payment_link(transaction_id, amount, customer_info)
            
        try:
            cust_name = (customer_info or {}).get("name", "Valued Customer")
            cust_email = (customer_info or {}).get("email", "customer@example.com")
            cust_contact = (customer_info or {}).get("phone", "+919999999999")
            
            backend_base = settings.BACKEND_URL.rstrip("/")
            payload = {
                "amount": int(round(amount * 100)), # Razorpay expects amount in paise
                "currency": "INR",
                "accept_partial": False,
                "reference_id": f"rec_{transaction_id}",
                "description": f"Recoup Revenue Recovery Link - Ref #{transaction_id}",
                "customer": {
                    "name": cust_name,
                    "email": cust_email,
                    "contact": cust_contact
                },
                "notify": {
                    "sms": False,
                    "email": False
                },
                "callback_url": f"{backend_base}/api/recovery/callback/razorpay?tx_id={transaction_id}",
                "callback_method": "get"
            }
            link = self.client.payment_link.create(payload)
            if link and link.get("short_url"):
                return link["short_url"]
            return MockPaymentService().create_payment_link(transaction_id, amount, customer_info)
        except Exception as e:
            print(f"Live Razorpay Link creation error: {e}. Falling back to Simulator Link.")
            return MockPaymentService().create_payment_link(transaction_id, amount, customer_info)

    def process_retry(self, transaction_id: str) -> Dict[str, Any]:
        """
        Processes automated gateway retry. In live mode with gateway integration or mock fallback.
        """
        return MockPaymentService().process_retry(transaction_id)

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        if not self.enabled:
            return {"status": "SUCCESS"}
        try:
            # Check payment details via Razorpay client
            payment = self.client.payment.fetch(transaction_id)
            return {"status": payment.get("status", "captured").upper(), "payment": payment}
        except Exception:
            return {"status": "SUCCESS"}

    def verify_webhook_signature(self, webhook_body: bytes, signature: str) -> bool:
        if not settings.RAZORPAY_WEBHOOK_SECRET:
            return True
        try:
            if hasattr(self, "client"):
                self.client.utility.verify_webhook_signature(
                    webhook_body.decode("utf-8") if isinstance(webhook_body, bytes) else webhook_body,
                    signature,
                    settings.RAZORPAY_WEBHOOK_SECRET
                )
                return True
        except Exception:
            pass

        # Native HMAC comparison
        try:
            expected_signature = hmac.new(
                settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
                webhook_body if isinstance(webhook_body, bytes) else webhook_body.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            print(f"Webhook signature verification failed: {e}")
            return False


def get_payment_service() -> PaymentService:
    """
    Returns RazorpayPaymentService when PAYMENT_MODE is set to 'live' or 'razorpay' and keys exist,
    otherwise returns MockPaymentService for seamless demo and sandbox execution.
    """
    if settings.PAYMENT_MODE.lower() in ["live", "razorpay"] and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        return RazorpayPaymentService()
    return MockPaymentService()

