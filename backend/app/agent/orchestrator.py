import json
import os
import random
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

    def _get_gemini_decision(self, customer: Customer, case: RecoveryCase, probability: float) -> AgentDecision:
        if not settings.GEMINI_API_KEY or getattr(self, "_gemini_failed_previously", False):
            return self._get_mock_decision(customer, case, probability)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            prompt_content = f"""
            SYSTEM INSTRUCTION: {SYSTEM_PROMPT}
            
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
            
            model_name = settings.GEMINI_MODEL if settings.GEMINI_MODEL in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"] else "gemini-1.5-flash"
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt_content,
                generation_config={"response_mime_type": "application/json"}
            )
            
            if response and response.text:
                data = json.loads(response.text)
                return AgentDecision(**data)
            else:
                raise ValueError("Empty response from Gemini")
                
        except Exception as e:
            # Mark failed so subsequent batch items execute instantly without hanging
            self._gemini_failed_previously = True
            print(f"Gemini call failed ({e}). Falling back to mock decision engine.")
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
            return {"status": case.status, "message": "Case already processed."}
            
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
        Processes interactive merchant commands.
        Connects chat prompts to actual database states and calculations.
        """
        # Parse query for keywords (simple natural language routing to backend queries)
        msg = user_message.lower()
        
        if "revenue at risk" in msg or "risk" in msg:
            # Calculate open risk
            open_cases = db.query(RecoveryCase).filter(
                RecoveryCase.status.in_(["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"])
            ).all()
            total_risk = sum(c.amount_at_risk for c in open_cases)
            return f"Currently, there is **₹{total_risk:,.2f}** in revenue at risk across **{len(open_cases)}** open cases."
            
        elif "recover first" in msg or "opportunities" in msg or "opportunity" in msg:
            # Query top opportunities (highest probability payment failures)
            opps = db.query(RecoveryCase).filter(
                RecoveryCase.status.in_(["DETECTED", "ACTION_PENDING"]),
                RecoveryCase.recovery_probability >= 0.70
            ).order_by(RecoveryCase.amount_at_risk.desc()).limit(5).all()
            
            if not opps:
                return "There are no high-probability recovery opportunities currently pending."
                
            res = "Here are the top 5 high-probability opportunities currently pending:\n\n"
            for o in opps:
                cust = db.query(Customer).filter(Customer.id == o.customer_id).first()
                name = cust.name if cust else f"Customer #{o.customer_id}"
                res += f"- **Case #{o.id}**: {name} | Risk: ₹{o.amount_at_risk:,.2f} | Prob: {int(o.recovery_probability*100)}% | Recommended: `{o.source_type}`\n"
            return res
            
        elif "start recovery for" in msg or "recover case" in msg:
            # Extract case ID
            words = msg.split()
            case_id = None
            for w in words:
                clean = "".join(filter(str.isdigit, w))
                if clean:
                    case_id = int(clean)
                    break
            
            if not case_id:
                return "Please specify the case ID to run recovery. E.g., 'Start recovery for Case #105'."
                
            case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
            if not case:
                return f"Could not find case #{case_id} in the database."
                
            workflow_res = self.run_recovery_workflow(case_id, db)
            if "error" in workflow_res:
                return f"Failed to run recovery workflow on case #{case_id}: {workflow_res['error']}"
                
            return f"Recovery executed on **Case #{case_id}** ({case.source_type}).\n- **Diagnosis**: {workflow_res['diagnosis']}\n- **Action**: `{workflow_res['action_executed']}`\n- **New Status**: `{workflow_res['status']}`"
            
        else:
            return "I am RecoverAI, your Revenue Recovery assistant. You can ask me:\n- *How much revenue is at risk today?*\n- *What should I recover first?*\n- *Start recovery for Case #<id>*"

orchestrator = Orchestrator()
