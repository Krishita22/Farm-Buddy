"""Sync endpoints — Learn when online, work when offline."""
from fastapi import APIRouter
from backend.services.sync_engine import sync_all, get_sync_status, check_connectivity

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/now")
async def sync_now():
    """Trigger an immediate sync with internet data sources."""
    return await sync_all()


@router.get("/status")
async def sync_status():
    """Get connectivity and last sync info."""
    return await get_sync_status()


@router.get("/online")
async def is_online():
    """Quick connectivity check."""
    return {"online": await check_connectivity()}
