# RecoverAI — Architecture Documentation

This document describes the design, components, and relationships of the RecoverAI Revenue Recovery Platform.

---

## System Architecture

RecoverAI uses a modern full-stack split decoupled architecture:

```
[ Merchant Web Console ]  <--- (REST API / JSON / Webhooks) --->  [ FastAPI Backend ]
  (React / Vite / Tailwind)                                          (Python / Uvicorn)
                                                                            │
                                                                            ├── [ Policy Safety Engine ]
                                                                            ├── [ ML Probability Classifier ]
                                                                            ├── [ Payment Adapter ]
                                                                            │
                                                                            └── [ SQL Database ]
                                                                                  (SQLite / Postgres)
```

1. **Frontend**: React client built with TypeScript and Vite. Stylings are driven by Tailwind CSS. Visual metrics and recovery charts are powered by Recharts.
2. **Backend**: FastAPI web server that handles API requests, database queries, runs the Agent decision engine, and validates policies.
3. **Database**: SQLAlchemy models supporting SQLite (for local development) and PostgreSQL (for production).
4. **AI Agent**: Bounded LLM orchestrator executing function calling (tools) and enforcing merchant-facing safety guardrails.
5. **Machine Learning**: Random Forest model trained on historical cases to score recovery probabilities.

---

## Database Schema (Relational Representation)

The database schema models transaction paths, abandonment states, and recovery case lifetimes:

### 1. Customers Table (`customers`)
Represents customer metadata, lifetime orders, and payment histories:
- `id` (INT, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique, Indexed)
- `phone` (VARCHAR)
- `lifetime_value` (FLOAT)
- `total_orders` (INT)
- `successful_orders` (INT)
- `failed_payments` (INT)
- `previous_returns` (INT)
- `subscription_status` (VARCHAR: ACTIVE, PAST_DUE, CANCELLED, NONE)
- `created_at` (DATETIME)

### 2. Transactions Table (`transactions`)
Logs order invoice states and failure events:
- `id` (INT, Primary Key)
- `customer_id` (INT, Foreign Key -> `customers.id`)
- `amount` (FLOAT)
- `currency` (VARCHAR)
- `payment_method` (VARCHAR)
- `status` (VARCHAR: SUCCESS, FAILED, PENDING, REFUNDED)
- `failure_reason` (VARCHAR)
- `razorpay_reference` (VARCHAR)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### 3. Checkout Sessions Table (`checkout_sessions`)
Captures shopping cart items and user abandonment markers:
- `id` (INT, Primary Key)
- `customer_id` (INT, Foreign Key -> `customers.id`)
- `cart_value` (FLOAT)
- `items` (TEXT/JSON string)
- `started_at` (DATETIME)
- `abandoned_at` (DATETIME)
- `status` (VARCHAR: ACTIVE, ABANDONED, COMPLETED)

### 4. Subscriptions Table (`subscriptions`)
Manages recurring dunning renewal logs:
- `id` (INT, Primary Key)
- `customer_id` (INT, Foreign Key -> `customers.id`)
- `plan` (VARCHAR)
- `amount` (FLOAT)
- `billing_cycle` (VARCHAR)
- `status` (VARCHAR: ACTIVE, PAST_DUE, CANCELLED)
- `next_billing_date` (DATETIME)
- `payment_failure_count` (INT)

### 5. Recovery Cases Table (`recovery_cases`)
The core workflow tracking entity:
- `id` (INT, Primary Key)
- `customer_id` (INT, Foreign Key -> `customers.id`)
- `source_type` (VARCHAR: PAYMENT_FAILURE, CHECKOUT_ABANDONMENT, SUBSCRIPTION_FAILURE, RECEIVABLE_OVERDUE)
- `source_id` (VARCHAR)
- `amount_at_risk` (FLOAT)
- `recovery_probability` (FLOAT)
- `priority` (VARCHAR: LOW, MEDIUM, HIGH, CRITICAL)
- `diagnosis` (VARCHAR)
- `recommended_action` (VARCHAR)
- `selected_action` (VARCHAR)
- `status` (VARCHAR: DETECTED, ANALYZING, ACTION_PENDING, IN_PROGRESS, RECOVERED, FAILED, ESCALATED, STOPPED)
- `amount_recovered` (FLOAT)
- `created_at` (DATETIME)
- `completed_at` (DATETIME)

### 6. Audit Logs Table (`audit_logs`)
The complete transaction logs tracing table:
- `id` (INT, Primary Key)
- `recovery_case_id` (INT, Foreign Key -> `recovery_cases.id`)
- `timestamp` (DATETIME)
- `event_type` (VARCHAR)
- `agent_reasoning_summary` (TEXT)
- `tool_called` (VARCHAR)
- `tool_input_summary` (TEXT)
- `tool_result_summary` (TEXT)
- `action` (VARCHAR)
- `result` (VARCHAR)
- `policy_check` (VARCHAR)
- `created_at` (DATETIME)
