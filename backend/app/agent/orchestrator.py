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

        # Identify language style
        hinglish_words = [
            "hinglish", "hindi", "karo", "karein", "batao", "dikhao", "hai", "hain", 
            "kitna", "kitne", "paisa", "paise", "kaise", "kya", "pehle", "sabse", 
            "chalu", "shuru", "madad", "rupaye", "rupay", "bhejo", "kardo", "ka", "ki", "ke", "mein", "me", "kisko"
        ]
        is_hinglish = any(re.search(rf"\b{w}\b", msg) for w in hinglish_words)

        # 1. Check for Action Intent: Explicit command to execute a case recovery
        # (e.g. "Start recovery for Case #2", "Recover case 15", "case 5 shuru karo")
        case_id_match = re.search(r"(?:case\s*#?|#)\s*(\d+)", msg)
        is_action_command = any(re.search(rf"\b{k}\b", msg) for k in ["start", "run", "process", "execute", "retry", "resolve", "chalu", "shuru", "kardo"]) or ("recover" in msg and "recovery" not in msg)
        is_question = any(w in msg for w in ["which", "what", "who", "how", "list", "show", "status", "details", "info", "kya", "kaise", "dikhao", "batao", "?"])

        if is_action_command and case_id_match and not is_question:
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

        # 2. For ALL questions, inquiries, advice, and conversation: Pass directly to Gemini / LLM with Live Grounding
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

        # Top pending opportunities
        top_pending = db.query(RecoveryCase).filter(
            RecoveryCase.status.in_(["DETECTED", "ACTION_PENDING"])
        ).order_by(RecoveryCase.recovery_probability.desc(), RecoveryCase.amount_at_risk.desc()).limit(8).all()
        pending_summary = []
        for p in top_pending:
            c_obj = db.query(Customer).filter(Customer.id == p.customer_id).first()
            c_name = c_obj.name if c_obj else f"Customer #{p.customer_id}"
            pending_summary.append(f"- Case #{p.id}: {c_name} | Risk: ₹{p.amount_at_risk:,.2f} | Prob: {int(p.recovery_probability * 100)}% | Status: {p.status} | Type: {p.source_type}")

        # Top overall high-probability cases
        high_prob = db.query(RecoveryCase).filter(
            RecoveryCase.recovery_probability >= 0.70
        ).order_by(RecoveryCase.recovery_probability.desc()).limit(8).all()
        high_prob_summary = []
        for h in high_prob:
            c_obj = db.query(Customer).filter(Customer.id == h.customer_id).first()
            c_name = c_obj.name if c_obj else f"Customer #{h.customer_id}"
            high_prob_summary.append(f"- Case #{h.id}: {c_name} | Risk: ₹{h.amount_at_risk:,.2f} | Prob: {int(h.recovery_probability * 100)}% | Status: {h.status}")

        total_cust = db.query(Customer).count()
        active_cust = db.query(Customer).filter(Customer.subscription_status == "ACTIVE").count()
        past_due = db.query(Customer).filter(Customer.subscription_status == "PAST_DUE").count()
        vip_cust = db.query(Customer).filter(Customer.lifetime_value >= 50000).count()

        total_tx = db.query(Transaction).count()
        success_tx = db.query(Transaction).filter(Transaction.status == "SUCCESS").count()
        failed_tx = db.query(Transaction).filter(Transaction.status == "FAILED").count()

        # Try live LLM (Gemini or OpenAI) first if keys are present
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            try:
                system_context = (
                    f"You are Recoup, the autonomous AI Revenue Recovery agent for this online store.\n"
                    f"You have direct access to the live store database.\n\n"
                    f"Live Financial & Operational Telemetry:\n"
                    f"- Total Recovery Cases: {total_cases}\n"
                    f"- Active Open Cases: {len(open_cases)}\n"
                    f"- Total Revenue at Risk: ₹{total_risk:,.2f}\n"
                    f"- Total Revenue Recovered: ₹{total_recovered:,.2f}\n"
                    f"- Overall Recovery Rate: {recovery_rate:.1f}%\n"
                    f"- Escalated Cases: {len(escalated_cases)}\n"
                    f"- Total Customers: {total_cust} (Active Subscriptions: {active_cust}, Past Due: {past_due}, VIP LTV >= ₹50k: {vip_cust})\n"
                    f"- Total Transactions: {total_tx} (Successful: {success_tx}, Failed: {failed_tx})\n\n"
                    f"Top Pending Opportunities:\n" + ("\n".join(pending_summary) if pending_summary else "None pending") + "\n\n"
                    f"Sample High Probability Cases (>= 70%):\n" + ("\n".join(high_prob_summary) if high_prob_summary else "None") + "\n\n"
                    f"Instructions:\n"
                    f"- Answer the user's specific question directly, politely, and accurately using this live data.\n"
                    f"- Respond in {'natural conversational Hinglish (Hindi-English blend)' if is_hinglish else 'clear, professional English'}.\n"
                    f"- Always format monetary values in INR (₹).\n"
                    f"- Keep answers focused and well-structured with Markdown."
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
                        max_tokens=400
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
