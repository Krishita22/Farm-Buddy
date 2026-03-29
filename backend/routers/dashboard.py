from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.outbreak_detector import detect_outbreaks, get_dashboard_stats
from backend.database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class OutbreakReport(BaseModel):
    crop_name: str
    disease_name: str
    severity: str = "moderate"
    latitude: float = None
    longitude: float = None


@router.post("/report-outbreak")
async def report_outbreak(report: OutbreakReport):
    """Report a disease outbreak from the dashboard."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, latitude, longitude, confirmed)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (None, report.crop_name, report.disease_name, report.severity,
             report.latitude, report.longitude, 1),
        )
        # Also create an alert so it shows in Recent Alerts
        await db.execute(
            "INSERT INTO alerts (farmer_id, alert_type, content, language) VALUES (?, ?, ?, ?)",
            (None, "outbreak",
             f"{report.disease_name} reported on {report.crop_name} ({report.severity})",
             "en"),
        )
        await db.commit()
        return {"status": "ok", "message": "Outbreak reported"}
    finally:
        await db.close()


@router.get("/stats")
async def stats():
    return await get_dashboard_stats()


@router.get("/outbreaks")
async def outbreaks():
    return await detect_outbreaks()


@router.get("/farms")
async def all_farms():
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            """SELECT f.id, f.name, f.village, f.district, f.latitude, f.longitude,
                      f.farm_size_acres, f.soil_type, f.language,
                      (SELECT GROUP_CONCAT(crop_name) FROM crops WHERE farmer_id = f.id AND status = 'growing') as active_crops,
                      (SELECT COUNT(*) FROM disease_reports WHERE farmer_id = f.id AND reported_at > datetime('now', '-14 days')) as recent_issues
               FROM farmers f ORDER BY f.name"""
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("/disease-timeline")
async def disease_timeline():
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            """SELECT date(reported_at) as date, disease_name, COUNT(*) as count
               FROM disease_reports
               WHERE reported_at > datetime('now', '-30 days')
               GROUP BY date(reported_at), disease_name
               ORDER BY date"""
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("/alerts")
async def recent_alerts():
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            """SELECT a.*, f.name as farmer_name
               FROM alerts a
               LEFT JOIN farmers f ON a.farmer_id = f.id
               ORDER BY a.sent_at DESC LIMIT 20"""
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()
