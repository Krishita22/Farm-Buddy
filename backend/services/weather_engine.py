"""
FarmAgent Weather Engine — HYBRID: Real API when online, historical fallback when offline.

PRIMARY: Open-Meteo API (100% free, NO API key, NO signup)
  - https://open-meteo.com — open-source weather API
  - 10,000 requests/day free, no authentication
  - Returns real forecast, current conditions, and historical data

FALLBACK: Embedded historical climate normals (when no internet)
  - 30-year monthly averages for Machakos County, Kenya
  - Statistical modeling with gaussian noise for daily variation

The system automatically detects connectivity and switches seamlessly.
Caches the last successful API response so it persists through short outages.
"""
import json
import os
import math
import random
import logging
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

WEATHER_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weather_historical.json")
CROPS_CALENDAR_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "crops_calendar.json")
CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weather_cache.json")

# Open-Meteo API — FREE, no key needed
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_CURRENT_URL = "https://api.open-meteo.com/v1/forecast"


def _load_weather_data():
    try:
        with open(WEATHER_DATA_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def _find_nearest_region(lat: float, lng: float) -> dict:
    """Find the nearest region's weather data based on coordinates."""
    data = _load_weather_data()
    regions = data.get("regions", {})

    # Known region centers — derived from the single source of truth
    from backend.constants import REGION_COORDS
    region_centers = {k: (lat, lng) for k, (lat, lng, _) in REGION_COORDS.items()}

    best = "kenya_machakos"
    best_dist = float("inf")
    for key, (rlat, rlng) in region_centers.items():
        dist = math.sqrt((lat - rlat) ** 2 + (lng - rlng) ** 2)
        if dist < best_dist:
            best_dist = dist
            best = key

    return regions.get(best, {}).get("monthly_normals", {})


def _load_crops_calendar():
    try:
        with open(CROPS_CALENDAR_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def _load_cache():
    try:
        with open(CACHE_PATH) as f:
            data = json.load(f)
            # Cache valid for 6 hours
            cached_at = datetime.fromisoformat(data.get("cached_at", "2000-01-01"))
            if datetime.now() - cached_at < timedelta(hours=6):
                return data
    except (FileNotFoundError, ValueError, json.JSONDecodeError):
        pass
    return None


def _save_cache(data):
    try:
        data["cached_at"] = datetime.now().isoformat()
        data["source"] = "open-meteo"
        with open(CACHE_PATH, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.debug(f"Cache save failed: {e}")


# =============================================================================
# PRIMARY: Tomorrow.io API (best accuracy, needs key)
# =============================================================================

TOMORROW_API_URL = "https://api.tomorrow.io/v4/weather"


async def _fetch_tomorrow_forecast(lat: float, lng: float, days: int) -> list | None:
    """Fetch forecast from Tomorrow.io."""
    from backend.config import TOMORROW_API_KEY
    if not TOMORROW_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{TOMORROW_API_URL}/forecast",
                params={"location": f"{lat},{lng}", "apikey": TOMORROW_API_KEY, "timesteps": "1d"},
            )
            if resp.status_code != 200:
                logger.warning(f"Tomorrow.io error {resp.status_code}: {resp.text[:100]}")
                return None

            data = resp.json()
            daily = data.get("timelines", {}).get("daily", [])

            forecasts = []
            for day in daily[:days]:
                v = day["values"]
                date = datetime.strptime(day["time"][:10], "%Y-%m-%d")

                # Map weather code to condition
                code = v.get("weatherCodeMax", 0)
                condition = _tomorrow_code_to_condition(code)

                forecasts.append({
                    "date": day["time"][:10],
                    "day_name": date.strftime("%A"),
                    "temp_high_c": round(v.get("temperatureMax", 25), 1),
                    "temp_low_c": round(v.get("temperatureMin", 15), 1),
                    "humidity_pct": round(v.get("humidityAvg", 65), 1),
                    "wind_kph": round(v.get("windSpeedMax", 10), 1),
                    "rainfall_mm": round(v.get("precipitationProbabilityAvg", 0) * v.get("rainAccumulationMax", 0) / 100, 1) if v.get("precipitationProbabilityAvg", 0) > 0 else 0,
                    "rainfall_probability": round(v.get("precipitationProbabilityAvg", 0) / 100, 2),
                    "condition": condition,
                    "uv_index": round(v.get("uvIndexMax", 6)),
                    "source": "tomorrow.io",
                })

            if forecasts:
                _save_cache({"forecasts": forecasts, "lat": lat, "lng": lng})
                logger.info(f"Weather from Tomorrow.io for ({lat},{lng}): {len(forecasts)} days")

            return forecasts if forecasts else None

    except Exception as e:
        logger.info(f"Tomorrow.io unavailable ({e})")
        return None


async def _fetch_tomorrow_current(lat: float, lng: float) -> dict | None:
    """Fetch current weather from Tomorrow.io."""
    from backend.config import TOMORROW_API_KEY
    if not TOMORROW_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{TOMORROW_API_URL}/realtime",
                params={"location": f"{lat},{lng}", "apikey": TOMORROW_API_KEY},
            )
            if resp.status_code != 200:
                return None

            v = resp.json().get("data", {}).get("values", {})
            code = v.get("weatherCode", 0)

            return {
                "current_temp_c": round(v.get("temperature", 25), 1),
                "feels_like_c": round(v.get("temperatureApparent", 25), 1),
                "humidity_pct": round(v.get("humidity", 65), 1),
                "wind_kph": round(v.get("windSpeed", 10), 1),
                "rainfall_mm": round(v.get("precipitationIntensity", 0), 1),
                "cloud_cover_pct": round(v.get("cloudCover", 50)),
                "condition": _tomorrow_code_to_condition(code),
                "uv_index": round(v.get("uvIndex", 6)),
                "time": datetime.now().strftime("%H:%M"),
                "source": "tomorrow.io",
            }

    except Exception as e:
        logger.debug(f"Tomorrow.io current failed: {e}")
        return None


def _tomorrow_code_to_condition(code: int) -> str:
    """Convert Tomorrow.io weather code to our condition string."""
    if code in (1000,):
        return "sunny"
    elif code in (1100, 1101):
        return "partly_cloudy"
    elif code in (1102, 1001):
        return "overcast"
    elif code in (2000, 2100):
        return "fog"
    elif code in (4000, 4200):
        return "light_rain"
    elif code in (4001, 4201):
        return "rain"
    elif code in (4202,):
        return "heavy_rain"
    elif code in (5000, 5001, 5100, 5101):
        return "snow"
    elif code in (8000,):
        return "thunderstorm"
    return "partly_cloudy"


# =============================================================================
# SECONDARY: AccuWeather API (free trial, needs key)
# =============================================================================

ACCUWEATHER_API_URL = "https://dataservice.accuweather.com"


async def _accuweather_location_key(lat: float, lng: float) -> str | None:
    """Get AccuWeather location key from lat/lng."""
    from backend.config import ACCUWEATHER_API_KEY
    if not ACCUWEATHER_API_KEY or ACCUWEATHER_API_KEY.startswith("YOUR_"):
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{ACCUWEATHER_API_URL}/locations/v1/cities/geoposition/search",
                params={"apikey": ACCUWEATHER_API_KEY, "q": f"{lat},{lng}"},
            )
            if resp.status_code != 200:
                return None
            return resp.json().get("Key")
    except Exception:
        return None


async def _fetch_accuweather_forecast(lat: float, lng: float, days: int) -> list | None:
    """Fetch forecast from AccuWeather (free trial: 5-day max)."""
    loc_key = await _accuweather_location_key(lat, lng)
    if not loc_key:
        return None

    from backend.config import ACCUWEATHER_API_KEY
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{ACCUWEATHER_API_URL}/forecasts/v1/daily/5day/{loc_key}",
                params={"apikey": ACCUWEATHER_API_KEY, "details": "true", "metric": "true"},
            )
            if resp.status_code != 200:
                logger.warning(f"AccuWeather error {resp.status_code}")
                return None

            data = resp.json()
            daily = data.get("DailyForecasts", [])
            forecasts = []

            for day in daily[:days]:
                date = datetime.strptime(day["Date"][:10], "%Y-%m-%d")
                temp = day.get("Temperature", {})
                day_detail = day.get("Day", {})
                rain = day.get("Day", {}).get("Rain", {}).get("Value", 0) or 0
                rain += day.get("Night", {}).get("Rain", {}).get("Value", 0) or 0
                humidity = day.get("Day", {}).get("RelativeHumidity", {}).get("Average", 65) or 65
                wind = day.get("Day", {}).get("Wind", {}).get("Speed", {}).get("Value", 10) or 10
                icon = day_detail.get("Icon", 1)

                forecasts.append({
                    "date": day["Date"][:10],
                    "day_name": date.strftime("%A"),
                    "temp_high_c": round(temp.get("Maximum", {}).get("Value", 25), 1),
                    "temp_low_c": round(temp.get("Minimum", {}).get("Value", 15), 1),
                    "humidity_pct": round(humidity, 1),
                    "wind_kph": round(wind, 1),
                    "rainfall_mm": round(rain, 1),
                    "rainfall_probability": round((day_detail.get("PrecipitationProbability", 0) or 0) / 100, 2),
                    "condition": _accuweather_icon_to_condition(icon),
                    "uv_index": round(day_detail.get("UVIndex", {}).get("Value", 6) if isinstance(day_detail.get("UVIndex"), dict) else day_detail.get("UVIndex", 6)),
                    "source": "accuweather",
                })

            if forecasts:
                _save_cache({"forecasts": forecasts, "lat": lat, "lng": lng})
                logger.info(f"Weather from AccuWeather for ({lat},{lng}): {len(forecasts)} days")

            return forecasts if forecasts else None

    except Exception as e:
        logger.info(f"AccuWeather unavailable ({e})")
        return None


async def _fetch_accuweather_current(lat: float, lng: float) -> dict | None:
    """Fetch current conditions from AccuWeather."""
    loc_key = await _accuweather_location_key(lat, lng)
    if not loc_key:
        return None

    from backend.config import ACCUWEATHER_API_KEY
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{ACCUWEATHER_API_URL}/currentconditions/v1/{loc_key}",
                params={"apikey": ACCUWEATHER_API_KEY, "details": "true"},
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            if not data:
                return None
            c = data[0]
            temp = c.get("Temperature", {}).get("Metric", {}).get("Value", 25)
            feels = c.get("RealFeelTemperature", {}).get("Metric", {}).get("Value", temp)
            wind = c.get("Wind", {}).get("Speed", {}).get("Metric", {}).get("Value", 10)
            humidity = c.get("RelativeHumidity", 65)
            precip = c.get("PrecipitationSummary", {}).get("Past3Hours", {}).get("Metric", {}).get("Value", 0)
            cloud = c.get("CloudCover", 50)
            icon = c.get("WeatherIcon", 1)
            uv = c.get("UVIndex", 6)

            return {
                "current_temp_c": round(temp, 1),
                "feels_like_c": round(feels, 1),
                "humidity_pct": round(humidity, 1),
                "wind_kph": round(wind, 1),
                "rainfall_mm": round(precip, 1),
                "cloud_cover_pct": round(cloud),
                "condition": _accuweather_icon_to_condition(icon),
                "uv_index": round(uv),
                "time": datetime.now().strftime("%H:%M"),
                "source": "accuweather",
            }

    except Exception as e:
        logger.debug(f"AccuWeather current failed: {e}")
        return None


def _accuweather_icon_to_condition(icon: int) -> str:
    """Convert AccuWeather icon number to our condition string."""
    if icon in (1, 2, 33, 34):
        return "sunny"
    elif icon in (3, 4, 5, 35, 36, 37):
        return "partly_cloudy"
    elif icon in (6, 7, 8, 38):
        return "overcast"
    elif icon in (11,):
        return "fog"
    elif icon in (12, 13, 14, 39, 40):
        return "light_rain"
    elif icon in (18, 26):
        return "rain"
    elif icon in (15, 16, 17, 41, 42):
        return "heavy_rain"
    elif icon in (19, 20, 21, 22, 23, 24, 25, 29, 43, 44):
        return "snow"
    elif icon in (15, 16, 17):
        return "thunderstorm"
    return "partly_cloudy"


# =============================================================================
# TERTIARY: OpenWeather API (free tier, needs key)
# =============================================================================

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5"


async def _fetch_openweather_forecast(lat: float, lng: float, days: int) -> list | None:
    """Fetch forecast from OpenWeather API."""
    from backend.config import OPENWEATHER_API_KEY
    if not OPENWEATHER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{OPENWEATHER_URL}/forecast",
                params={"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY, "units": "metric", "cnt": min(days * 8, 40)},
            )
            if resp.status_code != 200:
                logger.warning(f"OpenWeather error {resp.status_code}")
                return None

            data = resp.json()
            # Group 3-hour forecasts by day
            day_data = {}
            for item in data.get("list", []):
                date = item["dt_txt"][:10]
                if date not in day_data:
                    day_data[date] = {"temps": [], "humidity": [], "wind": [], "rain": 0, "conditions": []}
                d = day_data[date]
                d["temps"].append(item["main"]["temp"])
                d["humidity"].append(item["main"]["humidity"])
                d["wind"].append(item["wind"]["speed"] * 3.6)  # m/s to km/h
                d["rain"] += item.get("rain", {}).get("3h", 0)
                d["conditions"].append(item["weather"][0]["id"])

            forecasts = []
            for date_str, d in list(day_data.items())[:days]:
                date = datetime.strptime(date_str, "%Y-%m-%d")
                main_code = max(set(d["conditions"]), key=d["conditions"].count)
                forecasts.append({
                    "date": date_str,
                    "day_name": date.strftime("%A"),
                    "temp_high_c": round(max(d["temps"]), 1),
                    "temp_low_c": round(min(d["temps"]), 1),
                    "humidity_pct": round(sum(d["humidity"]) / len(d["humidity"]), 1),
                    "wind_kph": round(max(d["wind"]), 1),
                    "rainfall_mm": round(d["rain"], 1),
                    "rainfall_probability": 0.8 if d["rain"] > 1 else 0.3 if d["rain"] > 0 else 0,
                    "condition": _openweather_code_to_condition(main_code),
                    "uv_index": 6,
                    "source": "openweather",
                })

            if forecasts:
                _save_cache({"forecasts": forecasts, "lat": lat, "lng": lng})
                logger.info(f"Weather from OpenWeather for ({lat},{lng}): {len(forecasts)} days")
            return forecasts if forecasts else None

    except Exception as e:
        logger.info(f"OpenWeather unavailable ({e})")
        return None


async def _fetch_openweather_current(lat: float, lng: float) -> dict | None:
    """Fetch current weather from OpenWeather."""
    from backend.config import OPENWEATHER_API_KEY
    if not OPENWEATHER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{OPENWEATHER_URL}/weather",
                params={"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY, "units": "metric"},
            )
            if resp.status_code != 200:
                return None
            d = resp.json()
            return {
                "current_temp_c": round(d["main"]["temp"], 1),
                "feels_like_c": round(d["main"]["feels_like"], 1),
                "humidity_pct": round(d["main"]["humidity"], 1),
                "wind_kph": round(d["wind"]["speed"] * 3.6, 1),
                "rainfall_mm": round(d.get("rain", {}).get("1h", 0), 1),
                "cloud_cover_pct": d.get("clouds", {}).get("all", 50),
                "condition": _openweather_code_to_condition(d["weather"][0]["id"]),
                "uv_index": 6,
                "time": datetime.now().strftime("%H:%M"),
                "source": "openweather",
            }
    except Exception as e:
        logger.debug(f"OpenWeather current failed: {e}")
        return None


def _openweather_code_to_condition(code: int) -> str:
    """Convert OpenWeather condition code to our condition string."""
    if code == 800:
        return "sunny"
    elif code in (801, 802):
        return "partly_cloudy"
    elif code in (803, 804):
        return "overcast"
    elif code in (701, 711, 721, 731, 741):
        return "fog"
    elif code in (300, 301, 310, 500):
        return "light_rain"
    elif code in (501, 502, 311, 312, 313, 321):
        return "rain"
    elif code in (503, 504, 520, 521, 522, 531):
        return "heavy_rain"
    elif code in (200, 201, 202, 210, 211, 212, 221, 230, 231, 232):
        return "thunderstorm"
    elif code in (600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622):
        return "snow"
    return "partly_cloudy"


# =============================================================================
# QUATERNARY: Open-Meteo API (free fallback, no key needed)
# =============================================================================

async def _fetch_open_meteo_forecast(lat: float, lng: float, days: int) -> list | None:
    """Fetch real forecast from Open-Meteo. Returns None if offline."""
    try:
        params = {
            "latitude": lat,
            "longitude": lng,
            "daily": [
                "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "precipitation_probability_max",
                "relative_humidity_2m_max", "wind_speed_10m_max",
                "uv_index_max", "weather_code",
            ],
            "current": [
                "temperature_2m", "relative_humidity_2m",
                "wind_speed_10m", "precipitation", "weather_code",
            ],
            "timezone": "auto",
            "forecast_days": min(days, 16),
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(OPEN_METEO_FORECAST_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        # Parse daily forecast
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        forecasts = []

        for i in range(min(len(dates), days)):
            date = datetime.strptime(dates[i], "%Y-%m-%d")
            wmo_code = daily.get("weather_code", [0])[i] or 0
            condition = _wmo_to_condition(wmo_code)
            rain = daily.get("precipitation_sum", [0])[i] or 0

            forecasts.append({
                "date": dates[i],
                "day_name": date.strftime("%A"),
                "temp_high_c": round(daily["temperature_2m_max"][i] or 25, 1),
                "temp_low_c": round(daily["temperature_2m_min"][i] or 14, 1),
                "humidity_pct": round(daily.get("relative_humidity_2m_max", [65])[i] or 65, 1),
                "wind_kph": round(daily.get("wind_speed_10m_max", [10])[i] or 10, 1),
                "rainfall_mm": round(rain, 1),
                "rainfall_probability": round((daily.get("precipitation_probability_max", [0])[i] or 0) / 100, 2),
                "condition": condition,
                "uv_index": round(daily.get("uv_index_max", [6])[i] or 6),
                "source": "open-meteo",
            })

        # Parse current conditions
        current = data.get("current", {})
        current_data = {
            "current_temp_c": round(current.get("temperature_2m", 25), 1),
            "humidity_pct": round(current.get("relative_humidity_2m", 65), 1),
            "wind_kph": round(current.get("wind_speed_10m", 10), 1),
            "rainfall_mm": round(current.get("precipitation", 0), 1),
            "condition": _wmo_to_condition(current.get("weather_code", 0)),
            "time": datetime.now().strftime("%H:%M"),
            "source": "open-meteo",
        }

        # Cache the result
        _save_cache({"forecasts": forecasts, "current": current_data, "lat": lat, "lng": lng})

        logger.info(f"Weather fetched from Open-Meteo for ({lat}, {lng})")
        return forecasts

    except Exception as e:
        logger.info(f"Open-Meteo unavailable ({e}), using offline fallback")
        return None


async def _fetch_open_meteo_current(lat: float, lng: float) -> dict | None:
    """Fetch current conditions from Open-Meteo."""
    try:
        params = {
            "latitude": lat,
            "longitude": lng,
            "current": [
                "temperature_2m", "relative_humidity_2m",
                "wind_speed_10m", "precipitation", "weather_code",
                "apparent_temperature", "cloud_cover",
            ],
            "timezone": "auto",
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(OPEN_METEO_CURRENT_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        current = data.get("current", {})
        return {
            "current_temp_c": round(current.get("temperature_2m", 25), 1),
            "feels_like_c": round(current.get("apparent_temperature", 25), 1),
            "humidity_pct": round(current.get("relative_humidity_2m", 65), 1),
            "wind_kph": round(current.get("wind_speed_10m", 10), 1),
            "rainfall_mm": round(current.get("precipitation", 0), 1),
            "cloud_cover_pct": round(current.get("cloud_cover", 50)),
            "condition": _wmo_to_condition(current.get("weather_code", 0)),
            "time": datetime.now().strftime("%H:%M"),
            "source": "open-meteo",
        }
    except Exception as e:
        logger.debug(f"Open-Meteo current unavailable: {e}")
        return None


def _wmo_to_condition(code: int) -> str:
    """Convert WMO weather code to our condition string."""
    if code == 0:
        return "sunny"
    elif code in (1, 2):
        return "partly_cloudy"
    elif code == 3:
        return "overcast"
    elif code in (45, 48):
        return "fog"
    elif code in (51, 53, 56):
        return "light_rain"
    elif code in (55, 57, 61, 63, 66):
        return "rain"
    elif code in (65, 67, 80, 81, 82):
        return "heavy_rain"
    elif code in (71, 73, 75, 77, 85, 86):
        return "snow"
    elif code in (95, 96, 99):
        return "thunderstorm"
    return "partly_cloudy"


# =============================================================================
# FALLBACK: Historical pattern-based forecasts (offline)
# =============================================================================

def _get_offline_forecast(lat: float, lng: float, days: int) -> list:
    """Generate forecast from historical patterns when offline."""
    # Check cache first
    cache = _load_cache()
    if cache and cache.get("forecasts"):
        cached = cache["forecasts"]
        if len(cached) >= days:
            logger.info("Using cached weather data")
            for f in cached:
                f["source"] = "cache"
            return cached[:days]

    # Generate from historical normals for nearest region
    monthly = _find_nearest_region(lat, lng)
    today = datetime.now()
    forecasts = []

    for i in range(days):
        date = today + timedelta(days=i)
        month = date.strftime("%B").lower()
        month_data = monthly.get(month, {})

        if not month_data:
            month_data = {
                "avg_temp_high_c": 25, "avg_temp_low_c": 14,
                "avg_rainfall_mm": 50, "rainfall_probability": 0.4,
                "avg_humidity_pct": 65, "avg_wind_kph": 12,
            }

        temp_high = month_data["avg_temp_high_c"] + random.gauss(0, 2)
        temp_low = month_data["avg_temp_low_c"] + random.gauss(0, 1.5)
        humidity = max(20, min(100, month_data["avg_humidity_pct"] + random.gauss(0, 8)))
        wind = max(0, month_data["avg_wind_kph"] + random.gauss(0, 4))

        rain_prob = month_data["rainfall_probability"]
        if i > 0 and forecasts[-1].get("rainfall_mm", 0) > 5:
            rain_prob = min(0.9, rain_prob + 0.2)

        will_rain = random.random() < rain_prob
        rainfall = max(0, random.gauss(month_data["avg_rainfall_mm"] / 15, 5)) if will_rain else 0

        if rainfall > 15:
            condition = "heavy_rain"
        elif rainfall > 5:
            condition = "rain"
        elif rainfall > 0:
            condition = "light_rain"
        elif humidity > 80:
            condition = "overcast"
        elif humidity > 60:
            condition = "partly_cloudy"
        else:
            condition = "sunny"

        forecasts.append({
            "date": date.strftime("%Y-%m-%d"),
            "day_name": date.strftime("%A"),
            "temp_high_c": round(temp_high, 1),
            "temp_low_c": round(temp_low, 1),
            "humidity_pct": round(humidity, 1),
            "wind_kph": round(wind, 1),
            "rainfall_mm": round(rainfall, 1),
            "rainfall_probability": round(rain_prob, 2),
            "condition": condition,
            "uv_index": random.randint(5, 11) if condition == "sunny" else random.randint(2, 6),
            "source": "offline-historical",
        })

    return forecasts


def _get_offline_current(lat: float, lng: float) -> dict:
    """Get current conditions from historical data when offline."""
    cache = _load_cache()
    if cache and cache.get("current"):
        result = cache["current"]
        result["source"] = "cache"
        return result

    forecast = _get_offline_forecast(lat, lng, days=1)
    current = forecast[0] if forecast else {}

    hour = datetime.now().hour
    if current:
        temp_range = current["temp_high_c"] - current["temp_low_c"]
        temp_factor = math.sin((hour - 5) * math.pi / 18) if 5 <= hour <= 23 else 0
        current["current_temp_c"] = round(current["temp_low_c"] + temp_range * max(0, temp_factor), 1)
        current["time"] = datetime.now().strftime("%H:%M")
        current["source"] = "offline-historical"

    return current


# =============================================================================
# PUBLIC API — Auto-switches between online and offline
# =============================================================================

async def get_forecast(lat: float = -1.52, lng: float = 37.26, days: int = 7) -> list:
    """
    Get weather forecast. Tries Tomorrow.io → AccuWeather → Open-Meteo → offline.
    """
    # Tier 1: Tomorrow.io (best accuracy)
    result = await _fetch_tomorrow_forecast(lat, lng, days)
    if result:
        return result

    # Tier 2: AccuWeather (free trial)
    result = await _fetch_accuweather_forecast(lat, lng, days)
    if result:
        return result

    # Tier 3: OpenWeather (free tier)
    result = await _fetch_openweather_forecast(lat, lng, days)
    if result:
        return result

    # Tier 4: Open-Meteo (free, no key)
    result = await _fetch_open_meteo_forecast(lat, lng, days)
    if result:
        return result

    # Tier 5: Offline historical
    return _get_offline_forecast(lat, lng, days)


async def get_current_conditions(lat: float = -1.52, lng: float = 37.26) -> dict:
    """Get current weather. Tries Tomorrow.io → AccuWeather → OpenWeather → Open-Meteo → offline."""
    # Tier 1: Tomorrow.io
    result = await _fetch_tomorrow_current(lat, lng)
    if result:
        return result

    # Tier 2: AccuWeather
    result = await _fetch_accuweather_current(lat, lng)
    if result:
        return result

    # Tier 3: OpenWeather
    result = await _fetch_openweather_current(lat, lng)
    if result:
        return result

    # Tier 4: Open-Meteo
    result = await _fetch_open_meteo_current(lat, lng)
    if result:
        return result

    # Tier 5: Offline
    return _get_offline_current(lat, lng)


def get_planting_advisory(crop: str, lat: float = -1.52, lng: float = 37.26) -> dict:
    """Get planting advice based on weather and crop calendar."""
    calendar = _load_crops_calendar()
    # Use offline forecast for advisory (synchronous, always available)
    forecast = _get_offline_forecast(lat, lng, days=7)

    today = datetime.now()
    month = today.strftime("%B").lower()
    crop_info = calendar.get(crop, {})

    planting_months = crop_info.get("planting_months", [])
    is_planting_season = month in planting_months

    total_rain_7d = sum(f["rainfall_mm"] for f in forecast)
    avg_temp = sum(f["temp_high_c"] for f in forecast) / len(forecast) if forecast else 25

    advisories = []
    risk_level = "low"

    if is_planting_season:
        advisories.append(f"Good news! {month.title()} is a suitable planting month for {crop}.")
        if total_rain_7d > 30:
            advisories.append("Sufficient rainfall expected this week — good conditions for planting.")
        elif total_rain_7d < 10:
            advisories.append("Low rainfall expected. If you plant now, ensure irrigation is available.")
            risk_level = "medium"
    else:
        advisories.append(f"Warning: {month.title()} is not the ideal planting season for {crop}.")
        advisories.append(f"Recommended planting months: {', '.join(m.title() for m in planting_months)}.")
        risk_level = "high"

    min_temp = crop_info.get("min_temp_c", 10)
    max_temp = crop_info.get("max_temp_c", 35)
    if avg_temp < min_temp:
        advisories.append(f"Temperature is below optimal for {crop} (current: {avg_temp:.0f}°C, needs: {min_temp}°C+).")
        risk_level = "high"
    elif avg_temp > max_temp:
        advisories.append(f"Temperature is above optimal for {crop} (current: {avg_temp:.0f}°C, max: {max_temp}°C).")
        risk_level = "medium"

    return {
        "crop": crop,
        "is_planting_season": is_planting_season,
        "risk_level": risk_level,
        "advisories": advisories,
        "rainfall_7d_mm": round(total_rain_7d, 1),
        "avg_temp_7d": round(avg_temp, 1),
        "optimal_planting_months": planting_months,
        "crop_info": {
            "days_to_harvest": crop_info.get("days_to_harvest", "unknown"),
            "water_needs": crop_info.get("water_needs", "moderate"),
            "soil_preference": crop_info.get("soil_preference", "loam"),
        },
    }


async def get_weather_context_for_ai(lat: float = -1.52, lng: float = 37.26) -> str:
    """Build a weather context string for the AI system prompt."""
    current = await get_current_conditions(lat, lng)
    forecast = await get_forecast(lat, lng, days=5)
    source = forecast[0].get("source", "unknown") if forecast else "unknown"

    lines = []
    if current:
        lines.append(
            f"Current: {current.get('current_temp_c', 'N/A')}°C, "
            f"{current.get('condition', 'unknown').replace('_', ' ')}, "
            f"humidity {current.get('humidity_pct', 'N/A')}%"
        )

    for f in forecast[:5]:
        lines.append(
            f"{f['day_name']}: {f['temp_low_c']}-{f['temp_high_c']}°C, "
            f"{f['condition'].replace('_', ' ')}, "
            f"rain {f['rainfall_mm']}mm ({int(f['rainfall_probability']*100)}% chance)"
        )

    header = f"Local Weather Forecast (source: {source}):"
    return header + "\n" + "\n".join(lines) if lines else "Weather data unavailable."


def predict_yield(crop: str, lat: float = -1.52, lng: float = 37.26, soil_type: str = "loam", farm_acres: float = 2.0) -> dict:
    """
    Predict crop yield based on weather patterns, soil, and historical data.
    Uses a simple agronomic model: yield = base_yield * weather_factor * soil_factor
    """
    calendar = _load_crops_calendar()
    monthly = _find_nearest_region(lat, lng)
    crop_info = calendar.get(crop, {})

    if not crop_info:
        return {"crop": crop, "error": "Unknown crop"}

    # Base yield estimates (kg per acre) for optimal conditions
    base_yields = {
        "maize": 1200, "wheat": 1000, "rice": 1500, "beans": 400,
        "tomato": 8000, "onion": 6000, "potato": 5000, "cabbage": 7000,
        "cotton": 500, "groundnut": 600, "bajra": 400, "sorghum": 500,
        "sugarcane": 25000, "cumin": 150, "mustard": 350, "jute": 800,
        "cassava": 4000, "yam": 3000, "cocoa": 300, "cowpea": 300,
        "spinach": 3000, "mango": 2000, "plantain": 5000, "pepper": 2000,
        "lentil": 300,
    }
    base_yield = base_yields.get(crop, 800)

    # Weather factor: check if current season has good conditions
    today = datetime.now()
    current_month = today.strftime("%B").lower()
    month_data = monthly.get(current_month, {})

    rain = month_data.get("avg_rainfall_mm", 50)
    temp_high = month_data.get("avg_temp_high_c", 30)
    min_rain = crop_info.get("rainfall_min_mm", 400) / 6  # Monthly portion
    min_temp = crop_info.get("min_temp_c", 15)
    max_temp = crop_info.get("max_temp_c", 35)

    # Rain factor
    if rain >= min_rain:
        rain_factor = min(1.0, rain / (min_rain * 1.5))
    else:
        rain_factor = rain / min_rain * 0.7  # Deficit hurts

    # Temperature factor
    if min_temp <= temp_high <= max_temp:
        temp_factor = 1.0
    elif temp_high > max_temp:
        temp_factor = max(0.5, 1.0 - (temp_high - max_temp) * 0.05)
    else:
        temp_factor = max(0.4, 1.0 - (min_temp - temp_high) * 0.08)

    # Soil factor
    soil_factors = {
        "loam": 1.0, "clay_loam": 0.95, "sandy_loam": 0.9,
        "clay": 0.85, "sandy": 0.75, "laterite": 0.7, "black_cotton": 0.95,
    }
    soil_factor = soil_factors.get(soil_type, 0.85)

    # Calculate
    weather_factor = (rain_factor * 0.5 + temp_factor * 0.5)
    total_factor = weather_factor * soil_factor
    predicted_yield = base_yield * total_factor * farm_acres

    # Risk assessment
    if total_factor >= 0.85:
        risk = "low"
        outlook = "excellent"
    elif total_factor >= 0.65:
        risk = "medium"
        outlook = "good"
    elif total_factor >= 0.45:
        risk = "high"
        outlook = "fair"
    else:
        risk = "critical"
        outlook = "poor"

    return {
        "crop": crop,
        "farm_acres": farm_acres,
        "predicted_yield_kg": round(predicted_yield),
        "yield_per_acre_kg": round(base_yield * total_factor),
        "base_yield_per_acre": base_yield,
        "weather_factor": round(weather_factor, 2),
        "soil_factor": round(soil_factor, 2),
        "total_factor": round(total_factor, 2),
        "risk_level": risk,
        "outlook": outlook,
        "conditions": {
            "rainfall_adequate": rain >= min_rain,
            "temperature_optimal": min_temp <= temp_high <= max_temp,
            "soil_suitable": soil_factor >= 0.85,
        },
    }


def get_seasonal_trends(lat: float = -1.52, lng: float = 37.26) -> list:
    """Get month-by-month weather trends for seasonal planning."""
    monthly = _find_nearest_region(lat, lng)
    trends = []

    month_order = ["january", "february", "march", "april", "may", "june",
                   "july", "august", "september", "october", "november", "december"]

    for month in month_order:
        data = monthly.get(month, {})
        if data:
            trends.append({
                "month": month.title(),
                "temp_high": data.get("avg_temp_high_c"),
                "temp_low": data.get("avg_temp_low_c"),
                "rainfall_mm": data.get("avg_rainfall_mm"),
                "humidity": data.get("avg_humidity_pct"),
                "farming_note": data.get("farming_note", ""),
            })

    return trends
