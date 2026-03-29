"""Farm Buddy — Seeds real regional services data into the DB."""
import asyncio
import json
import os
from database import init_db, get_db

SERVICES_PATH = os.path.join(os.path.dirname(__file__), "data", "regional_services.json")

async def seed():
    await init_db()
    db = await get_db()

    # Check if services already seeded
    count = await db.execute_fetchall("SELECT COUNT(*) as c FROM services")
    if dict(count[0])["c"] > 0:
        print("Services already seeded. Skipping.")
        await db.close()
        return

    # Load regional services
    try:
        with open(SERVICES_PATH) as f:
            all_services = json.load(f)
    except FileNotFoundError:
        print("No regional services file found.")
        await db.close()
        return

    total = 0
    for region_code, services in all_services.items():
        for s in services:
            await db.execute(
                """INSERT INTO services (provider_name, service_type, description, region, district,
                   price_range, currency, contact_phone, latitude, longitude, rating, available)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (s["name"], s["type"], s.get("desc", ""), region_code, s.get("district", ""),
                 s.get("price", ""), "", s.get("phone", ""),
                 s.get("lat"), s.get("lng"), s.get("rating", 0), 1),
            )
            total += 1

    await db.commit()
    await db.close()
    print(f"Seeded {total} real regional services across {len(all_services)} regions.")

if __name__ == "__main__":
    asyncio.run(seed())
