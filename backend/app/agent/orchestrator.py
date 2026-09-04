import json
import os
import random
import re
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.config.settings import settings
from backend.app.models import RecoveryCase, Customer, Transaction, AuditLog
from backend.app.agent.schemas import AgentDecision
from backend.app.agent.prompts import SYSTEM_PROMPT, CHAT_AGENT_PROMPT
from backend.app.tools import agent_tools

class Orchestrator:
    def get_decision(self, customer: Customer, case: RecoveryCase, probability: float) -> AgentDecision:
        """
        Determines the intervention to perform on a recovery case.
        Supports OpenAI, Gemini, or Mock rule-based fallback.
        """
        provider = settings.LLM_PROVIDER.lower()
        
        # Check API Keys for overrides
        if provider == "gemini" and not settings.GEMINI_API_KEY:
            provider = "mock"
        elif provider == "openai" and not settings.OPENAI_API_KEY:
            provider = "mock"
            
        if provider == "openai":
            return self._get_openai_decision(customer, case, probability)
        elif provider == "gemini":
            return self._get_gemini_decision(customer, case, probability)
        else:
            return self._get_mock_decision(customer, case, probability)

    def _get_openai_decision(self, customer: Customer, case: RecoveryCase, probability: float) -> AgentDecision:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            
            prompt_content = f"""
            Analyze the following recovery case:
            Case ID: {case.id}
            Source Type: {case.source_type}
            Source Event ID: {case.source_id}
            Amount at Risk: {case.amount_at_risk} INR
            Recovery Probability: {probability}
            
            Customer History:
            Name: {customer.name}
            LTV: {customer.lifetime_value} INR
            Orders: {customer.total_orders} total, {customer.successful_orders} successful
            Failed Payments Count: {customer.failed_payments}
            Subscription Status: {customer.subscription_status}
            
            Provide your response in raw JSON adhering to the AgentDecision schema.
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt_content}
                ],
                response_format={"type": "json_object"}
            )
            
            data = json.loads(response.choices[0].message.content)
            return AgentDecision(**data)
            
        except Exception as e:
            print(f"OpenAI call failed ({e}). Falling back to mock decision engine.")
            return self._get_mock_decision(customer, case, probability)

    def _call_gemini(self, contents: str, system_instruction: Optional[str] = None, json_mode: bool = False) -> Optional[str]:
        if not settings.GEMINI_API_KEY:
            return None

        # Priority model candidate list
        candidate_models = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite"
        ]
        seen = set()
        models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

        # 1. Modern google.genai SDK
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            config_kwargs = {}
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"
            
            config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

            for model_name in models_to_try:
                try:
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                    if resp and resp.text:
                        return resp.text.strip()
                except Exception as model_err:
                    continue
        except Exception:
            pass

        # 2. Legacy google.generativeai SDK fallback
        try:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
            for model_name in models_to_try:
                try:
                    m = genai_legacy.GenerativeModel(model_name, system_instruction=system_instruction)
                    gen_config = {"response_mime_type": "application/json"} if json_mode else None
                    resp = m.generate_content(contents, generation_config=gen_config)
                    if resp and resp.text:
                        return resp.text.strip()
                except Exception:
                    continue
        except Exception:
            pass

        return None

    def _get_gemini_decision(self, customer: Customer, case: RecoveryCase, probability: float) -> AgentDecision:
        if not settings.GEMINI_API_KEY:
            return self._get_mock_decision(customer, case, probability)

        try:
            prompt_content = f"""
            Analyze the following recovery case:
            Case ID: {case.id}
            Source Type: {case.source_type}
            Source Event ID: {case.source_id}
            Amount at Risk: {case.amount_at_risk} INR
            Recovery Probability: {probability}
            
            Customer History:
            Name: {customer.name}
            LTV: {customer.lifetime_value} INR
            Orders: {customer.total_orders} total, {customer.successful_orders} successful
            Failed Payments Count: {customer.failed_payments}
            Subscription Status: {customer.subscription_status}
            
            Respond only with a valid JSON object:
            {{
                "diagnosis": "string",
                "priority": "LOW/MEDIUM/HIGH/CRITICAL",
                "recommended_action": "payment_retry/alternative_payment_method/recovery_message/bounded_incentive/escalate_to_human/stop_recovery",
                "reasoning": "string",
                "discount_pct": 0.0
            }}
            """
            
            result_text = self._call_gemini(
                contents=prompt_content,
                system_instruction=SYSTEM_PROMPT,
                json_mode=True
            )
            
            if result_text:
                data = json.loads(result_text)
                return AgentDecision(**data)
            else:
                return self._get_mock_decision(customer, case, probability)
                
        except Exception as e:
            print(f"Gemini decision call error ({e}). Using robust rule-based engine.")
            return self._get_mock_decision(customer, case, probability)


    def _get_mock_decision(self, customer: Customer, case: RecoveryCase, probability: float) -> AgentDecision:
        """
        Determines the intervention based on standard, high-quality business rules.
        Replicates the exact structured response of an LLM.
        """
        amount = case.amount_at_risk
        source_type = case.source_type
        
        # High value cap
        if amount > 50000:
            return AgentDecision(
                diagnosis=f"This high-value order of ₹{amount:,.2f} exceeds your ₹50,000 store safety limit and was flagged for personal review.",
                priority="CRITICAL",
                recommended_action="escalate_to_human",
                reasoning="Safety guardrail triggered: Large orders require manual verification to protect your revenue.",
                discount_pct=0.0
            )
            
        # Determine success rate
        total_orders = max(1, customer.total_orders)
        success_rate = customer.successful_orders / total_orders
        
        if source_type == "PAYMENT_FAILURE":
            # If customer is highly reliable and this is their first failure
            if success_rate >= 0.8 and customer.failed_payments <= 1:
                return AgentDecision(
                    diagnosis="This is a loyal customer who usually pays on time. The failure seems like a temporary bank or network issue.",
                    priority="HIGH",
                    recommended_action="payment_retry",
                    reasoning="Because this customer has a great track record, an automatic retry with the bank is the fastest way to recover the payment.",
                    discount_pct=0.0
                )
            else:
                return AgentDecision(
                    diagnosis="The customer's card was declined after previous failed attempts. Sending a direct payment link will make it easy for them to complete the order.",
                    priority="MEDIUM",
                    recommended_action="alternative_payment_method",
                    reasoning="Sending a fresh WhatsApp payment link with multiple payment options (UPI, card, netbanking) will help the customer pay smoothly.",
                    discount_pct=0.0
                )
                
        elif source_type == "CHECKOUT_ABANDONMENT":
            if amount > 5000 and success_rate < 0.6:
                # Offer a discount to win them back (bounded discount <= 10%)
                return AgentDecision(
                    diagnosis="The customer added valuable items to their cart but left before completing checkout. A special discount will help win them back.",
                    priority="HIGH",
                    recommended_action="bounded_incentive",
                    reasoning="Offering a limited 10% discount coupon (SAVE10) will motivate the customer to complete their purchase right away.",
                    discount_pct=10.0
                )
            else:
                return AgentDecision(
                    diagnosis="The customer left items in their shopping cart. A quick, friendly reminder will help them finish their checkout.",
                    priority="LOW",
                    recommended_action="recovery_message",
                    reasoning="Sending a polite reminder with their cart items is the best friendly approach.",
                    discount_pct=0.0
                )
                
        elif source_type == "SUBSCRIPTION_FAILURE":
            if customer.failed_payments > 2:
                return AgentDecision(
                    diagnosis="Subscription renewal failed repeatedly on the customer's card. Personal support is needed to help them update their billing details.",
                    priority="HIGH",
                    recommended_action="escalate_to_human",
                    reasoning="Automated retries did not go through. A quick support outreach is recommended to keep the subscription active.",
                    discount_pct=0.0
                )
            else:
                return AgentDecision(
                    diagnosis="Subscription renewal failed due to a temporary bank glitch. A scheduled retry should process successfully.",
                    priority="MEDIUM",
                    recommended_action="payment_retry",
                    reasoning="A second automatic charge attempt usually resolves temporary bank drops without bothering the customer.",
                    discount_pct=0.0
                )
                
        else: # RECEIVABLE_OVERDUE
            return AgentDecision(
                diagnosis="An invoice payment is past due. A gentle follow-up is recommended to help the client settle the payment.",
                priority="HIGH",
                recommended_action="escalate_to_human",
                reasoning="Reaching out directly with an invoice reminder is the most professional way to collect overdue balances.",
                discount_pct=0.0
            )

    def run_recovery_workflow(self, case_id: int, db: Session) -> dict:
        """
        Executes the full recovery agent workflow.
        """
        case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            return {"error": "Case not found"}
            
        if case.status in ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"]:
            return {
                "case_id": case.id,
                "status": case.status,
                "diagnosis": case.diagnosis or "Case already completed.",
                "action_executed": case.selected_action or case.recommended_action or "None",
                "message": f"Case #{case.id} is already in status {case.status}.",
                "already_processed": True
            }
            
        case.status = "ANALYZING"
        db.commit()
        
        # 1. Gather context
        cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
        
        # 2. Probability check
        prob_res = agent_tools.calculate_recovery_probability(db, case.id)
        prob = prob_res["probability"]
        
        # 3. Decision
        decision = self.get_decision(cust, case, prob)
        
        # 4. Save recommendations
        case.diagnosis = decision.diagnosis
        case.recommended_action = decision.recommended_action
        case.priority = decision.priority
        db.commit()
        
        # 5. Exec action
        action = decision.recommended_action
        discount_pct = decision.discount_pct or 0.0
        
        # Double check threshold safety again
        if case.amount_at_risk > 50000 and action != "escalate_to_human":
            action = "escalate_to_human"
            decision.reasoning = "Force escalated due to >50k INR safety threshold."
            
        if action == "payment_retry":
            res = agent_tools.create_payment_retry(db, case.id, case.source_id)
        elif action == "alternative_payment_method":
            res = agent_tools.generate_payment_retry_link(db, case.id, case.source_id)
        elif action == "recovery_message":
            res = agent_tools.send_recovery_message(db, case.id, case.customer_id, "RECOVER_MEMBER")
        elif action == "bounded_incentive":
            res = agent_tools.offer_bounded_incentive(db, case.id, case.customer_id, discount_pct)
        elif action == "escalate_to_human":
            res = agent_tools.escalate_to_human(db, case.id, decision.reasoning)
        elif action == "stop_recovery":
            res = agent_tools.stop_recovery(db, case.id, decision.reasoning)
        else:
            res = {"error": f"Unknown action: {action}"}
            
        db.refresh(case)
        return {
            "case_id": case.id,
            "status": case.status,
            "diagnosis": case.diagnosis,
            "action_executed": action,
            "action_result": res
        }

    def handle_chat(self, user_message: str, db: Session) -> str:
        """
        Processes interactive merchant commands using real database queries and live context.
        Supports natural language in English, Hinglish, and flexible phrasing.
        """
        msg = user_message.strip().lower()

        # Check if user spoke in Hinglish or asked for Hinglish
        hinglish_words = [
            "hinglish", "hindi", "karo", "karein", "batao", "dikhao", "hai", "hain", 
            "kitna", "kitne", "paisa", "paise", "kaise", "kya", "pehle", "sabse", 
            "chalu", "shuru", "madad", "rupaye", "rupay", "bhejo", "kardo", "ka", "ki", "ke", "mein", "me"
        ]
        is_hinglish = any(re.search(rf"\b{w}\b", msg) for w in hinglish_words)

        # 1. Action Intent: Run / Start / Recover / Execute / Process a case
        action_keywords = ["start", "recover", "run", "process", "execute", "retry", "fix", "resolve", "chalu", "shuru", "karo", "kardo"]
        is_action_intent = any(k in msg for k in action_keywords)
        
        # Look for case ID pattern like "case #940", "case 940", "#940", or isolated number if action keyword present
        case_id_match = re.search(r"(?:case\s*#?|#)\s*(\d+)", msg)
        if not case_id_match and is_action_intent:
            number_match = re.search(r"\b(\d+)\b", msg)
            if number_match:
                case_id_match = number_match

        if is_action_intent and case_id_match:
            case_id = int(case_id_match.group(1))
            case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
            if not case:
                return f"Database mein **Case #{case_id}** nahi mila. Kripya Case ID check karein." if is_hinglish else f"Could not find **Case #{case_id}** in the database. Please check the Case ID."

            workflow_res = self.run_recovery_workflow(case_id, db)
            if "error" in workflow_res:
                return f"Failed to run recovery workflow on **Case #{case_id}**: {workflow_res['error']}"

            if workflow_res.get("already_processed"):
                if is_hinglish:
                    return (
                        f"**Case #{case_id}** pehle se `{case.status}` status mein hai aur process ho chuka hai.\n"
                        f"- **Diagnosis**: {case.diagnosis or 'Completed'}\n"
                        f"- **Action**: `{case.selected_action or case.recommended_action or 'N/A'}`\n"
                        f"- **Current Status**: `{case.status}`"
                    )
                return (
                    f"**Case #{case_id}** is already in status `{case.status}` and has been processed.\n"
                    f"- **Diagnosis**: {case.diagnosis or 'Completed'}\n"
                    f"- **Action**: `{case.selected_action or case.recommended_action or 'N/A'}`\n"
                    f"- **Current Status**: `{case.status}`"
                )

            diagnosis = workflow_res.get("diagnosis", case.diagnosis or "Analysis complete")
            action = workflow_res.get("action_executed", case.selected_action or "Executed")
            new_status = workflow_res.get("status", case.status)

            if is_hinglish:
                return (
                    f"**Case #{case_id}** ({case.source_type.replace('_', ' ')}) ke liye recovery action execute kar diya gaya hai.\n"
                    f"- **Diagnosis**: {diagnosis}\n"
                    f"- **Action**: `{action}`\n"
                    f"- **New Status**: `{new_status}`"
                )
            return (
                f"Recovery executed on **Case #{case_id}** ({case.source_type.replace('_', ' ')}).\n"
                f"- **Diagnosis**: {diagnosis}\n"
                f"- **Action**: `{action}`\n"
                f"- **New Status**: `{new_status}`"
            )

        # 2. Case Inspection / Status Inquiry (e.g. "status of case 940", "show case 940", "case 940 ka status kya hai")
        if case_id_match and any(w in msg for w in ["status", "show", "inspect", "check", "details", "info", "view", "what about", "dikhao", "batao", "kya hai"]):
            case_id = int(case_id_match.group(1))
            case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
            if not case:
                return f"Database mein **Case #{case_id}** nahi mila." if is_hinglish else f"Could not find **Case #{case_id}** in the database."
            cust = db.query(Customer).filter(Customer.id == case.customer_id).first()
            cust_name = cust.name if cust else f"Customer #{case.customer_id}"
            return (
                f"**Case #{case_id} Summary**:\n"
                f"- **Customer**: {cust_name} ({cust.email if cust else 'N/A'})\n"
                f"- **Amount at Risk**: ₹{case.amount_at_risk:,.2f}\n"
                f"- **Amount Recovered**: ₹{case.amount_recovered:,.2f}\n"
                f"- **Problem Type**: `{case.source_type.replace('_', ' ')}`\n"
                f"- **Current Status**: `{case.status}`\n"
                f"- **Recovery Probability**: {int(case.recovery_probability * 100)}%\n"
                f"- **Priority**: `{case.priority}`\n"
                f"- **Diagnosis**: {case.diagnosis or 'Pending analysis'}"
            )

        # 3. Revenue at risk / Stuck / Lost inquiry (e.g. "kitna revenue risk par hai", "kitna paisa at risk hai")
        if any(w in msg for w in ["revenue at risk", "risk", "stuck", "at-risk", "lost", "paisa at risk", "fasa hua"]):
            open_cases = db.query(RecoveryCase).filter(
                RecoveryCase.status.in_(["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"])
            ).all()
            total_risk = sum(c.amount_at_risk for c in open_cases)
            if is_hinglish:
                return f"Filhaal, **{len(open_cases)} open cases** mein kul **₹{total_risk:,.2f}** revenue at risk (fasa hua) hai."
            return f"Currently, there is **₹{total_risk:,.2f}** in revenue at risk across **{len(open_cases)}** open cases."

        # 4. Recovered amount / Success inquiry (e.g. "kitna recover hua", "kitna paisa wapas aaya")
        if any(w in msg for w in ["recovered", "won back", "recovery rate", "success", "recover hua", "wapas aaya"]):
            recovered_cases = db.query(RecoveryCase).filter(RecoveryCase.status == "RECOVERED").all()
            total_recovered = sum(c.amount_recovered for c in recovered_cases)
            total_cases = db.query(RecoveryCase).count()
            rate = (len(recovered_cases) / total_cases * 100) if total_cases > 0 else 0
            if is_hinglish:
                return f"Recoup ne ab tak **{len(recovered_cases)} cases** mein **₹{total_recovered:,.2f}** successfully recover kar liye hain (All-time recovery rate: **{rate:.1f}%**)."
            return f"Recoup has successfully won back **₹{total_recovered:,.2f}** across **{len(recovered_cases)}** recovered cases (All-time recovery rate: **{rate:.1f}%**)."

        # 5. Recommendations / Top opportunities (e.g. "sabse pehle kya recover karein", "kisko recover karein")
        if any(w in msg for w in ["recover first", "opportunities", "opportunity", "recommend", "priority", "top cases", "what to do", "sabse pehle", "pehle kya", "kisko recover"]):
            opps = db.query(RecoveryCase).filter(
                RecoveryCase.status.in_(["DETECTED", "ACTION_PENDING"])
            ).order_by(RecoveryCase.recovery_probability.desc(), RecoveryCase.amount_at_risk.desc()).limit(5).all()
            
            if not opps:
                return "Abhi koi pending high-priority recovery opportunity nahi hai." if is_hinglish else "There are no pending high-priority recovery opportunities at this moment."
                
            if is_hinglish:
                res = "Yeh hain top high-probability recovery opportunities jo abhi pending hain:\n\n"
                for o in opps:
                    cust = db.query(Customer).filter(Customer.id == o.customer_id).first()
                    name = cust.name if cust else f"Customer #{o.customer_id}"
                    res += f"- **Case #{o.id}**: {name} | Risk: ₹{o.amount_at_risk:,.2f} | Probability: {int(o.recovery_probability*100)}% | Type: `{o.source_type.replace('_', ' ')}`\n"
                res += "\nAap `Case #<id> start karo` type karke autonomous recovery shuru kar sakte hain."
                return res

            res = "Here are the top high-probability recovery opportunities currently pending:\n\n"
            for o in opps:
                cust = db.query(Customer).filter(Customer.id == o.customer_id).first()
                name = cust.name if cust else f"Customer #{o.customer_id}"
                res += f"- **Case #{o.id}**: {name} | Risk: ₹{o.amount_at_risk:,.2f} | Prob: {int(o.recovery_probability*100)}% | Type: `{o.source_type.replace('_', ' ')}`\n"
            res += "\nYou can type `Start recovery for Case #<id>` to trigger autonomous recovery."
            return res

        # 6. Customer inquiry by ID (e.g. "customer 15 dikhao", "customer 15 details")
        cust_match = re.search(r"(?:customer\s*#?|cust\s*#?)\s*(\d+)", msg)
        if cust_match:
            cust_id = int(cust_match.group(1))
            cust = db.query(Customer).filter(Customer.id == cust_id).first()
            if cust:
                return (
                    f"**Customer #{cust.id} Profile**:\n"
                    f"- **Name**: {cust.name}\n"
                    f"- **Email**: {cust.email}\n"
                    f"- **LTV**: ₹{cust.lifetime_value:,.2f}\n"
                    f"- **Orders**: {cust.successful_orders} successful / {cust.total_orders} total\n"
                    f"- **Failed Payments**: {cust.failed_payments}\n"
                    f"- **Subscription Status**: `{cust.subscription_status}`"
                )

        # 7. Customer Segment & Count Queries (e.g. "customers total kitne hai", "active customers kitne hai", "vip customers")
        if any(w in msg for w in ["active customer", "active customers", "active subscription", "active subscriptions"]):
            active_count = db.query(Customer).filter(Customer.subscription_status == "ACTIVE").count()
            total_cust = db.query(Customer).count()
            if is_hinglish:
                return f"Store mein filhaal **{active_count} active subscription customers** hain (Total **{total_cust:,}** customers mein se)."
            return f"There are currently **{active_count} active subscription customers** in the store (out of **{total_cust:,}** total customers)."

        if any(w in msg for w in ["vip customer", "vip customers", "repeat buyer", "repeat buyers"]):
            vip_count = db.query(Customer).filter(Customer.lifetime_value >= 50000).count()
            repeat_count = db.query(Customer).filter(Customer.successful_orders >= 2).count()
            if is_hinglish:
                return (
                    f"**Customer Segments**:\n"
                    f"- **VIP Customers (LTV ≥ ₹50,000)**: **{vip_count}**\n"
                    f"- **Repeat Buyers (2+ orders)**: **{repeat_count}**"
                )
            return (
                f"**Customer Segments Summary**:\n"
                f"- **VIP Customers (LTV ≥ ₹50,000)**: **{vip_count}**\n"
                f"- **Repeat Buyers (2+ successful orders)**: **{repeat_count}**"
            )

        if any(w in msg for w in ["customer", "customers", "grahak", "users"]) and any(w in msg for w in ["how many", "count", "total", "kitne", "kitna", "sankhya", "list", "overview", "hai"]):
            total_cust = db.query(Customer).count()
            active_cust = db.query(Customer).filter(Customer.subscription_status == "ACTIVE").count()
            past_due = db.query(Customer).filter(Customer.subscription_status == "PAST_DUE").count()
            cancelled = db.query(Customer).filter(Customer.subscription_status == "CANCELLED").count()
            vip_cust = db.query(Customer).filter(Customer.lifetime_value >= 50000).count()
            if is_hinglish:
                return (
                    f"**Store Customer Base Overview**:\n"
                    f"- **Kul Customers (Total)**: **{total_cust:,}**\n"
                    f"- **Active Subscriptions**: **{active_cust}**\n"
                    f"- **Past Due (Payment Pending)**: **{past_due}**\n"
                    f"- **Cancelled**: **{cancelled}**\n"
                    f"- **VIP Customers (LTV ≥ ₹50k)**: **{vip_cust}**"
                )
            return (
                f"**Store Customer Directory Overview**:\n"
                f"- **Total Customers**: **{total_cust:,}**\n"
                f"- **Active Subscriptions**: **{active_cust}**\n"
                f"- **Past Due (Action Needed)**: **{past_due}**\n"
                f"- **Cancelled**: **{cancelled}**\n"
                f"- **VIP High-LTV Customers**: **{vip_cust}**"
            )

        # 8. Transaction Count & Ledger Queries (e.g. "transactions total kitne hai", "failed transactions")
        if any(w in msg for w in ["transaction", "transactions", "tx", "payments", "payment"]) and any(w in msg for w in ["how many", "count", "total", "kitne", "kitna", "failed", "success", "overview"]):
            total_tx = db.query(Transaction).count()
            success_tx = db.query(Transaction).filter(Transaction.status == "SUCCESS").count()
            failed_tx = db.query(Transaction).filter(Transaction.status == "FAILED").count()
            if is_hinglish:
                return (
                    f"**Transaction Ledger Overview**:\n"
                    f"- **Kul Transactions (Total)**: **{total_tx:,}**\n"
                    f"- **Kamyab (Successful)**: **{success_tx:,}**\n"
                    f"- **Failed / Dropped**: **{failed_tx:,}**\n\n"
                    f"Recoup autonomously in failed transactions ko monitor aur recover karta hai."
                )
            return (
                f"**Transaction Ledger Overview**:\n"
                f"- **Total Transactions**: **{total_tx:,}**\n"
                f"- **Successful Checkouts**: **{success_tx:,}**\n"
                f"- **Failed / Dropped**: **{failed_tx:,}**\n\n"
                f"Recoup actively monitors and triggers automated recovery interventions on these failed transactions."
            )

        # 9. Total case count / general stats (e.g. "kitne cases hain", "total cases kitne hain")
        if any(w in msg for w in ["how many", "count", "total cases", "stats", "overview", "kitne cases"]):
            total_cases = db.query(RecoveryCase).count()
            open_cases = db.query(RecoveryCase).filter(
                RecoveryCase.status.in_(["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"])
            ).count()
            recovered = db.query(RecoveryCase).filter(RecoveryCase.status == "RECOVERED").count()
            escalated = db.query(RecoveryCase).filter(RecoveryCase.status == "ESCALATED").count()
            if is_hinglish:
                return (
                    f"**Recoup System Overview**:\n"
                    f"- **Kul Cases (Total)**: **{total_cases}**\n"
                    f"- **Open / Active Cases**: **{open_cases}**\n"
                    f"- **Recovered**: **{recovered}**\n"
                    f"- **Escalated (Human Review)**: **{escalated}**"
                )
            return (
                f"**Recoup System Overview**:\n"
                f"- **Total Cases**: **{total_cases}**\n"
                f"- **Open / Active Cases**: **{open_cases}**\n"
                f"- **Recovered**: **{recovered}**\n"
                f"- **Escalated to Human**: **{escalated}**"
            )

        # 8. Freeform / Arbitrary Merchant Question (LLM or Contextual Intelligence)
        return self._generate_freeform_response(user_message, db, is_hinglish)

    def _generate_freeform_response(self, user_message: str, db: Session, is_hinglish: bool) -> str:
        """
        Generates contextual, conversational responses to ANY merchant question.
        Uses live Gemini/OpenAI if available, with an intelligent knowledge base fallback.
        """
        msg = user_message.lower().strip()

        # Gather real-time store context
        open_cases = db.query(RecoveryCase).filter(
            RecoveryCase.status.in_(["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"])
        ).all()
        recovered_cases = db.query(RecoveryCase).filter(RecoveryCase.status == "RECOVERED").all()
        escalated_cases = db.query(RecoveryCase).filter(RecoveryCase.status == "ESCALATED").all()
        
        total_risk = sum(c.amount_at_risk for c in open_cases)
        total_recovered = sum(c.amount_recovered for c in recovered_cases)
        total_cases = db.query(RecoveryCase).count()
        recovery_rate = (len(recovered_cases) / total_cases * 100) if total_cases > 0 else 0

        # Try live LLM (Gemini or OpenAI) first if keys are present
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            try:
                system_context = (
                    f"You are Recoup, the autonomous AI Revenue Recovery agent for this online store.\n"
                    f"Current Live Store Data:\n"
                    f"- Total Recovery Cases: {total_cases}\n"
                    f"- Active Open Cases: {len(open_cases)}\n"
                    f"- Total Revenue at Risk: ₹{total_risk:,.2f}\n"
                    f"- Total Revenue Recovered: ₹{total_recovered:,.2f}\n"
                    f"- Overall Recovery Rate: {recovery_rate:.1f}%\n"
                    f"- Escalated Cases: {len(escalated_cases)}\n\n"
                    f"Respond helpfully, concisely, and politely in {'Hinglish (natural conversational Hindi-English blend)' if is_hinglish else 'clear, professional English'}.\n"
                    f"Format numbers in INR (₹) and use Markdown formatting."
                )

                if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
                    import openai
                    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                    resp = client.chat.completions.create(
                        model=settings.OPENAI_MODEL,
                        messages=[
                            {"role": "system", "content": system_context},
                            {"role": "user", "content": user_message}
                        ],
                        max_tokens=350
                    )
                    if resp.choices and resp.choices[0].message.content:
                        return resp.choices[0].message.content.strip()

                elif settings.GEMINI_API_KEY:
                    gemini_resp = self._call_gemini(
                        contents=user_message,
                        system_instruction=system_context
                    )
                    if gemini_resp:
                        return gemini_resp
            except Exception as e:
                print(f"Live LLM chat call error ({e}). Using intelligent knowledge base fallback.")

        # Conversational Acknowledgments (e.g. "ok", "okay", "alright", "sure", "theek hai", "cool", "got it", "haan", "sahi hai")
        ack_phrases = ["ok", "okay", "k", "kk", "sure", "alright", "got it", "cool", "fine", "theek hai", "thik hai", "sahi hai", "accha", "acha", "haan", "yes", "done", "noted", "samajh gaya", "understood"]
        if msg in ack_phrases or any(msg == p for p in ack_phrases):
            if is_hinglish or any(w in msg for w in ["theek", "thik", "accha", "acha", "sahi", "haan", "samajh"]):
                return "Theek hai! Jab bhi aapko koi case recover karna ho ya store stats dekhne hon, bas batayein."
            return "Sounds good! Let me know whenever you'd like me to run recovery on a case, analyze opportunities, or check store metrics."

        # Intelligent Contextual Knowledge Base Fallback
        # A. How to improve / advice / strategies
        if any(w in msg for w in ["improve", "increase", "better", "strategy", "kaise karein", "tips", "advice", "badhayein"]):
            if is_hinglish:
                return (
                    f"**Recovery Rate Badhane ke Tips**:\n"
                    f"1. **Smart Payment Retries**: Payment drop hone ke turant baad retry link bhejne se recovery 40% tak badh sakti hai.\n"
                    f"2. **Alternative Payment Methods**: Agar card decline ho, toh customer ko instant UPI ya Netbanking link offer karein.\n"
                    f"3. **Bounded Discounts**: Abandoned carts ke liye 5-10% ka limited-time incentive dropoff ko recover karne mein madad karta hai.\n"
                    f"4. **Automated Monitoring**: Recoup abhi aapke **₹{total_risk:,.2f}** at-risk revenue ko autonomously protect kar raha hai."
                )
            return (
                f"**Top Strategies to Maximize Revenue Recovery**:\n"
                f"1. **Instant Alternative Payment Links**: When card authorization fails, sending an immediate UPI or Netbanking link converts up to 40% of dropped checkouts.\n"
                f"2. **Smart Timed Retries**: Retrying temporary bank drops within optimal grace windows prevents unnecessary cancellations.\n"
                f"3. **Bounded Incentives**: Offering a small 5–10% limited-time incentive rescues high-intent cart abandonments without sacrificing margins.\n"
                f"4. **Automated Guardrails**: High-value orders (>₹50,000) are safely escalated for human merchant review."
            )

        # B. Problem types explanations (Cart drop, subscription, invoices)
        if any(w in msg for w in ["cart", "dropoff", "abandon", "abandonment"]):
            if is_hinglish:
                return (
                    f"**Cart Dropoff / Abandonment Recovery**:\n"
                    f"Jab customer checkout par items add karke payment complete kiye bina chala jata hai, Recoup automated recovery message aur personalized dynamic payment link bhejta hai.\n"
                    f"Aap `What should I recover first?` pooch kar top high-value carts dekh sakte hain."
                )
            return (
                f"**Cart Abandonment Recovery**:\n"
                f"When shoppers abandon checkout before paying, Recoup automatically evaluates their customer lifetime value (LTV) and triggers friendly recovery messages with dynamic payment links to win back the order."
            )

        if any(w in msg for w in ["subscription", "recurring", "auto-debit", "mandate"]):
            if is_hinglish:
                return (
                    f"**Subscription & Auto-Debit Failures**:\n"
                    f"Recurring subscription payments aksar card expiry ya temporary bank downtime ki wajah se fail hote hain. Recoup smart retries perform karta hai aur customer ko mandate update link bhejta hai."
                )
            return (
                f"**Subscription & Recurring Billing Failures**:\n"
                f"Recurring payments often fail due to card expiration or temporary bank throttling. Recoup schedules smart retry intervals and generates zero-friction mandate update links to prevent churn."
            )

        # C. System policies & safety
        if any(w in msg for w in ["safety", "threshold", "50000", "50,000", "limit", "policy", "guardrail", "rule"]):
            if is_hinglish:
                return (
                    f"**Recoup Safety Guardrails**:\n"
                    f"- **High-Value Protection**: ₹50,000 se zyada ke cases automatically store staff ke manual review ke liye escalate ho jate hain.\n"
                    f"- **Max Interventions**: Maximum 2 automated attempts per case kiye jate hain customer ko spam se bachane ke liye.\n"
                    f"- **Discount Cap**: Maximum incentive discount 10.0% par bounded hai."
                )
            return (
                f"**Recoup Safety Guardrails & Policies**:\n"
                f"- **High-Value Threshold**: Any order exceeding ₹50,000 is automatically escalated for merchant manual review.\n"
                f"- **Max Automated Attempts**: Capped at 2 interventions per case to maintain brand reputation.\n"
                f"- **Discount Cap**: Any automated recovery discount is strictly capped at 10.0%."
            )

        # D. Greetings / Identity
        if any(w in msg for w in ["who are you", "what are you", "kaun ho", "kya ho", "intro", "hello", "hi", "namaste", "hey"]):
            if is_hinglish:
                return (
                    f"Namaste! Main **Recoup** hoon, aapka autonomous AI Revenue Recovery assistant.\n\n"
                    f"Main aapke failed payments, abandoned checkouts, aur overdue invoices ko track karke unhe automate tareeqe se recover karta hoon.\n"
                    f"Abhi store mein **{len(open_cases)} open recovery cases** hain jinpar kul **₹{total_risk:,.2f}** at risk hai."
                )
            return (
                f"Hello! I am **Recoup**, your autonomous AI Revenue Recovery assistant.\n\n"
                f"I continuously monitor your failed transactions, cart abandonments, and overdue receivables to recover lost revenue automatically.\n"
                f"Currently tracking **{len(open_cases)} open cases** representing **₹{total_risk:,.2f}** in revenue at risk."
            )

        # E. Thanks / Appreciation
        if any(w in msg for w in ["thank", "thanks", "dhanyawad", "shukriya", "great", "good job", "badhiya"]):
            if is_hinglish:
                return "Aapka swagat hai! Agar revenue recovery ya kisi specific case ke baare mein koi aur sawaal ho, toh zaroor batayein."
            return "You're very welcome! Let me know if you need help analyzing other recovery opportunities or specific cases."

        # Generic intelligent response with live store telemetry
        if is_hinglish:
            return (
                f"Main aapke store ke revenue data ko analyze kar sakta hoon. Filhaal:\n"
                f"- **{len(open_cases)} cases open hain** (Total risk: **₹{total_risk:,.2f}**)\n"
                f"- **₹{total_recovered:,.2f}** already successfully recover kiya ja chuka hai\n\n"
                f"Aap mujhse store analytics, kisi case ki detail (`Case #940 details`), customer profile (`Customer #15`), ya recovery strategies ke baare mein pooch sakte hain."
            )
        return (
            f"I am continuously monitoring your store's recovery operations. Current telemetry:\n"
            f"- **{len(open_cases)} active cases** (Total at risk: **₹{total_risk:,.2f}**)\n"
            f"- **₹{total_recovered:,.2f}** won back across {len(recovered_cases)} cases\n\n"
            f"You can ask me to execute actions (`Start recovery for Case #940`), inspect records (`Status of Case #940`), analyze customers (`Customer #15`), or provide recovery recommendations."
        )

orchestrator = Orchestrator()
