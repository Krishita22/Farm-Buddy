"""Weather endpoints — Real API (Open-Meteo, free) with offline fallback + yield prediction."""
from fastapi import APIRouter, Query
from backend.services.weather_engine import (
    get_forecast, get_current_conditions, get_planting_advisory,
    predict_yield, get_seasonal_trends,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/forecast")
async def forecast(
    lat: float = Query(-1.52),
    lng: float = Query(37.26),
    days: int = Query(7),
):
    """Get weather forecast. Uses Open-Meteo API when online, historical patterns when offline."""
    return await get_forecast(lat, lng, days)


@router.get("/current")
async def current(
    lat: float = Query(-1.52),
    lng: float = Query(37.26),
):
    """Get current conditions. Uses Open-Meteo when online, modeled data when offline."""
    return await get_current_conditions(lat, lng)


@router.get("/planting-advisory")
async def planting_advisory(
    crop: str = Query(...),
    lat: float = Query(-1.52),
    lng: float = Query(37.26),
):
    """Get planting advice based on weather + crop calendar."""
    return get_planting_advisory(crop, lat, lng)


@router.get("/yield-prediction")
async def yield_prediction(
    crop: str = Query(...),
    lat: float = Query(-1.52),
    lng: float = Query(37.26),
    soil_type: str = Query("loam"),
    farm_acres: float = Query(2.0),
):
    """Predict crop yield based on weather, soil, and farm size."""
    return predict_yield(crop, lat, lng, soil_type, farm_acres)


@router.get("/seasonal-trends")
async def seasonal_trends(
    lat: float = Query(-1.52),
    lng: float = Query(37.26),
):
    """Get 12-month weather trends for seasonal planning."""
    return get_seasonal_trends(lat, lng)
