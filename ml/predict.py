import os
import sys
import joblib
import pandas as pd

# Add the workspace root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "recovery_model.joblib"))
META_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "model_meta.joblib"))

def predict_case_probability(customer, source_type: str, amount_at_risk: float) -> float:
    """
    Predicts the probability of successfully recovering the revenue.
    If the trained ML model is available, it uses the ML model.
    Otherwise, it falls back to a high-quality heuristic model.
    """
    total_orders = max(1, customer.total_orders)
    success_rate = customer.successful_orders / total_orders
    
    # Try using serialized machine learning model
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            meta = joblib.load(META_PATH)
            feature_cols = meta["feature_cols"]
            
            # Build feature dictionary
            feat_dict = {col: 0 for col in feature_cols}
            
            # Set continuous features
            feat_dict["amount_at_risk"] = amount_at_risk
            feat_dict["customer_ltv"] = customer.lifetime_value
            feat_dict["customer_total_orders"] = customer.total_orders
            feat_dict["customer_success_rate"] = success_rate
            feat_dict["customer_failed_payments"] = customer.failed_payments
            feat_dict["previous_returns"] = customer.previous_returns
            
            # Set one-hot feature
            source_col = f"source_type_{source_type}"
            if source_col in feat_dict:
                feat_dict[source_col] = 1
                
            # Create DataFrame with columns aligned
            df = pd.DataFrame([feat_dict])[feature_cols]
            
            # Predict probability
            prob = model.predict_proba(df)[0][1]
            return float(round(prob, 2))
        except Exception as e:
            print(f"Warning: ML prediction failed ({e}). Falling back to heuristic.")
            
    # Heuristic fallback (Very clean and realistic business logic)
    # 1. Base rate by source
    if source_type == "PAYMENT_FAILURE":
        base_prob = 0.70
    elif source_type == "SUBSCRIPTION_FAILURE":
        base_prob = 0.60
    elif source_type == "CHECKOUT_ABANDONMENT":
        base_prob = 0.40
    else: # RECEIVABLE_OVERDUE
        base_prob = 0.35
        
    # 2. Adjust based on customer payment history success rate
    history_adj = (success_rate - 0.75) * 0.3  # if success_rate is 100%, +0.075; if 50%, -0.075
    
    # 3. Adjust based on customer lifetime value
    ltv_adj = 0.0
    if customer.lifetime_value > 30000:
        ltv_adj = 0.05
    elif customer.lifetime_value > 10000:
        ltv_adj = 0.02
    elif customer.lifetime_value < 2000:
        ltv_adj = -0.05
        
    # 4. Adjust based on number of failed payments
    failure_adj = -0.03 * min(customer.failed_payments, 5)
    
    # Calculate final probability bounded between 0.1 and 0.95
    final_prob = base_prob + history_adj + ltv_adj + failure_adj
    final_prob = max(0.10, min(0.95, final_prob))
    
    return float(round(final_prob, 2))
