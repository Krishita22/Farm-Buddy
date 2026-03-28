"""
Operational Services — Connect farmers with tractors, repair, labor, irrigation.
Local service directory that works offline.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.database import get_db

router = APIRouter(prefix="/api/services", tags=["services"])

SERVICE_TYPES = [
    "tractor", "harvesting", "irrigation", "repair",
    "labor", "transport", "spraying", "soil_testing",
    "seed_supply", "fertilizer_supply", "veterinary",
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
    service_type: str = None,
    radius_km: float = Query(30),
):
    """Find services near a location."""
    db = await get_db()
    try:
        deg = radius_km / 111
        query = """SELECT * FROM services
                   WHERE available = 1
                   AND latitude IS NOT NULL
                   AND ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?"""
        params = [lat, deg, lng, deg]
        if service_type:
            query += " AND service_type = ?"
            params.append(service_type)
        query += " ORDER BY rating DESC"
        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()


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
