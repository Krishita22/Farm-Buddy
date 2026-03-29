"""
Real-time agricultural data fetcher.
Fetches from actual government APIs and news sources.

Sources:
- India Mandi Prices: data.gov.in (free, real APMC prices updated daily)
- Crop disease news: NewsData.io (free tier)
- Weather alerts: Tomorrow.io (already integrated)

When online: fetches fresh data and caches to SQLite
When offline: serves cached data
"""
import logging
from datetime import datetime
import httpx
from backend.database import get_db

logger = logging.getLogger(__name__)

# India Government Open Data API — free, real mandi prices
INDIA_MANDI_API = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
INDIA_MANDI_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"


async def fetch_real_market_prices(state: str = None, limit: int = 50) -> list:
    """Fetch real Indian mandi/APMC prices from data.gov.in."""
    try:
        params = {
            "api-key": INDIA_MANDI_KEY,
            "format": "json",
            "limit": limit,
        }
        if state:
            params["filters[state]"] = state

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(INDIA_MANDI_API, params=params)
            if resp.status_code != 200:
                return []

            data = resp.json()
            records = data.get("records", [])

            prices = []
            for r in records:
                prices.append({
                    "commodity": r.get("commodity", ""),
                    "variety": r.get("variety", ""),
                    "market": r.get("market", ""),
                    "district": r.get("district", ""),
                    "state": r.get("state", ""),
                    "min_price": r.get("min_price"),
                    "max_price": r.get("max_price"),
                    "modal_price": r.get("modal_price"),
                    "date": r.get("arrival_date", ""),
                    "source": "data.gov.in",
                })

            # Cache to DB
            if prices:
                await _cache_prices(prices)
                logger.info(f"Fetched {len(prices)} real market prices from data.gov.in")

            return prices

    except Exception as e:
        logger.warning(f"Real market prices fetch failed: {e}")
        return []


async def _cache_prices(prices: list):
    """Cache real prices to marketplace table."""
    db = await get_db()
    try:
        for p in prices:
            if p.get("modal_price"):
                await db.execute(
                    """INSERT OR REPLACE INTO market_prices (crop_name, region, price_per_kg, currency, recorded_at, source)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (p["commodity"], f"{p['market']}, {p['state']}",
                     float(p["modal_price"]) / 100,  # Convert from per quintal to per kg
                     "INR", datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                     f"data.gov.in — {p['date']}"),
                )
        await db.commit()
    finally:
        await db.close()


async def fetch_weather_alerts(lat: float, lng: float) -> list:
    """Generate real alerts from Tomorrow.io weather data."""
    from backend.config import TOMORROW_API_KEY
    if not TOMORROW_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.tomorrow.io/v4/weather/forecast",
                params={"location": f"{lat},{lng}", "apikey": TOMORROW_API_KEY, "timesteps": "1d"},
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            daily = data.get("timelines", {}).get("daily", [])
            alerts = []

            for day in daily[:5]:
                v = day["values"]
                date = day["time"][:10]

                # Heavy rain alert
                rain_prob = v.get("precipitationProbabilityAvg", 0)
                if rain_prob > 60:
                    alerts.append({
                        "title": f"Heavy rain expected on {date}",
                        "description": f"Rain probability {rain_prob}%. Do not spray pesticides. Ensure drainage.",
                        "type": "weather",
                        "severity": "high" if rain_prob > 80 else "medium",
                        "date": date,
                        "source": "tomorrow.io",
                    })

                # Extreme heat alert
                temp_max = v.get("temperatureMax", 30)
                if temp_max > 40:
                    alerts.append({
                        "title": f"Extreme heat warning on {date}: {temp_max}°C",
                        "description": f"Water crops early morning. Provide shade for seedlings. Avoid midday field work.",
                        "type": "weather",
                        "severity": "high",
                        "date": date,
                        "source": "tomorrow.io",
                    })

                # Frost alert
                temp_min = v.get("temperatureMin", 15)
                if temp_min < 5:
                    alerts.append({
                        "title": f"Frost risk on {date}: Low of {temp_min}°C",
                        "description": f"Cover sensitive crops. Irrigate before nightfall to release soil heat.",
                        "type": "weather",
                        "severity": "high",
                        "date": date,
                        "source": "tomorrow.io",
                    })

                # High wind alert
                wind = v.get("windSpeedMax", 10)
                if wind > 40:
                    alerts.append({
                        "title": f"High winds on {date}: {wind} km/h",
                        "description": f"Stake tall crops. Avoid spraying. Secure equipment.",
                        "type": "weather",
                        "severity": "medium",
                        "date": date,
                        "source": "tomorrow.io",
                    })

            return alerts
    except Exception as e:
        logger.debug(f"Weather alerts failed: {e}")
        return []


async def fetch_real_disease_alerts(region: str = "india") -> list:
    """Fetch real crop disease/pest news and alerts."""
    try:
        # Use a simple web search for agricultural alerts
        queries = {
            "india": "crop disease pest outbreak India 2026",
            "kenya": "crop disease pest outbreak Kenya 2026",
            "bangladesh": "crop disease pest outbreak Bangladesh 2026",
            "nigeria": "crop disease pest outbreak Nigeria 2026",
        }
        query = queries.get(region, queries["india"])

        # Try gnews.io (free, no key for limited use)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": query,
                    "lang": "en",
                    "max": 10,
                    "apikey": "demo",  # Free demo key
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                articles = data.get("articles", [])
                alerts = []
                for a in articles[:5]:
                    alerts.append({
                        "title": a.get("title", ""),
                        "description": a.get("description", ""),
                        "source": a.get("source", {}).get("name", ""),
                        "url": a.get("url", ""),
                        "published": a.get("publishedAt", ""),
                        "type": "news",
                    })

                if alerts:
                    await _cache_alerts(alerts)
                    logger.info(f"Fetched {len(alerts)} real disease alerts")
                return alerts

    except Exception as e:
        logger.debug(f"Disease alerts fetch failed: {e}")

    return []


async def _cache_alerts(alerts: list):
    """Cache real alerts to DB."""
    db = await get_db()
    try:
        for a in alerts:
            await db.execute(
                "INSERT INTO alerts (farmer_id, alert_type, content, language) VALUES (?, ?, ?, ?)",
                (None, "news", f"{a['title']} — {a['source']}", "en"),
            )
        await db.commit()
    finally:
        await db.close()


async def get_cached_market_prices(crop: str = None, region: str = None, limit: int = 20) -> list:
    """Get cached real market prices from DB."""
    db = await get_db()
    try:
        query = "SELECT * FROM market_prices WHERE source LIKE '%data.gov.in%'"
        params = []
        if crop:
            query += " AND crop_name LIKE ?"
            params.append(f"%{crop}%")
        if region:
            query += " AND region LIKE ?"
            params.append(f"%{region}%")
        query += " ORDER BY recorded_at DESC LIMIT ?"
        params.append(limit)

        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()
