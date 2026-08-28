import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models import RecoveryCase, Customer, Transaction

class AnalyticsService:
    @staticmethod
    def get_dashboard_summary(db: Session):
        # Unresolved cases are open cases where revenue is at risk
        open_cases = db.query(RecoveryCase).filter(
            RecoveryCase.status.in_(["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"])
        ).all()
        
        revenue_at_risk = sum(c.amount_at_risk for c in open_cases)
        
        # Recovered revenue
        recovered_cases = db.query(RecoveryCase).filter(
            RecoveryCase.status == "RECOVERED"
        ).all()
        
        revenue_recovered = sum(c.amount_recovered for c in recovered_cases)
        
        # Counts of cases by status
        total_cases = db.query(RecoveryCase).count()
        recovered_count = len(recovered_cases)
        escalated_count = db.query(RecoveryCase).filter(RecoveryCase.status == "ESCALATED").count()
        failed_count = db.query(RecoveryCase).filter(RecoveryCase.status == "FAILED").count()
        stopped_count = db.query(RecoveryCase).filter(RecoveryCase.status == "STOPPED").count()
        
        # Recovery rate: recovered cases / total completed cases
        completed_count = recovered_count + failed_count + stopped_count + escalated_count
        recovery_rate = (recovered_count / completed_count * 100) if completed_count > 0 else 0.0
        
        return {
            "revenue_at_risk": round(revenue_at_risk, 2),
            "revenue_recovered": round(revenue_recovered, 2),
            "recovery_rate": round(recovery_rate, 1),
            "cases_analyzed": total_cases,
            "cases_recovered": recovered_count,
            "cases_escalated": escalated_count,
            "cases_failed": failed_count,
            "cases_stopped": stopped_count
        }

    @staticmethod
    def get_recovery_by_source(db: Session):
        results = db.query(
            RecoveryCase.source_type,
            func.count(RecoveryCase.id).label("total_cases"),
            func.sum(RecoveryCase.amount_at_risk).label("total_risk"),
            func.sum(RecoveryCase.amount_recovered).label("total_recovered")
        ).group_by(RecoveryCase.source_type).all()
        
        data = []
        for r in results:
            data.append({
                "source": r.source_type,
                "total_cases": r.total_cases,
                "total_risk": round(r.total_risk or 0.0, 2),
                "total_recovered": round(r.total_recovered or 0.0, 2),
                "recovery_rate": round(((r.total_recovered or 0.0) / (r.total_risk or 1.0)) * 100, 1)
            })
        return data

    @staticmethod
    def get_timeline_data(db: Session, days: int = 30):
        # We can extract recovered and at-risk timelines grouped by date
        # For simplicity in mock data, let's group by created_at date
        start_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
        
        results = db.query(
            func.date(RecoveryCase.created_at).label("date"),
            func.sum(RecoveryCase.amount_at_risk).label("at_risk"),
            func.sum(RecoveryCase.amount_recovered).label("recovered")
        ).filter(RecoveryCase.created_at >= start_date)\
         .group_by(func.date(RecoveryCase.created_at))\
         .order_by(func.date(RecoveryCase.created_at)).all()
         
        timeline = []
        for r in results:
            timeline.append({
                "date": str(r.date),
                "at_risk": round(r.at_risk or 0.0, 2),
                "recovered": round(r.recovered or 0.0, 2)
            })
        return timeline
