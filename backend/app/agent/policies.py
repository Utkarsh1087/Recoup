from typing import Dict, Any

class PolicyEngine:
    def __init__(self, max_attempts: int = 2, max_discount_pct: float = 10.0, high_value_threshold: float = 50000.0):
        self.max_attempts = max_attempts
        self.max_discount_pct = max_discount_pct
        self.high_value_threshold = high_value_threshold

    def validate(self, action: str, case, details: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Validates whether the proposed agent action complies with safety policies.
        Returns a dictionary: {"allowed": bool, "reason": str}
        """
        if not details:
            details = {}

        # Rule 1: Case already recovered
        if case.status in ["RECOVERED"]:
            return {
                "allowed": False,
                "reason": f"Policy Block: Case is already recovered. Current status: {case.status}"
            }

        # Rule 2: Stopped or escalated cases should not receive automated interventions
        if case.status in ["STOPPED", "ESCALATED"]:
            return {
                "allowed": False,
                "reason": f"Policy Block: Case is in terminal/paused status: {case.status}"
            }

        # Rule 3: High-Value Threshold Escalation
        if case.amount_at_risk > self.high_value_threshold:
            # High value must escalate
            if action != "escalate_to_human":
                return {
                    "allowed": False,
                    "reason": f"Policy Block: Risk amount ({case.amount_at_risk} INR) exceeds automated recovery threshold of {self.high_value_threshold} INR. Case must be escalated to human review."
                }

        # Rule 4: Action-specific checks
        if action == "bounded_incentive":
            discount = details.get("discount_pct", 0.0)
            if discount > self.max_discount_pct:
                return {
                    "allowed": False,
                    "reason": f"Policy Block: Proposed discount of {discount}% exceeds the strict safety cap of {self.max_discount_pct}%."
                }
                
        # Rule 5: Check attempt limits
        # We query the audit log for existing intervention executions of retries or messaging
        attempts = 0
        if case.audit_logs:
            for log in case.audit_logs:
                if log.event_type == "ACTION_EXECUTION" and log.action in ["payment_retry", "alternative_payment_method", "recovery_message", "bounded_incentive"]:
                    attempts += 1
                    
        if attempts >= self.max_attempts and action not in ["escalate_to_human", "stop_recovery"]:
            return {
                "allowed": False,
                "reason": f"Policy Block: Maximum number of automated interventions ({self.max_attempts}) reached. Case must be escalated."
            }

        # Rule 6: Customer opt-out check
        # If subscription cancelled or explicit opt-out (mocked here if customer status is CANCELLED)
        if case.customer and case.customer.subscription_status == "CANCELLED" and action in ["recovery_message", "bounded_incentive"]:
            return {
                "allowed": False,
                "reason": "Policy Block: Customer has cancelled subscriptions or opted out of promotional communications."
            }

        return {
            "allowed": True,
            "reason": "Policy Validation Passed: Action complies with merchant safety guidelines."
        }

policy_engine = PolicyEngine()
