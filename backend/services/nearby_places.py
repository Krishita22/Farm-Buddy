"""
Fetch REAL nearby agricultural services from OpenStreetMap Overpass API.
Free, no API key, works globally. Results cached to SQLite for offline use.

Searches for: farm supply shops, fertilizer stores, agricultural markets,
veterinary services, fuel stations, water sources.
"""
import logging
import httpx
import math
from datetime import datetime
from backend.database import get_db

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tags for agricultural services
PLACE_QUERIES = {
    "farm_supply": '["shop"~"agrarian|farm|garden_centre"]',
    "fertilizer": '["shop"="agrarian"]["name"~"fertili|khad|khet|agro|krishi|urea",i]',
    "market": '["amenity"="marketplace"]',
    "veterinary": '["amenity"="veterinary"]',
    "fuel": '["amenity"="fuel_station"]["name"~".",i]',
    "water": '["man_made"~"water_well|water_tower|reservoir_covered"]',
    "canal": '["waterway"="canal"]',
}


def _haversine_km(lat1, lng1, lat2, lng2):
    """Distance in km between two points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


async def fetch_nearby_places(lat: float, lng: float, radius_m: int = 25000) -> list:
    """Fetch real nearby agricultural places from OpenStreetMap.
    Returns list of places with name, type, lat, lng, distance_km."""

    # Build Overpass query — broad enough to find results in rural areas
    query = f"""
    [out:json][timeout:15];
    (
      node["shop"~"agrarian|farm|garden_centre|hardware|doityourself"](around:{radius_m},{lat},{lng});
      node["amenity"~"marketplace|veterinary|fuel"](around:{radius_m},{lat},{lng});
      node["shop"="general"]["name"~"agri|krishi|kisan|farm|khad|seed|bij|fertili",i](around:{radius_m},{lat},{lng});
      way["shop"~"agrarian|farm|garden_centre|hardware"](around:{radius_m},{lat},{lng});
      way["amenity"="marketplace"](around:{radius_m},{lat},{lng});
    );
    out center tags;
    """

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            if resp.status_code != 200:
                logger.warning(f"Overpass API error: {resp.status_code}")
                return []

            data = resp.json()
            elements = data.get("elements", [])

            places = []
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name", tags.get("shop", tags.get("amenity", "Unknown")))
                if not name or name in ("yes", "no"):
                    continue

                # Get coordinates (node has lat/lon, way has center)
                plat = el.get("lat") or el.get("center", {}).get("lat")
                plng = el.get("lon") or el.get("center", {}).get("lon")
                if not plat or not plng:
                    continue

                # Determine place type
                shop = tags.get("shop", "")
                amenity = tags.get("amenity", "")
                name_lower = name.lower()
                if shop in ("agrarian", "farm", "garden_centre") or any(w in name_lower for w in ("agri", "krishi", "kisan", "farm supply", "khad", "seed", "bij")):
                    place_type = "farm_supply"
                elif amenity == "marketplace":
                    place_type = "market"
                elif amenity == "veterinary":
                    place_type = "veterinary"
                elif shop in ("hardware", "doityourself"):
                    place_type = "hardware"
                elif amenity == "fuel":
                    place_type = "fuel"
                else:
                    place_type = shop or amenity or "other"

                dist = _haversine_km(lat, lng, plat, plng)

                places.append({
                    "name": name,
                    "type": place_type,
                    "latitude": round(plat, 6),
                    "longitude": round(plng, 6),
                    "distance_km": round(dist, 1),
                    "address": tags.get("addr:full", tags.get("addr:street", "")),
                    "phone": tags.get("phone", tags.get("contact:phone", "")),
                    "opening_hours": tags.get("opening_hours", ""),
                    "source": "openstreetmap",
                })

            places.sort(key=lambda p: p["distance_km"])

            # Cache to DB
            if places:
                await _cache_places(places, lat, lng)
                logger.info(f"Found {len(places)} real places near ({lat},{lng}) from OpenStreetMap")

            return places

    except Exception as e:
        logger.warning(f"Overpass API failed: {e}")
        return []


async def fetch_nearby_water_sources(lat: float, lng: float, radius_m: int = 15000) -> list:
    """Fetch real nearby water sources (wells, canals, reservoirs) from OSM."""
    query = f"""
    [out:json][timeout:10];
    (
      node["man_made"~"water_well|water_tower"](around:{radius_m},{lat},{lng});
      way["waterway"="canal"](around:{radius_m},{lat},{lng});
      way["waterway"="irrigation_channel"](around:{radius_m},{lat},{lng});
      node["man_made"="reservoir_covered"](around:{radius_m},{lat},{lng});
    );
    out center tags;
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            if resp.status_code != 200:
                return []

            data = resp.json()
            sources = []
            for el in data.get("elements", []):
                tags = el.get("tags", {})
                plat = el.get("lat") or el.get("center", {}).get("lat")
                plng = el.get("lon") or el.get("center", {}).get("lon")
                if not plat or not plng:
                    continue

                name = tags.get("name", tags.get("man_made", tags.get("waterway", "Water source")))
                wtype = tags.get("waterway") or tags.get("man_made", "water_source")
                dist = _haversine_km(lat, lng, plat, plng)

                sources.append({
                    "name": name.replace("_", " ").title(),
                    "type": wtype,
                    "latitude": round(plat, 6),
                    "longitude": round(plng, 6),
                    "distance_km": round(dist, 1),
                    "source": "openstreetmap",
                })

            sources.sort(key=lambda s: s["distance_km"])
            return sources

    except Exception as e:
        logger.debug(f"Water sources fetch failed: {e}")
        return []


async def _cache_places(places: list, lat: float, lng: float):
    """Cache fetched places to services table for offline use."""
    db = await get_db()
    try:
        for p in places:
            # Check if already cached (by name + type)
            existing = await db.execute_fetchall(
                "SELECT id FROM services WHERE provider_name = ? AND service_type = ?",
                (p["name"], p["type"]),
            )
            if not existing:
                await db.execute(
                    """INSERT INTO services (provider_name, service_type, description, region, district,
                       price_range, currency, contact_phone, latitude, longitude, rating, available)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (p["name"], p["type"],
                     f"Found on OpenStreetMap · {p['distance_km']}km away",
                     p.get("address", ""), "",
                     p.get("opening_hours", ""), "",
                     p.get("phone", ""),
                     p["latitude"], p["longitude"],
                     0, 1),
                )
        await db.commit()
    finally:
        await db.close()


async def get_cached_places(lat: float, lng: float, radius_km: float = 25) -> list:
    """Get cached nearby places from SQLite (works offline)."""
    db = await get_db()
    try:
        deg = radius_km / 111
        rows = await db.execute_fetchall(
            """SELECT * FROM services WHERE latitude IS NOT NULL
               AND ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?
               ORDER BY rating DESC""",
            (lat, deg, lng, deg),
        )
        places = []
        for r in rows:
            d = dict(r)
            d["distance_km"] = round(_haversine_km(lat, lng, d["latitude"], d["longitude"]), 1)
            places.append(d)
        places.sort(key=lambda p: p["distance_km"])
        return places
    finally:
        await db.close()
