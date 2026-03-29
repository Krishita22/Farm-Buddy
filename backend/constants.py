"""Shared constants and helpers used across backend routers and services."""
from contextlib import asynccontextmanager
from backend.database import get_db


# -- Region coordinates: single source of truth for all geo lookups --
# Each region maps to (latitude, longitude, display_name)
REGION_COORDS = {
    "india_gujarat":     (22.31,  72.13, "Gujarat"),
    "india_up":          (26.85,  80.91, "Uttar Pradesh"),
    "india_maharashtra": (19.08,  75.71, "Maharashtra"),
    "kenya_machakos":    (-1.52,  37.26, "Machakos"),
    "bangladesh_dhaka":  (23.81,  90.41, "Dhaka Division"),
    "nigeria_oyo":       (7.85,   3.93,  "Oyo State"),
    "senegal_thies":     (14.79, -16.93, "Thi\u00e8s"),
    "spain_andalusia":   (37.39,  -5.99, "Andaluc\u00eda"),
    "brazil_minas":      (-19.92,-43.94, "Minas Gerais"),
    "saudi_riyadh":      (24.71,  46.67, "Riyadh Province"),
}

# Default fallback when region is unknown
DEFAULT_COORDS = (22.31, 72.13, "Gujarat")


def get_coords(region: str):
    """Return (lat, lng, name) for a region code, with fallback."""
    return REGION_COORDS.get(region, DEFAULT_COORDS)


def get_lat_lng(region: str):
    """Return just (lat, lng) for a region code."""
    lat, lng, _ = get_coords(region)
    return lat, lng


# -- DB context manager: eliminates 50+ try/finally/close blocks --
@asynccontextmanager
async def use_db():
    """Async context manager for DB access. Auto-closes on exit.

    Usage:
        async with use_db() as db:
            rows = await db.execute_fetchall(...)
    """
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


# -- Standardized API responses --
def error_response(message: str):
    """Return a consistent error response dict."""
    return {"status": "error", "message": message}


def ok_response(message: str = "ok", **extra):
    """Return a consistent success response dict."""
    return {"status": "ok", "message": message, **extra}
