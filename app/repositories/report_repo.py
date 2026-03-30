from app.core.extensions import mongo
from datetime import datetime

def save_report(data):
    report = {
        "data": data,
        "created_at": datetime.utcnow()
    }
    return mongo.db.reports.insert_one(report)