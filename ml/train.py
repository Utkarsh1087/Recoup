import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

# Add the workspace root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.db.database import SessionLocal
from backend.app.models import RecoveryCase, Customer

def train_model():
    print("Connecting to database to extract training data...")
    db = SessionLocal()
    try:
        # Fetch resolved historical recovery cases
        cases = db.query(RecoveryCase).filter(
            RecoveryCase.status.in_(["RECOVERED", "FAILED", "ESCALATED", "STOPPED"])
        ).all()
        
        if not cases:
            print("No historical cases found in the database. Please seed the database first.")
            return
        
        print(f"Found {len(cases)} resolved recovery cases for training.")
        
        # Build features dataframe
        data = []
        for c in cases:
            cust = c.customer
            # Feature calculation
            total_orders = max(1, cust.total_orders)
            success_rate = cust.successful_orders / total_orders
            
            # Label: 1 if RECOVERED, 0 otherwise
            label = 1 if c.status == "RECOVERED" else 0
            
            data.append({
                "amount_at_risk": c.amount_at_risk,
                "source_type": c.source_type,
                "customer_ltv": cust.lifetime_value,
                "customer_total_orders": cust.total_orders,
                "customer_success_rate": success_rate,
                "customer_failed_payments": cust.failed_payments,
                "previous_returns": cust.previous_returns,
                "label": label
            })
            
        df = pd.DataFrame(data)
        
        # One-hot encoding for categorical variable 'source_type'
        df = pd.get_dummies(df, columns=["source_type"], drop_first=False)
        
        # Ensure all source types are present in columns (in case some didn't appear)
        required_source_cols = [
            "source_type_PAYMENT_FAILURE", 
            "source_type_CHECKOUT_ABANDONMENT", 
            "source_type_SUBSCRIPTION_FAILURE",
            "source_type_RECEIVABLE_OVERDUE"
        ]
        for col in required_source_cols:
            if col not in df.columns:
                df[col] = 0
                
        # Split features and labels
        X = df.drop(columns=["label"])
        y = df["label"]
        
        # Save feature column names list to make predictions consistent
        feature_cols = list(X.columns)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print(f"Training set size: {X_train.shape[0]}, Test set size: {X_test.shape[0]}")
        
        # Train Random Forest Classifier
        model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6)
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        try:
            auc = roc_auc_score(y_test, y_prob)
        except ValueError:
            auc = 0.5
            
        print("\nModel Evaluation Metrics:")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  ROC-AUC:   {auc:.4f}")
        
        # Ensure directory exists
        os.makedirs(os.path.abspath("ml"), exist_ok=True)
        
        # Save models and features metadata
        model_path = "ml/recovery_model.joblib"
        meta_path = "ml/model_meta.joblib"
        
        joblib.dump(model, model_path)
        joblib.dump({"feature_cols": feature_cols, "metrics": {
            "accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc
        }}, meta_path)
        
        print(f"\nModel and metadata saved successfully to 'ml/' directory.")
        
    except Exception as e:
        print(f"Error training model: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    train_model()
