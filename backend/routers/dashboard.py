"""Dashboard API endpoints for stats, outbreaks, farms, alerts, and disease timeline."""

from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.outbreak_detector import detect_outbreaks, get_dashboard_stats
from backend.constants import use_db, ok_response

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class OutbreakReport(BaseModel):
    crop_name: str
    disease_name: str
    severity: str = "moderate"
    latitude: float = None
    longitude: float = None
    language: str = "en"


# Report a new disease outbreak and create an alert
@router.post("/report-outbreak")
async def report_outbreak(report: OutbreakReport):
    """Report a disease outbreak from the dashboard."""
    async with use_db() as db:
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
             report.language),
        )
        await db.commit()
        return ok_response("Outbreak reported")


# Aggregated dashboard statistics
@router.get("/stats")
async def stats():
    return await get_dashboard_stats()


# Detect and return current disease outbreaks
@router.get("/outbreaks")
async def outbreaks():
    return await detect_outbreaks()


# List all registered farms with active crops and recent issues
@router.get("/farms")
async def all_farms():
    async with use_db() as db:
        rows = await db.execute_fetchall(
            """SELECT f.id, f.name, f.village, f.district, f.latitude, f.longitude,
                      f.farm_size_acres, f.soil_type, f.language,
                      (SELECT GROUP_CONCAT(crop_name) FROM crops WHERE farmer_id = f.id AND status = 'growing') as active_crops,
                      (SELECT COUNT(*) FROM disease_reports WHERE farmer_id = f.id AND reported_at > datetime('now', '-14 days')) as recent_issues
               FROM farmers f ORDER BY f.name"""
        )
        return [dict(r) for r in rows]


# Disease reports grouped by date for the last 30 days
@router.get("/disease-timeline")
async def disease_timeline():
    async with use_db() as db:
        rows = await db.execute_fetchall(
            """SELECT date(reported_at) as date, disease_name, COUNT(*) as count
               FROM disease_reports
               WHERE reported_at > datetime('now', '-30 days')
               GROUP BY date(reported_at), disease_name
               ORDER BY date"""
        )
        return [dict(r) for r in rows]


# Most recent 20 alerts with farmer names
@router.get("/alerts")
async def recent_alerts():
    async with use_db() as db:
        rows = await db.execute_fetchall(
            """SELECT a.*, f.name as farmer_name
               FROM alerts a
               LEFT JOIN farmers f ON a.farmer_id = f.id
               ORDER BY a.sent_at DESC LIMIT 20"""
        )
        return [dict(r) for r in rows]
