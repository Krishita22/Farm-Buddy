"""Real-time data endpoints — live market prices, weather alerts from actual APIs."""
from fastapi import APIRouter, Query
from backend.services.realtime_data import fetch_real_market_prices, fetch_real_disease_alerts, fetch_weather_alerts, get_cached_market_prices

router = APIRouter(prefix="/api/realtime", tags=["realtime"])


@router.get("/prices")
async def live_prices(state: str = None, limit: int = 50):
    """Fetch REAL market prices from Indian government APMC data."""
    # Try live fetch first
    prices = await fetch_real_market_prices(state, limit)
    if prices:
        return {"source": "data.gov.in", "live": True, "count": len(prices), "prices": prices}

    # Fallback to cached
    cached = await get_cached_market_prices(region=state, limit=limit)
    if cached:
        return {"source": "cache", "live": False, "count": len(cached), "prices": cached}

    return {"source": "none", "live": False, "count": 0, "prices": [], "message": "No price data available. Indian mandis may be closed."}


@router.get("/alerts")
async def live_alerts(
    lat: float = Query(22.31),
    lng: float = Query(72.13),
    region: str = "india",
):
    """Fetch REAL weather-based farming alerts from Tomorrow.io."""
    alerts = await fetch_weather_alerts(lat, lng)
    if alerts:
        return {"source": "tomorrow.io", "live": True, "count": len(alerts), "alerts": alerts}
    return {"source": "none", "live": False, "count": 0, "alerts": [], "message": "No alerts — weather looks normal"}
