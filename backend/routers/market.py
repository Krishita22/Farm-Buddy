from fastapi import APIRouter, Query
from backend.services.market_prices import get_prices, check_price_fairness

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
async def prices(crop: str = None, region: str = None):
    return await get_prices(crop, region)


@router.get("/price-check")
async def price_check(
    crop: str = Query(...),
    price: float = Query(...),
    region: str = None,
):
    return await check_price_fairness(crop, price, region)
