"""Farmer CRUD endpoints -- list, detail, memory context, and registration."""

from fastapi import APIRouter
from pydantic import BaseModel
from backend.constants import use_db
from backend.services.memory import build_farmer_context

router = APIRouter(prefix="/api/farmers", tags=["farmers"])


class FarmerCreate(BaseModel):
    name: str
    phone: str | None = None
    language: str = "en"
    village: str | None = None
    district: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    farm_size_acres: float | None = None
    soil_type: str | None = None
    soil_ph: float | None = None
    irrigation_type: str | None = None


# List all farmers with active-crop and recent-issue counts
@router.get("")
async def list_farmers(limit: int = 50, offset: int = 0):
    async with use_db() as db:
        rows = await db.execute_fetchall(
            """SELECT f.*,
                      (SELECT COUNT(*) FROM crops WHERE farmer_id = f.id AND status = 'growing') as active_crops,
                      (SELECT COUNT(*) FROM disease_reports WHERE farmer_id = f.id AND reported_at > datetime('now', '-14 days')) as recent_issues
               FROM farmers f ORDER BY f.name LIMIT ? OFFSET ?""",
            (limit, offset),
        )
        return [dict(r) for r in rows]


# Get full farmer profile with crops and recent conversations
@router.get("/{farmer_id}")
async def get_farmer(farmer_id: int):
    async with use_db() as db:
        farmer = await db.execute_fetchall("SELECT * FROM farmers WHERE id = ?", (farmer_id,))
        if not farmer:
            return {"error": "Farmer not found"}

        f = dict(farmer[0])

        # Get crops
        crops = await db.execute_fetchall(
            "SELECT * FROM crops WHERE farmer_id = ? ORDER BY planted_date DESC", (farmer_id,)
        )
        f["crops"] = [dict(c) for c in crops]

        # Get recent conversations
        convos = await db.execute_fetchall(
            "SELECT * FROM conversations WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 5",
            (farmer_id,),
        )
        f["recent_conversations"] = [dict(c) for c in convos]

        return f


# Return AI-ready memory context for a farmer
@router.get("/{farmer_id}/memory")
async def get_farmer_memory(farmer_id: int):
    context = await build_farmer_context(farmer_id)
    return {"farmer_id": farmer_id, "context": context}


# Register a new farmer
@router.post("")
async def create_farmer(farmer: FarmerCreate):
    async with use_db() as db:
        cursor = await db.execute(
            """INSERT INTO farmers (name, phone, language, village, district, latitude, longitude,
               farm_size_acres, soil_type, soil_ph, irrigation_type)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (farmer.name, farmer.phone, farmer.language, farmer.village, farmer.district,
             farmer.latitude, farmer.longitude, farmer.farm_size_acres,
             farmer.soil_type, farmer.soil_ph, farmer.irrigation_type),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "message": "Farmer created"}
