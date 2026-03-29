"""
Services — Real nearby agricultural stores, services, and water sources.
Online: fetches from OpenStreetMap Overpass API (free, no key).
Offline: serves cached results from SQLite.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.database import get_db
from backend.services.nearby_places import fetch_nearby_places, fetch_nearby_water_sources, get_cached_places

router = APIRouter(prefix="/api/services", tags=["services"])

SERVICE_TYPES = [
    "tractor", "harvesting", "irrigation", "repair",
    "labor", "transport", "spraying", "soil_testing",
    "seed_supply", "fertilizer_supply", "farm_supply",
    "market", "veterinary", "hardware",
]


class ServiceCreate(BaseModel):
    provider_name: str
    service_type: str
    description: str = ""
    region: str = None
    district: str = None
    price_range: str = None
    currency: str = "INR"
    contact_phone: str = None
    latitude: float = None
    longitude: float = None


@router.get("")
async def list_services(
    service_type: str = None,
    region: str = None,
    district: str = None,
    limit: int = 50,
):
    """List available services. Filter by type, region, or district."""
    db = await get_db()
    try:
        query = "SELECT * FROM services WHERE available = 1"
        params = []
        if service_type:
            query += " AND service_type = ?"
            params.append(service_type)
        if region:
            query += " AND region = ?"
            params.append(region)
        if district:
            query += " AND district = ?"
            params.append(district)
        query += " ORDER BY rating DESC LIMIT ?"
        params.append(limit)
        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("/nearby")
async def nearby_services(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(25),
):
    """Find REAL nearby agricultural services from OpenStreetMap.
    Online: fetches live from Overpass API and caches.
    Offline: returns cached results."""

    # Try live fetch first
    places = await fetch_nearby_places(lat, lng, radius_m=int(radius_km * 1000))
    if places:
        return {
            "source": "openstreetmap",
            "live": True,
            "count": len(places),
            "places": places,
        }

    # Fallback to cached
    cached = await get_cached_places(lat, lng, radius_km)
    if cached:
        return {
            "source": "cache",
            "live": False,
            "count": len(cached),
            "places": [
                {
                    "name": c["provider_name"],
                    "type": c["service_type"],
                    "latitude": c["latitude"],
                    "longitude": c["longitude"],
                    "distance_km": c.get("distance_km", 0),
                    "phone": c.get("contact_phone", ""),
                    "opening_hours": c.get("price_range", ""),
                    "source": "cache",
                }
                for c in cached
            ],
        }

    return {"source": "none", "live": False, "count": 0, "places": []}


@router.get("/water-sources")
async def water_sources(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(15),
):
    """Find REAL nearby water sources (wells, canals, reservoirs) from OpenStreetMap."""
    sources = await fetch_nearby_water_sources(lat, lng, radius_m=int(radius_km * 1000))
    return {
        "source": "openstreetmap" if sources else "none",
        "count": len(sources),
        "water_sources": sources,
    }


@router.post("")
async def add_service(service: ServiceCreate):
    """Register a new service provider."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO services (provider_name, service_type, description,
               region, district, price_range, currency, contact_phone, latitude, longitude)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (service.provider_name, service.service_type, service.description,
             service.region, service.district, service.price_range, service.currency,
             service.contact_phone, service.latitude, service.longitude),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "registered"}
    finally:
        await db.close()


@router.get("/types")
async def service_types():
    """List all available service types."""
    return SERVICE_TYPES
