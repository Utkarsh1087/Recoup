# Recoup — AI Revenue Recovery Agent

Recoup is a complete, production-grade agentic revenue recovery platform built for merchants. It detects revenue at risk (failed payments, checkout abandonments, subscription dunning drops, overdue receivables), uses machine learning to score recoverability, applies LLM decision orchestration to choose optimal interventions, enforces strict compliance and safety boundaries, and logs a comprehensive audit timeline.

---

## The Problem
Merchants lose billions of dollars annually to leaky payment cycles. Payments fail due to expired cards, temporary gateway timeouts, or lack of funds. Customers abandon high-value carts. Subscriptions fail to renew, and corporate receivables sit overdue. Traditional rule engines are static, unable to adapt, and lead to poor customer experience or policy breaches.

## The Solution
Recoup implements an agentic workflow that loops dynamically:
```
  DETECT (Transaction Failure / Abandonment)
    ↓
  DIAGNOSE (Gather Context & Historical loyalty)
    ↓
  PRIORITIZE (Adjust priority based on LTV & Risk)
    ↓
  DECIDE (ML Probability & AI Recommended Intervention)
    ↓
  CHECK SAFETY RULES (Incentive limits, high-value escalations, retry caps)
    ↓
  EXECUTE INTERVENTION (Retry, Message, Link, Discount Coupon)
    ↓
  VERIFY RESULT (Gateway check & Webhook callback verification)
    ↓
  RECOVER REVENUE
    ↓
  LOG EVERYTHING (System-wide Audit Logs)
```

---

## Why Agentic AI?
Unlike simple chatbots or hardcoded rule engines, an AI Agent:
- Dynamically gathers customer order metrics and payment patterns using dedicated tools.
- Evaluates individual customer lifetime value (LTV) and loyalty before offering discounts.
- Self-corrects: it attempts low-friction retries before sending emails, handles errors gracefully, and escalates when limits are exceeded.
- Adapts tone and template based on transaction failure types (e.g. UPI timeouts vs expired cards).

---

## Core Features
1. **Interactive Dashboard**: Polished SaaS interface showing Revenue at Risk, Recovered Revenue, Recovery Rate, and open opportunities.
2. **AI Agent Console**: Direct interactive NLP prompt screen to query metrics, inspect cases, or start recoveries in plain language.
3. **ML Score Engine**: Scikit-Learn Random Forest model that predicts recovery probabilities based on customer parameters.
4. **Safety Policy Engine**: Strict compliance checks preventing over-discounting (>10%), excessive notifications (>2 attempts), and auto-escalates cases over ₹50,000.
5. **Interactive Payment Simulator**: Buyer sandbox screen (`/payment-simulator/:tx_id`) where evaluators can trigger SUCCESS or FAIL payments to see dashboard counters update live!
6. **Detailed Audit Trail**: Every tool call parameter, result, policy check, and reasoning log is serialized in SQL database timelines.

---

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, Pydantic.
- **Machine Learning**: Scikit-Learn, Joblib, Pandas.
- **Database**: SQLite (default, zero-setup) / PostgreSQL compatible.

---

## Project Structure
```
AI REVENUE RECOVERY/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/      # FastAPI Routers (dashboard, recovery, agent, logs)
│   │   ├── agent/
│   │   │   ├── orchestrator.py  # LLM Orchestrator & mock engine
│   │   │   ├── policies.py      # Safety Policy Engine
│   │   │   └── schemas.py       # Pydantic payloads
│   │   ├── tools/
│   │   │   └── agent_tools.py   # Agent Python tools
│   │   ├── models/
│   │   │   └── customer.py      # SQLAlchemy models
│   │   ├── services/
│   │   │   └── payment_service.py # Mock & Razorpay integrations
│   │   ├── db/
│   │   │   └── database.py      # SQLAlchemy engine
│   │   ├── config/
│   │   │   └── settings.py      # Pydantic configuration
│   │   └── main.py              # Server entry point
│   └── requirements.txt         # Backend Python packages
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Header
│   │   ├── pages/           # Dashboard, Cases, CaseDetail, AgentConsole, Simulator
│   │   ├── services/
│   │   │   └── api.ts       # API integration client
│   │   ├── App.tsx          # Router mapping
│   │   └── index.css        # Tailwind styles
│   └── package.json         # React packages
├── scripts/
│   ├── seed_data.py         # 1000 Customer SQL generator
│   └── run_evaluation.py    # Batch evaluation pipeline
├── ml/
│   ├── train.py             # Random Forest training script
│   └── predict.py           # Probability predictor
└── docs/
    ├── architecture.md      # DB and server architecture
    ├── agent.md             # Tools and workflow diagrams
    └── evaluation.md        # Evaluation performance report
```

---

## Local Setup & Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Clone and Configure Environment
Copy the configuration template:
```bash
cp .env.example .env
```

### Step 2: Initialize Backend & Seed Database
1. Install Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Seed the database with 1,000 customers and historical cases:
   ```bash
   python scripts/seed_data.py
   ```
   *Note: This creates the SQLite `recover_ai.db` database file and initializes all tables automatically.*

3. Train the Machine Learning model:
   ```bash
   python ml/train.py
   ```

### Step 3: Run Evaluation Pipeline
Generate the F1, Precision, and financial batch recovery rates report:
```bash
python scripts/run_evaluation.py
```
This runs 50 active cases and writes the output report to `docs/evaluation.md`.

### Step 4: Run the Backend API Server
Start the FastAPI server:
```bash
python backend/app/main.py
```
*The backend API documentation is available at `http://localhost:8000/docs`.*

### Step 5: Start the Frontend Client
1. Install Node modules:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## Razorpay Test Mode
To switch from simulated payment gateway links to actual Razorpay Test Mode links, add your API Keys in `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyy
```
When configured, generated payment links will point to live Razorpay payment sandbox forms.
