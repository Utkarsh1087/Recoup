import os
import sys
import random
import datetime
from sqlalchemy.orm import Session

# Add the workspace root to python path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.db.database import engine, Base, SessionLocal
from backend.app.models import Customer, Transaction, CheckoutSession, Subscription, RecoveryCase, AuditLog

# Names lists for realistic seed generation
FIRST_NAMES = [
    "Rahul", "Amit", "Priya", "Sneha", "Rohan", "Vikram", "Anjali", "Karan", 
    "Neha", "Aditya", "Siddharth", "Divya", "Arjun", "Pooja", "Rajesh", 
    "Suresh", "Meera", "Alok", "Kiran", "Vijay", "Anita", "Sanjay", "Deepak",
    "Preeti", "Sunita", "Harish", "Manish", "Shweta", "Ravi", "Jyoti"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Patel", "Rao", "Joshi", "Mehta", "Singh", 
    "Kumar", "Nair", "Iyer", "Choudhury", "Reddy", "Mishra", "Das", "Sen", 
    "Bose", "Trivedi", "Deshmukh", "Kulkarni", "Prasad", "Bhatt", "Pillai"
]

FAILURE_REASONS = {
    "PAYMENT_FAILURE": [
        ("insufficient_funds", "Bank declined: Insufficient funds in customer account", 0.7),
        ("expired_card", "Card expired or validity check failed", 0.85),
        ("bank_decline", "Generic bank decline code 51", 0.3),
        ("network_failure", "Temporary network failure between merchant and gateway", 0.95),
        ("temporary_gateway_failure", "Gateway timeout or temporary technical glitch", 0.95),
        ("authentication_failure", "Customer failed 3D Secure / OTP authentication", 0.8)
    ],
    "CHECKOUT_ABANDONMENT": [
        ("high_shipping_cost", "Customer left after seeing shipping charge of Rs. 250", 0.4),
        ("long_checkout_duration", "Checkout page took more than 3 minutes to complete", 0.6),
        ("customer_simply_left", "User closed window without filling payment info", 0.35),
        ("payment_page_abandonment", "Customer abandoned on payment select screen", 0.5),
        ("price_sensitivity", "High item value compared to typical purchase pattern", 0.25)
    ],
    "SUBSCRIPTION_FAILURE": [
        ("expired_card", "Recurring charge failed: Card expired", 0.8),
        ("insufficient_funds", "Recurring charge failed: Insufficient funds", 0.65),
        ("payment_method_issue", "Customer payment instrument disabled or deleted", 0.3),
        ("repeated_failure", "Multiple consecutive attempts failed", 0.2)
    ],
    "RECEIVABLE_OVERDUE": [
        ("client_delayed", "Invoice past due: Client delaying payment", 0.4),
        ("dispute", "Invoice disputed: Awaiting support clarification", 0.2),
        ("billing_error", "Incorrect invoice formatting or wrong department", 0.75)
    ]
}

PAYMENT_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"]

def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)  # Fresh start
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        print("Generating 1000 customers...")
        customers = []
        now = datetime.datetime.utcnow()
        email_set = set()
        
        for i in range(1, 1001):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{random.randint(10, 99999)}@example.com"
            while email in email_set:
                email = f"{first.lower()}.{last.lower()}{random.randint(10, 99999)}@example.com"
            email_set.add(email)
            phone = f"{random.choice([7, 8, 9])}{random.randint(100000000, 999999999)}"
            
            # Determine order stats
            total_orders = random.randint(1, 45)
            failed_payments = random.randint(0, min(5, total_orders))
            successful_orders = max(1, total_orders - failed_payments)
            
            # Lifetime value
            ltv = round(successful_orders * random.uniform(500, 8000), 2)
            
            sub_status = random.choice(["NONE", "NONE", "NONE", "ACTIVE", "ACTIVE", "PAST_DUE", "CANCELLED"])
            
            cust = Customer(
                id=i,
                name=name,
                email=email,
                phone=phone,
                lifetime_value=ltv,
                total_orders=total_orders,
                successful_orders=successful_orders,
                failed_payments=failed_payments,
                previous_returns=random.randint(0, 3),
                subscription_status=sub_status,
                created_at=now - datetime.timedelta(days=random.randint(30, 365))
            )
            db.add(cust)
            customers.append(cust)
        
        db.commit()
        print("Customers seeded successfully!")
        
        print("Generating historical transactions, checkouts, and subscriptions...")
        transactions = []
        checkout_sessions = []
        subscriptions = []
        
        tx_id_counter = 1
        co_id_counter = 1
        sub_id_counter = 1
        
        for cust in customers:
            days_since_reg = max(1, (now - cust.created_at).days)
            # Add successful transactions distributed across customer lifetime
            for _ in range(cust.successful_orders):
                tx_date = cust.created_at + datetime.timedelta(days=random.randint(0, days_since_reg))
                tx = Transaction(
                    id=tx_id_counter,
                    customer_id=cust.id,
                    amount=round(random.uniform(500, 18000), 2),
                    currency="INR",
                    payment_method=random.choice(PAYMENT_METHODS),
                    status="SUCCESS",
                    created_at=tx_date,
                    updated_at=tx_date
                )
                db.add(tx)
                transactions.append(tx)
                tx_id_counter += 1
                
            # If failed payments count > 0, generate failed transactions
            for _ in range(cust.failed_payments):
                tx_date = now - datetime.timedelta(days=random.randint(1, min(60, days_since_reg)))
                fail_reason_tuple = random.choice(FAILURE_REASONS["PAYMENT_FAILURE"])
                tx = Transaction(
                    id=tx_id_counter,
                    customer_id=cust.id,
                    amount=round(random.uniform(500, 10000), 2),
                    currency="INR",
                    payment_method=random.choice(PAYMENT_METHODS),
                    status="FAILED",
                    failure_reason=fail_reason_tuple[0],
                    razorpay_reference=f"pay_fail_{random.randint(100000, 999999)}",
                    created_at=tx_date,
                    updated_at=tx_date
                )
                db.add(tx)
                transactions.append(tx)
                tx_id_counter += 1
            
            # Checkout sessions
            # Some completed
            for _ in range(cust.successful_orders):
                co = CheckoutSession(
                    id=co_id_counter,
                    customer_id=cust.id,
                    cart_value=round(random.uniform(300, 8000), 2),
                    items="[{\"id\": 1, \"name\": \"Premium Item\", \"qty\": 1}]",
                    started_at=cust.created_at + datetime.timedelta(days=random.randint(0, days_since_reg)),
                    status="COMPLETED"
                )
                db.add(co)
                checkout_sessions.append(co)
                co_id_counter += 1
                
            # Some abandoned (for some customers)
            if random.random() < 0.3:
                co_date = now - datetime.timedelta(days=random.randint(1, 20))
                co = CheckoutSession(
                    id=co_id_counter,
                    customer_id=cust.id,
                    cart_value=round(random.uniform(800, 12000), 2),
                    items="[{\"id\": 2, \"name\": \"Exclusive Product Pack\", \"qty\": 1}]",
                    started_at=co_date,
                    abandoned_at=co_date + datetime.timedelta(minutes=random.randint(5, 45)),
                    status="ABANDONED"
                )
                db.add(co)
                checkout_sessions.append(co)
                co_id_counter += 1
                
            # Subscriptions
            if cust.subscription_status != "NONE":
                sub = Subscription(
                    id=sub_id_counter,
                    customer_id=cust.id,
                    plan=random.choice(["Standard Monthly Plan", "Pro Yearly Plan", "VIP Enterprise Tier"]),
                    amount=round(random.choice([499, 1499, 4999]), 2),
                    billing_cycle="MONTHLY" if "Monthly" in cust.subscription_status else "ANNUALLY",
                    status="ACTIVE" if cust.subscription_status == "ACTIVE" else "PAST_DUE",
                    next_billing_date=now + datetime.timedelta(days=random.randint(1, 30)),
                    payment_failure_count=random.randint(0, 3) if cust.subscription_status == "PAST_DUE" else 0
                )
                db.add(sub)
                subscriptions.append(sub)
                sub_id_counter += 1
                
        db.commit()
        print("Historical base data (transactions/checkouts) seeded!")

        print("Generating historical and active Recovery Cases...")
        # We need historical cases (already resolved: RECOVERED, FAILED, ESCALATED) to train the ML model
        # and active cases (DETECTED, ACTION_PENDING, IN_PROGRESS) for the agent demo
        
        # We will create about 800 historical recovery cases
        case_id_counter = 1
        
        # We will choose a subset of transactions/checkouts/subscriptions that failed
        failed_txs = [t for t in transactions if t.status == "FAILED"]
        abandoned_cos = [c for c in checkout_sessions if c.status == "ABANDONED"]
        past_due_subs = [s for s in subscriptions if s.status == "PAST_DUE"]
        
        # 1. Historical Cases (Resolved)
        # Create cases from these failures
        total_historical = min(len(failed_txs) + len(abandoned_cos) + len(past_due_subs), 800)
        
        for i in range(total_historical):
            # Select failure event type
            source_type = random.choice(["PAYMENT_FAILURE", "CHECKOUT_ABANDONMENT", "SUBSCRIPTION_FAILURE"])
            
            cust = random.choice(customers)
            created_date = now - datetime.timedelta(days=random.randint(10, 60))
            
            # Setup details based on source
            if source_type == "PAYMENT_FAILURE":
                amount = round(random.uniform(500, 15000), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["PAYMENT_FAILURE"])
                source_id = f"tx_{random.randint(10000, 99999)}"
            elif source_type == "CHECKOUT_ABANDONMENT":
                amount = round(random.uniform(800, 20000), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["CHECKOUT_ABANDONMENT"])
                source_id = f"co_{random.randint(10000, 99999)}"
            else:
                amount = round(random.uniform(499, 4999), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["SUBSCRIPTION_FAILURE"])
                source_id = f"sub_{random.randint(10000, 99999)}"
                
            # Outcome based on customer LTV and default recoverability rate
            # Higher LTV customer has a slightly higher recoverability rate
            ltv_bonus = 0.1 if cust.lifetime_value > 20000 else -0.05
            success_chance = min(0.95, max(0.05, recoverability + ltv_bonus))
            
            outcome_recovered = random.random() < success_chance
            
            if outcome_recovered:
                status = "RECOVERED"
                amount_recovered = amount
                completed_date = created_date + datetime.timedelta(days=random.randint(1, 3))
            else:
                status = random.choice(["FAILED", "ESCALATED", "STOPPED"])
                amount_recovered = 0.0
                completed_date = created_date + datetime.timedelta(days=random.randint(3, 5))
                
            # Diagnosis & Selected action
            diagnosis = f"Case diagnosed as {reason_code} - {reason_desc}."
            actions = ["payment_retry", "alternative_payment_method", "recovery_message", "bounded_incentive"]
            selected_action = random.choice(actions)
            
            # Priority
            if amount > 15000:
                priority = "CRITICAL"
            elif amount > 5000:
                priority = "HIGH"
            elif amount > 1500:
                priority = "MEDIUM"
            else:
                priority = "LOW"
                
            case = RecoveryCase(
                id=case_id_counter,
                customer_id=cust.id,
                source_type=source_type,
                source_id=source_id,
                amount_at_risk=amount,
                recovery_probability=round(success_chance, 2),
                priority=priority,
                diagnosis=diagnosis,
                recommended_action=selected_action,
                selected_action=selected_action,
                status=status,
                amount_recovered=amount_recovered,
                created_at=created_date,
                completed_at=completed_date
            )
            db.add(case)
            
            # Log some audits for historical cases
            log1 = AuditLog(
                recovery_case_id=case_id_counter,
                event_type="DETECTION",
                agent_reasoning_summary="System detected revenue risk event.",
                timestamp=created_date,
                created_at=created_date
            )
            log2 = AuditLog(
                recovery_case_id=case_id_counter,
                event_type="DIAGNOSIS",
                agent_reasoning_summary=f"Agent analyzed customer profile. Customer has success rate of {round((cust.successful_orders/cust.total_orders)*100, 1)}% orders. Risk cause: {reason_code}.",
                timestamp=created_date + datetime.timedelta(minutes=5),
                created_at=created_date + datetime.timedelta(minutes=5)
            )
            log3 = AuditLog(
                recovery_case_id=case_id_counter,
                event_type="ACTION_EXECUTION",
                action=selected_action,
                result="SUCCESS" if status == "RECOVERED" else "FAILED",
                policy_check="PASSED",
                timestamp=created_date + datetime.timedelta(hours=2),
                created_at=created_date + datetime.timedelta(hours=2)
            )
            db.add(log1)
            db.add(log2)
            db.add(log3)
            
            case_id_counter += 1
            
        # 2. Active Cases (Open cases for evaluation and merchant dashboard)
        # Create about 150 open cases (DETECTED / ACTION_PENDING)
        for i in range(150):
            source_type = random.choice(["PAYMENT_FAILURE", "CHECKOUT_ABANDONMENT", "SUBSCRIPTION_FAILURE", "RECEIVABLE_OVERDUE"])
            cust = random.choice(customers)
            created_date = now - datetime.timedelta(hours=random.randint(1, 48))
            
            if source_type == "PAYMENT_FAILURE":
                amount = round(random.uniform(500, 12000), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["PAYMENT_FAILURE"])
                source_id = f"tx_active_{random.randint(10000, 99999)}"
            elif source_type == "CHECKOUT_ABANDONMENT":
                amount = round(random.uniform(800, 15000), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["CHECKOUT_ABANDONMENT"])
                source_id = f"co_active_{random.randint(10000, 99999)}"
            elif source_type == "SUBSCRIPTION_FAILURE":
                amount = round(random.uniform(499, 4999), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["SUBSCRIPTION_FAILURE"])
                source_id = f"sub_active_{random.randint(10000, 99999)}"
            else:
                amount = round(random.uniform(10000, 80000), 2)
                reason_code, reason_desc, recoverability = random.choice(FAILURE_REASONS["RECEIVABLE_OVERDUE"])
                source_id = f"rec_active_{random.randint(10000, 99999)}"

            # Priority
            if amount > 50000:
                priority = "CRITICAL"
            elif amount > 10000:
                priority = "HIGH"
            elif amount > 3000:
                priority = "MEDIUM"
            else:
                priority = "LOW"
                
            case = RecoveryCase(
                id=case_id_counter,
                customer_id=cust.id,
                source_type=source_type,
                source_id=source_id,
                amount_at_risk=amount,
                recovery_probability=round(recoverability, 2),
                priority=priority,
                diagnosis=f"Detected {source_type.replace('_', ' ').lower()} with reason {reason_code}.",
                recommended_action=None,
                selected_action=None,
                status="DETECTED" if random.random() < 0.4 else "ACTION_PENDING",
                amount_recovered=0.0,
                created_at=created_date
            )
            db.add(case)
            
            # Log detection event
            log = AuditLog(
                recovery_case_id=case_id_counter,
                event_type="DETECTION",
                agent_reasoning_summary=f"System identified at-risk revenue of {amount} INR due to {source_type}.",
                timestamp=created_date,
                created_at=created_date
            )
            db.add(log)
            case_id_counter += 1
            
        db.commit()
        print(f"Successfully seeded {case_id_counter - 1} recovery cases!")
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
