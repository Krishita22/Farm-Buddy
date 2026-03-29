"""Disease outbreak detection and dashboard statistics."""
import math
from backend.constants import use_db


def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def detect_outbreaks(radius_km: float = 15.0, min_reports: int = 3, days: int = 14):
    """Detect disease outbreak clusters across all farms."""
    async with use_db() as db:
        reports = await db.execute_fetchall(
            """SELECT dr.*, f.name as farmer_name, f.village
               FROM disease_reports dr
               JOIN farmers f ON dr.farmer_id = f.id
               WHERE dr.reported_at > datetime('now', ?)
               ORDER BY dr.disease_name, dr.reported_at""",
            (f"-{days} days",),
        )
        reports = [dict(r) for r in reports]

        # Group by disease
        disease_groups = {}
        for r in reports:
            disease_groups.setdefault(r["disease_name"], []).append(r)

        outbreaks = []
        for disease_name, disease_reports in disease_groups.items():
            # Simple clustering: greedy distance-based
            used = set()
            for i, r1 in enumerate(disease_reports):
                if i in used:
                    continue
                cluster = [r1]
                used.add(i)
                for j, r2 in enumerate(disease_reports):
                    if j in used:
                        continue
                    if r1["latitude"] and r2["latitude"]:
                        dist = haversine_km(
                            r1["latitude"], r1["longitude"],
                            r2["latitude"], r2["longitude"],
                        )
                        if dist <= radius_km:
                            cluster.append(r2)
                            used.add(j)

                if len(cluster) >= min_reports:
                    lats = [c["latitude"] for c in cluster if c["latitude"]]
                    lngs = [c["longitude"] for c in cluster if c["longitude"]]
                    severities = {}
                    for c in cluster:
                        severities[c["severity"]] = severities.get(c["severity"], 0) + 1

                    affected_farmers = list(set(c["farmer_id"] for c in cluster))
                    villages = list(set(c["village"] for c in cluster if c.get("village")))

                    outbreaks.append({
                        "disease_name": disease_name,
                        "center_lat": sum(lats) / len(lats) if lats else 0,
                        "center_lng": sum(lngs) / len(lngs) if lngs else 0,
                        "radius_km": radius_km,
                        "farm_count": len(affected_farmers),
                        "report_count": len(cluster),
                        "severity_distribution": severities,
                        "first_reported": min(c["reported_at"] for c in cluster),
                        "last_reported": max(c["reported_at"] for c in cluster),
                        "affected_farmer_ids": affected_farmers,
                        "affected_villages": villages,
                        "crop": cluster[0].get("crop_name", "unknown"),
                    })

        return sorted(outbreaks, key=lambda x: x["report_count"], reverse=True)


async def get_dashboard_stats():
    """Get aggregate statistics for the dashboard."""
    async with use_db() as db:
        total_farms = await db.execute_fetchall("SELECT COUNT(*) as c FROM farmers")
        total_farms = dict(total_farms[0])["c"]

        active_reports = await db.execute_fetchall(
            "SELECT COUNT(*) as c FROM disease_reports WHERE reported_at > datetime('now', '-14 days')"
        )
        active_reports = dict(active_reports[0])["c"]

        alerts_sent = await db.execute_fetchall(
            "SELECT COUNT(*) as c FROM alerts WHERE sent_at > datetime('now', '-7 days')"
        )
        alerts_sent = dict(alerts_sent[0])["c"]

        conversations_today = await db.execute_fetchall(
            "SELECT COUNT(*) as c FROM conversations WHERE date(created_at) = date('now')"
        )
        conversations_today = dict(conversations_today[0])["c"]

        # Disease timeline (last 30 days)
        timeline = await db.execute_fetchall(
            """SELECT date(reported_at) as date, disease_name, COUNT(*) as count
               FROM disease_reports
               WHERE reported_at > datetime('now', '-30 days')
               GROUP BY date(reported_at), disease_name
               ORDER BY date(reported_at)"""
        )
        timeline = [dict(t) for t in timeline]

        # Top diseases
        top_diseases = await db.execute_fetchall(
            """SELECT disease_name, COUNT(*) as count
               FROM disease_reports
               WHERE reported_at > datetime('now', '-30 days')
               GROUP BY disease_name
               ORDER BY count DESC LIMIT 5"""
        )
        top_diseases = [dict(d) for d in top_diseases]

        crops_count = await db.execute_fetchall(
            "SELECT COUNT(*) as c FROM crops WHERE status = 'growing'"
        )
        crops_count = dict(crops_count[0])["c"]

        return {
            "total_farms": total_farms,
            "active_disease_reports": active_reports,
            "alerts_sent_this_week": alerts_sent,
            "crops_count": crops_count,
            "disease_timeline": timeline,
            "top_diseases": top_diseases,
        }
