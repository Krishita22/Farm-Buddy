"""
Marketplace — Buy/sell crops, tools, supplies. B2B and B2C.
Farmers can list what they want to sell, browse what others are selling,
and find buyers for their harvest.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.database import get_db

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class ListingCreate(BaseModel):
    farmer_id: int
    listing_type: str  # "sell" or "buy"
    category: str  # "crop", "tool", "supply", "seed", "fertilizer"
    title: str
    description: str = ""
    price: float = None
    currency: str = "INR"
    unit: str = "kg"
    quantity: float = None
    region: str = None
    contact_phone: str = None


@router.get("/listings")
async def get_listings(
    listing_type: str = None,
    category: str = None,
    region: str = None,
    crop: str = None,
    limit: int = 50,
):
    """Browse marketplace listings. Filter by type, category, region, or crop."""
    db = await get_db()
    try:
        query = """SELECT m.*, f.name as farmer_name, f.village, f.district
                   FROM marketplace m
                   LEFT JOIN farmers f ON m.farmer_id = f.id
                   WHERE m.status = 'active'"""
        params = []
        if listing_type:
            query += " AND m.listing_type = ?"
            params.append(listing_type)
        if category:
            query += " AND m.category = ?"
            params.append(category)
        if region:
            query += " AND (m.region = ? OR f.district = ?)"
            params.extend([region, region])
        if crop:
            query += " AND m.title LIKE ?"
            params.append(f"%{crop}%")
        query += " ORDER BY m.created_at DESC LIMIT ?"
        params.append(limit)

        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("/listings")
async def create_listing(listing: ListingCreate):
    """Create a new marketplace listing (sell or buy)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO marketplace (farmer_id, listing_type, category, title, description,
               price, currency, unit, quantity, region, contact_phone)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (listing.farmer_id, listing.listing_type, listing.category,
             listing.title, listing.description, listing.price, listing.currency,
             listing.unit, listing.quantity, listing.region, listing.contact_phone),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "listed"}
    finally:
        await db.close()


@router.get("/price-check/{crop}")
async def price_check(crop: str, region: str = None):
    """Get current market prices for a crop across regions."""
    db = await get_db()
    try:
        query = """SELECT crop_name, region, AVG(price_per_kg) as avg_price,
                   MIN(price_per_kg) as min_price, MAX(price_per_kg) as max_price,
                   currency
                   FROM market_prices WHERE crop_name = ?"""
        params = [crop]
        if region:
            query += " AND region LIKE ?"
            params.append(f"%{region}%")
        query += " AND recorded_at > datetime('now', '-7 days') GROUP BY region"
        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("/nearby-sellers")
async def nearby_sellers(
    crop: str = Query(...),
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(50),
):
    """Find nearby farmers selling a specific crop."""
    db = await get_db()
    try:
        # Approximate degree-to-km conversion
        deg = radius_km / 111
        rows = await db.execute_fetchall(
            """SELECT m.*, f.name as farmer_name, f.village, f.district,
                      f.latitude, f.longitude, f.phone
               FROM marketplace m
               JOIN farmers f ON m.farmer_id = f.id
               WHERE m.status = 'active' AND m.listing_type = 'sell'
               AND m.title LIKE ?
               AND ABS(f.latitude - ?) < ? AND ABS(f.longitude - ?) < ?
               ORDER BY m.created_at DESC""",
            (f"%{crop}%", lat, deg, lng, deg),
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()
