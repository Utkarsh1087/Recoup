import datetime
from sqlalchemy.orm import Session
from backend.app.models import Customer, Transaction, CheckoutSession, Subscription, RecoveryCase, AuditLog
from backend.app.agent.policies import policy_engine
from backend.app.services.payment_service import get_payment_service
from ml.predict import predict_case_probability

def get_customer_history(db: Session, customer_id: int):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        return {"error": "Customer not found"}
    return {
        "id": cust.id,
        "name": cust.name,
        "email": cust.email,
        "phone": cust.phone,
        "lifetime_value": cust.lifetime_value,
        "total_orders": cust.total_orders,
        "successful_orders": cust.successful_orders,
        "failed_payments": cust.failed_payments,
        "previous_returns": cust.previous_returns,
        "subscription_status": cust.subscription_status,
        "success_rate": round(cust.successful_orders / max(1, cust.total_orders), 2)
    }

def get_transaction_details(db: Session, transaction_id: str):
    # In database, transaction ID can be integer
    # Check if string representation of ID matches
    tx = None
    if transaction_id.isdigit():
        tx = db.query(Transaction).filter(Transaction.id == int(transaction_id)).first()
    if not tx:
        tx = db.query(Transaction).filter(Transaction.razorpay_reference == transaction_id).first()
        
    if not tx:
        return {"error": "Transaction not found"}
    return {
        "id": tx.id,
        "customer_id": tx.customer_id,
        "amount": tx.amount,
        "currency": tx.currency,
        "payment_method": tx.payment_method,
        "status": tx.status,
        "failure_reason": tx.failure_reason,
        "razorpay_reference": tx.razorpay_reference,
        "created_at": str(tx.created_at)
    }

def get_checkout_details(db: Session, checkout_id: str):
    co = None
    if checkout_id.isdigit():
        co = db.query(CheckoutSession).filter(CheckoutSession.id == int(checkout_id)).first()
    if not co:
        return {"error": "Checkout session not found"}
    return {
        "id": co.id,
        "customer_id": co.customer_id,
        "cart_value": co.cart_value,
        "items": co.items,
        "started_at": str(co.started_at),
        "abandoned_at": str(co.abandoned_at) if co.abandoned_at else None,
        "status": co.status
    }

def get_subscription_details(db: Session, subscription_id: str):
    sub = None
    if subscription_id.isdigit():
        sub = db.query(Subscription).filter(Subscription.id == int(subscription_id)).first()
    if not sub:
        return {"error": "Subscription not found"}
    return {
        "id": sub.id,
        "customer_id": sub.customer_id,
        "plan": sub.plan,
        "amount": sub.amount,
        "billing_cycle": sub.billing_cycle,
        "status": sub.status,
        "next_billing_date": str(sub.next_billing_date),
        "payment_failure_count": sub.payment_failure_count
    }

def calculate_recovery_probability(db: Session, case_id: int):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
    
    cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
    if not cust:
        return {"error": "Customer not found"}
        
    prob = predict_case_probability(cust, case.source_type, case.amount_at_risk)
    
    # Save probability to case
    case.recovery_probability = prob
    
    # Update priority based on amount and probability
    if case.amount_at_risk > 50000:
        case.priority = "CRITICAL"
    elif case.amount_at_risk > 10000 or (case.amount_at_risk > 5000 and prob > 0.7):
        case.priority = "HIGH"
    elif case.amount_at_risk > 2000:
        case.priority = "MEDIUM"
    else:
        case.priority = "LOW"
        
    db.commit()
    
    # Log audit
    log = AuditLog(
        recovery_case_id=case_id,
        event_type="DIAGNOSIS",
        agent_reasoning_summary=f"Recalculated recovery probability using ML models. Score: {prob * 100}%. Priority adjusted to {case.priority}."
    )
    db.add(log)
    db.commit()
    
    return {"case_id": case_id, "probability": prob, "priority": case.priority}

def send_recovery_message(db: Session, case_id: int, customer_id: int, template_name: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    policy_res = policy_engine.validate("recovery_message", case)
    
    # Log policy check
    log_policy = AuditLog(
        recovery_case_id=case_id,
        event_type="POLICY_CHECK",
        policy_check="PASSED" if policy_res["allowed"] else "FAILED",
        agent_reasoning_summary=f"Safety Policy Check for recovery_message: {policy_res['reason']}"
    )
    db.add(log_policy)
    db.commit()
    
    if not policy_res["allowed"]:
        return {"error": policy_res["reason"]}
        
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    
    # Build clean outbound customer message
    link = get_payment_service().create_payment_link(case.source_id, case.amount_at_risk, {"name": cust.name, "email": cust.email, "phone": cust.phone or ""})
    message = (
        f"Hi {cust.name}, we noticed your payment of ₹{case.amount_at_risk:,.2f} for order #{case.source_id} was unsuccessful. "
        f"You can quickly complete your payment here: {link}\n"
        f"If you need any help, simply reply to this message."
    )
    
    # Update case status
    case.status = "IN_PROGRESS"
    case.selected_action = "recovery_message"
    
    log_action = AuditLog(
        recovery_case_id=case_id,
        event_type="ACTION_EXECUTION",
        action="recovery_message",
        tool_called="send_recovery_message",
        tool_input_summary=f"customer_id: {customer_id}, recipient: {cust.phone or cust.email}, template: {template_name}",
        tool_result_summary=f"Message dispatched successfully to {cust.phone or cust.email}.\n\n--- OUTBOUND MESSAGE ---\n{message}",
        result="PENDING_USER_ACTION"
    )
    db.add(log_action)
    db.commit()
    
    return {"status": "dispatched", "message": message, "recipient": cust.phone or cust.email}


def create_payment_retry(db: Session, case_id: int, transaction_id: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    policy_res = policy_engine.validate("payment_retry", case)
    
    # Log policy check
    log_policy = AuditLog(
        recovery_case_id=case_id,
        event_type="POLICY_CHECK",
        policy_check="PASSED" if policy_res["allowed"] else "FAILED",
        agent_reasoning_summary=f"Safety Policy Check for payment_retry: {policy_res['reason']}"
    )
    db.add(log_policy)
    db.commit()
    
    if not policy_res["allowed"]:
        # If policy blocks automated recovery retry, auto-escalate the case
        if "Maximum number of automated interventions" in policy_res["reason"]:
            escalate_to_human(db, case_id, "Policy Block: Maximum recovery attempts exceeded. Automated retries locked.")
        return {"error": policy_res["reason"]}
        
    payment_service = get_payment_service()
    
    # Mark case in progress
    case.status = "IN_PROGRESS"
    case.selected_action = "payment_retry"
    db.commit()
    
    # Run the transaction retry on the payment adapter
    res = payment_service.process_retry(transaction_id)
    
    if res["status"] == "SUCCESS":
        # Payment succeeded! Update case and transaction
        case.status = "RECOVERED"
        case.amount_recovered = case.amount_at_risk
        case.completed_at = datetime.datetime.utcnow()
        
        # If active transaction in DB exists, update status
        tx = None
        if transaction_id.isdigit():
            tx = db.query(Transaction).filter(Transaction.id == int(transaction_id)).first()
        if tx:
            tx.status = "SUCCESS"
            
        log_action = AuditLog(
            recovery_case_id=case_id,
            event_type="ACTION_EXECUTION",
            action="payment_retry",
            tool_called="create_payment_retry",
            tool_input_summary=f"transaction_id: {transaction_id}",
            tool_result_summary=f"Payment Retry SUCCEEDED. Reference: {res['gateway_reference']}",
            result="SUCCESS"
        )
        db.add(log_action)
        
        # Increment customer success count
        cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
        if cust:
            cust.successful_orders += 1
            cust.lifetime_value += case.amount_at_risk
            
        db.commit()
        return {"status": "SUCCESS", "recovered_amount": case.amount_at_risk}
    else:
        # Payment failed again!
        log_action = AuditLog(
            recovery_case_id=case_id,
            event_type="ACTION_EXECUTION",
            action="payment_retry",
            tool_called="create_payment_retry",
            tool_input_summary=f"transaction_id: {transaction_id}",
            tool_result_summary=f"Payment Retry FAILED. Failure code: {res['failure_reason']}",
            result="FAILED"
        )
        db.add(log_action)
        
        # Check attempts limit. If we have run out of retries, we escalate
        attempts = db.query(AuditLog).filter(
            AuditLog.recovery_case_id == case_id,
            AuditLog.event_type == "ACTION_EXECUTION",
            AuditLog.action.in_(["payment_retry", "alternative_payment_method", "recovery_message", "bounded_incentive"])
        ).count()
        
        if attempts >= 2:
            case.status = "ESCALATED"
            log_esc = AuditLog(
                recovery_case_id=case_id,
                event_type="VERIFICATION",
                agent_reasoning_summary=f"Automatic payment retry failed twice. Limit reached. Escalating case to human team.",
                result="ESCALATED"
            )
            db.add(log_esc)
        else:
            case.status = "ACTION_PENDING"
            
        db.commit()
        return {"status": "FAILED", "reason": res["failure_reason"]}

def generate_payment_retry_link(db: Session, case_id: int, transaction_id: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    policy_res = policy_engine.validate("alternative_payment_method", case)
    
    log_policy = AuditLog(
        recovery_case_id=case_id,
        event_type="POLICY_CHECK",
        policy_check="PASSED" if policy_res["allowed"] else "FAILED",
        agent_reasoning_summary=f"Safety Policy Check for generate_payment_retry_link: {policy_res['reason']}"
    )
    db.add(log_policy)
    db.commit()
    
    if not policy_res["allowed"]:
        return {"error": policy_res["reason"]}
        
    payment_service = get_payment_service()
    link = payment_service.create_payment_link(transaction_id, case.amount_at_risk)
    
    case.status = "ACTION_PENDING"
    case.selected_action = "alternative_payment_method"
    
    log_action = AuditLog(
        recovery_case_id=case_id,
        event_type="ACTION_EXECUTION",
        action="alternative_payment_method",
        tool_called="generate_payment_retry_link",
        tool_input_summary=f"transaction_id: {transaction_id}",
        tool_result_summary=f"Generated secure check-out / alternate payment link: {link}",
        result="PENDING_USER_ACTION"
    )
    db.add(log_action)
    db.commit()
    
    return {"status": "link_created", "link": link}

def offer_bounded_incentive(db: Session, case_id: int, customer_id: int, discount_pct: float):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    policy_res = policy_engine.validate("bounded_incentive", case, {"discount_pct": discount_pct})
    
    log_policy = AuditLog(
        recovery_case_id=case_id,
        event_type="POLICY_CHECK",
        policy_check="PASSED" if policy_res["allowed"] else "FAILED",
        agent_reasoning_summary=f"Safety Policy Check for bounded_incentive with {discount_pct}% discount: {policy_res['reason']}"
    )
    db.add(log_policy)
    db.commit()
    
    if not policy_res["allowed"]:
        return {"error": policy_res["reason"]}
        
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    
    # Calculate new amount
    discounted_amount = case.amount_at_risk * (1 - (discount_pct / 100))
    link = get_payment_service().create_payment_link(case.source_id, discounted_amount, {"name": cust.name, "email": cust.email, "phone": cust.phone or ""})
    coupon_code = f"SAVE{int(discount_pct)}"
    message = (
        f"Hi {cust.name}, complete your purchase for order #{case.source_id} today and get an exclusive "
        f"{int(discount_pct)}% discount with code {coupon_code}! "
        f"Discounted total: ₹{discounted_amount:,.2f}. Complete here: {link}"
    )
    
    case.status = "ACTION_PENDING"
    case.selected_action = "bounded_incentive"
    
    log_action = AuditLog(
        recovery_case_id=case_id,
        event_type="ACTION_EXECUTION",
        action="bounded_incentive",
        tool_called="offer_bounded_incentive",
        tool_input_summary=f"discount: {discount_pct}%, original: ₹{case.amount_at_risk:,.2f}, recipient: {cust.phone or cust.email}",
        tool_result_summary=f"Offered {discount_pct}% discount (Coupon '{coupon_code}').\n\n--- OUTBOUND MESSAGE ---\n{message}",
        result="PENDING_USER_ACTION"
    )
    db.add(log_action)
    db.commit()
    
    return {"status": "coupon_offered", "discount_pct": discount_pct, "payment_link": link, "message": message}


def check_payment_status(db: Session, case_id: int, transaction_id: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    # Check if transaction in DB has succeeded (e.g. from payment simulator interaction)
    tx = None
    if transaction_id.isdigit():
        tx = db.query(Transaction).filter(Transaction.id == int(transaction_id)).first()
    if not tx:
        tx = db.query(Transaction).filter(Transaction.razorpay_reference == transaction_id).first()
        
    if tx and tx.status == "SUCCESS":
        case.status = "RECOVERED"
        case.amount_recovered = case.amount_at_risk
        case.completed_at = datetime.datetime.utcnow()
        
        log = AuditLog(
            recovery_case_id=case_id,
            event_type="VERIFICATION",
            agent_reasoning_summary=f"Payment status verified via gateway check. Transaction status is SUCCESS. Revenue recovered: {case.amount_at_risk} INR.",
            result="SUCCESS"
        )
        db.add(log)
        
        # Increment customer successful orders
        cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
        if cust:
            cust.successful_orders += 1
            cust.lifetime_value += case.amount_at_risk
            
        db.commit()
        return {"status": "RECOVERED", "amount": case.amount_at_risk}
        
    return {"status": case.status, "reason": "Payment pending or failed"}

def mark_recovery_success(db: Session, case_id: int, amount: float):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    case.status = "RECOVERED"
    case.amount_recovered = amount
    case.completed_at = datetime.datetime.utcnow()
    
    log = AuditLog(
        recovery_case_id=case_id,
        event_type="VERIFICATION",
        agent_reasoning_summary=f"Case explicitly marked as successfully recovered. Recovered amount: {amount} INR.",
        result="SUCCESS"
    )
    db.add(log)
    db.commit()
    return {"status": "RECOVERED", "amount": amount}

def escalate_to_human(db: Session, case_id: int, reason: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    case.status = "ESCALATED"
    case.completed_at = datetime.datetime.utcnow()
    
    log = AuditLog(
        recovery_case_id=case_id,
        event_type="VERIFICATION",
        agent_reasoning_summary=f"Escalated to human review. Reason: {reason}",
        result="ESCALATED"
    )
    db.add(log)
    db.commit()
    return {"status": "ESCALATED", "reason": reason}

def stop_recovery(db: Session, case_id: int, reason: str):
    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        return {"error": "Recovery case not found"}
        
    case.status = "STOPPED"
    case.completed_at = datetime.datetime.utcnow()
    
    log = AuditLog(
        recovery_case_id=case_id,
        event_type="VERIFICATION",
        agent_reasoning_summary=f"Recovery workflow stopped. Reason: {reason}",
        result="STOPPED"
    )
    db.add(log)
    db.commit()
    return {"status": "STOPPED", "reason": reason}
