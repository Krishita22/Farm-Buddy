"""Seed 500 farms across Kenya, India (Gujarat, UP), Bangladesh, and Nigeria."""
import asyncio
import random
import math
from datetime import datetime, timedelta
from database import get_db, init_db

# ===== MULTI-REGION FARM DATA =====
REGIONS = {
    "kenya": {
        "lat": -1.52, "lng": 37.26, "count": 150, "district": "Machakos",
        "languages": ["sw"], "currency": "KES",
        "names": ["Mama Wanjiku", "Baba Ochieng", "Mama Akinyi", "Mzee Kamau", "Mama Njeri",
                   "Baba Mwangi", "Mama Wambui", "Mzee Otieno", "Mama Adhiambo", "Baba Kiprop",
                   "Mama Chebet", "Mzee Mutua", "Mama Nyambura", "Baba Kariuki", "Mama Wairimu"],
        "villages": ["Kithimani", "Matuu", "Masii", "Mwala", "Kangundo", "Tala", "Kathiani",
                      "Machakos Town", "Yatta", "Mbiuni", "Ndalani", "Ikombe"],
        "crops": ["maize", "beans", "tomato", "onion", "cabbage", "mango", "sorghum"],
        "seasons": ["2025_long_rains", "2025_short_rains", "2026_long_rains"],
    },
    "india_gujarat": {
        "lat": 22.31, "lng": 72.13, "count": 120, "district": "Gujarat",
        "languages": ["gu", "hi"], "currency": "INR",
        "names": ["Rameshbhai Patel", "Jayaben Modi", "Mukeshbhai Solanki", "Kantaben Desai",
                   "Ashokbhai Thakor", "Kokilaben Chavda", "Pravinbhai Shah", "Heenaben Parmar",
                   "Nareshbhai Rabari", "Rekhaben Bhatt", "Sureshbhai Gajjar", "Pushpaben Darji",
                   "Hiteshbhai Amin", "Jyotiben Vaghela", "Dineshbhai Makwana"],
        "villages": ["Anand", "Nadiad", "Petlad", "Borsad", "Khambhat", "Sojitra",
                      "Umreth", "Tarapur", "Godhra", "Dabhoi", "Padra", "Vadtal"],
        "crops": ["cotton", "groundnut", "wheat", "bajra", "castor", "cumin", "mustard", "onion", "tomato"],
        "seasons": ["2025_kharif", "2025_rabi", "2026_kharif"],
    },
    "india_up": {
        "lat": 26.85, "lng": 80.91, "count": 80, "district": "Uttar Pradesh",
        "languages": ["hi"], "currency": "INR",
        "names": ["Ramesh Kumar", "Sunita Devi", "Mohan Singh", "Lakshmi Bai", "Rajesh Yadav",
                   "Kamla Devi", "Suresh Verma", "Geeta Sharma", "Dinesh Gupta", "Savitri Devi",
                   "Prakash Mishra", "Anita Kumari", "Vijay Singh", "Meena Devi", "Ashok Tiwari"],
        "villages": ["Lucknow", "Unnao", "Hardoi", "Sitapur", "Bahraich", "Rae Bareli",
                      "Sultanpur", "Pratapgarh", "Jaunpur", "Azamgarh"],
        "crops": ["wheat", "rice", "sugarcane", "potato", "mustard", "maize", "tomato", "onion"],
        "seasons": ["2025_kharif", "2025_rabi", "2026_kharif"],
    },
    "bangladesh": {
        "lat": 23.81, "lng": 90.41, "count": 80, "district": "Dhaka Division",
        "languages": ["bn"], "currency": "BDT",
        "names": ["Rahim Mia", "Fatema Begum", "Abdul Karim", "Hasina Khatun", "Jamal Uddin",
                   "Amina Begum", "Mostafa Ali", "Rahima Khatun", "Kamal Hossain", "Nasima Begum",
                   "Shahidul Islam", "Kulsum Akhter", "Rafiqul Islam", "Jahanara Begum", "Nurul Haque"],
        "villages": ["Dhaka", "Mymensingh", "Tangail", "Faridpur", "Manikganj",
                      "Narsingdi", "Kishoreganj", "Netrokona", "Sherpur", "Jamalpur"],
        "crops": ["rice", "jute", "wheat", "potato", "mustard", "lentil", "onion"],
        "seasons": ["2025_aman", "2025_boro", "2026_aus"],
    },
    "nigeria": {
        "lat": 7.85, "lng": 3.93, "count": 70, "district": "Oyo State",
        "languages": ["yo", "en"], "currency": "NGN",
        "names": ["Adewale Ogundimu", "Folake Adeyemi", "Olumide Oladipo", "Funmilayo Bakare",
                   "Babatunde Ajayi", "Yetunde Ogunleye", "Kehinde Fasola", "Adunni Olawale",
                   "Olatunji Akinyemi", "Mojisola Adebayo", "Gbenga Oyewole", "Sade Adekunle",
                   "Taiwo Oyelaran", "Bukola Ogundele", "Segun Adeniyi"],
        "villages": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Eruwa",
                      "Igbo-Ora", "Saki", "Igboho", "Kishi", "Ibarapa"],
        "crops": ["cassava", "yam", "maize", "cocoa", "plantain", "cowpea", "tomato", "pepper"],
        "seasons": ["2025_early_rains", "2025_late_rains", "2026_early_rains"],
    },
}

SOIL_TYPES = ["clay", "loam", "sandy", "laterite", "black_cotton"]
IRRIGATION_TYPES = ["rainfed", "borehole", "canal", "drip", "sprinkler"]

DISEASES = {
    "fall_armyworm": {"crops": ["maize", "sorghum", "rice"], "severity_weights": [0.3, 0.5, 0.2]},
    "late_blight": {"crops": ["tomato", "potato"], "severity_weights": [0.2, 0.4, 0.4]},
    "bacterial_wilt": {"crops": ["tomato", "potato", "beans"], "severity_weights": [0.2, 0.5, 0.3]},
    "rust": {"crops": ["wheat", "beans"], "severity_weights": [0.4, 0.4, 0.2]},
    "powdery_mildew": {"crops": ["cabbage", "spinach", "onion"], "severity_weights": [0.5, 0.3, 0.2]},
    "aphid_infestation": {"crops": ["cabbage", "beans", "tomato"], "severity_weights": [0.4, 0.4, 0.2]},
}

MARKET_REGIONS = ["Machakos", "Nairobi", "Mombasa", "Kisumu", "Nakuru"]


def random_point_near(lat, lng, radius_deg=0.25):
    angle = random.uniform(0, 2 * math.pi)
    r = random.uniform(0, radius_deg)
    return lat + r * math.cos(angle), lng + r * math.sin(angle)


async def seed():
    await init_db()
    db = await get_db()

    # Check if already seeded
    count = await db.execute_fetchall("SELECT COUNT(*) as c FROM farmers")
    if dict(count[0])["c"] > 0:
        print("Database already seeded. Skipping.")
        await db.close()
        return

    print("Seeding 500 farms across 5 regions...")

    # Create farmers from all regions
    farmers = []
    farmer_idx = 0
    for region_key, region in REGIONS.items():
        for i in range(region["count"]):
            name = random.choice(region["names"]) + f" {farmer_idx}"
            village = random.choice(region["villages"])
            lang = random.choice(region["languages"])
            lat, lng = random_point_near(region["lat"], region["lng"])

            farmer = {
                "name": name,
                "phone": f"+{random.randint(100000000000, 999999999999)}",
                "language": lang,
                "village": village,
                "district": region["district"],
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "farm_size_acres": round(random.uniform(0.5, 10), 1),
                "soil_type": random.choice(SOIL_TYPES),
                "soil_ph": round(random.uniform(5.5, 7.5), 1),
                "irrigation_type": random.choice(IRRIGATION_TYPES),
                "region_key": region_key,
            }
            farmers.append(farmer)
            farmer_idx += 1

            await db.execute(
                """INSERT INTO farmers (name, phone, language, village, district, latitude, longitude,
                   farm_size_acres, soil_type, soil_ph, irrigation_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (farmer["name"], farmer["phone"], farmer["language"], farmer["village"],
                 farmer["district"], farmer["latitude"], farmer["longitude"],
                 farmer["farm_size_acres"], farmer["soil_type"], farmer["soil_ph"],
                 farmer["irrigation_type"]),
            )

    await db.commit()
    print("Created 500 farmers.")

    # Create crops for each farmer using region-specific crops
    for i, farmer in enumerate(farmers):
        farmer_id = i + 1
        region = REGIONS.get(farmer["region_key"], REGIONS["kenya"])
        num_crops = random.randint(1, 3)
        for _ in range(num_crops):
            crop = random.choice(region["crops"])
            season = random.choice(region["seasons"])
            planted = datetime.now() - timedelta(days=random.randint(10, 90))
            status = random.choices(["growing", "harvested", "failed"], weights=[0.7, 0.2, 0.1])[0]

            await db.execute(
                """INSERT INTO crops (farmer_id, crop_name, season, planted_date, status)
                   VALUES (?, ?, ?, ?, ?)""",
                (farmer_id, crop, season, planted.strftime("%Y-%m-%d"), status),
            )

    await db.commit()
    print("Created crops for all farmers.")

    # Create 3 disease outbreak clusters
    now = datetime.now()

    # Outbreak 1: Fall armyworm — 20 farms in northeast cluster
    cluster1_lat, cluster1_lng = REGIONS["kenya"]["lat"] + 0.1, REGIONS["kenya"]["lng"] + 0.1
    for j in range(20):
        farmer_id = random.randint(1, 100)
        lat, lng = random_point_near(cluster1_lat, cluster1_lng, 0.05)
        severity = random.choices(["mild", "moderate", "severe"], weights=[0.2, 0.5, 0.3])[0]
        days_ago = random.randint(1, 12)
        await db.execute(
            """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, reported_at, latitude, longitude, confirmed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (farmer_id, "maize", "fall_armyworm", severity,
             (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
             round(lat, 6), round(lng, 6), 1),
        )

    # Outbreak 2: Late blight on tomatoes — 12 farms in south cluster
    cluster2_lat, cluster2_lng = REGIONS["kenya"]["lat"] - 0.12, REGIONS["kenya"]["lng"] - 0.05
    for j in range(12):
        farmer_id = random.randint(150, 300)
        lat, lng = random_point_near(cluster2_lat, cluster2_lng, 0.04)
        severity = random.choices(["mild", "moderate", "severe"], weights=[0.3, 0.5, 0.2])[0]
        days_ago = random.randint(1, 10)
        await db.execute(
            """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, reported_at, latitude, longitude, confirmed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (farmer_id, "tomato", "late_blight", severity,
             (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
             round(lat, 6), round(lng, 6), 1),
        )

    # Outbreak 3: Bacterial wilt — 6 farms, newly emerging
    cluster3_lat, cluster3_lng = REGIONS["kenya"]["lat"] + 0.05, REGIONS["kenya"]["lng"] - 0.15
    for j in range(6):
        farmer_id = random.randint(300, 450)
        lat, lng = random_point_near(cluster3_lat, cluster3_lng, 0.03)
        severity = random.choices(["mild", "moderate", "severe"], weights=[0.5, 0.4, 0.1])[0]
        days_ago = random.randint(1, 5)
        await db.execute(
            """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, reported_at, latitude, longitude, confirmed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (farmer_id, "tomato", "bacterial_wilt", severity,
             (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
             round(lat, 6), round(lng, 6), 1),
        )

    # Scatter some random individual disease reports
    for _ in range(30):
        farmer_id = random.randint(1, 500)
        disease = random.choice(list(DISEASES.keys()))
        crop = random.choice(DISEASES[disease]["crops"])
        f = farmers[farmer_id - 1]
        severity = random.choices(["mild", "moderate", "severe"], weights=DISEASES[disease]["severity_weights"])[0]
        days_ago = random.randint(1, 25)
        await db.execute(
            """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, reported_at, latitude, longitude)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (farmer_id, crop, disease, severity,
             (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
             f["latitude"], f["longitude"]),
        )

    await db.commit()
    print("Created disease outbreak clusters.")

    # Market prices — multi-region with local currencies
    market_data = {
        "kenya": {"currency": "KES", "markets": ["Machakos", "Nairobi", "Mombasa"],
                  "prices": {"maize": 45, "beans": 120, "tomato": 80, "onion": 60, "cabbage": 30, "mango": 70, "sorghum": 40}},
        "india_gujarat": {"currency": "INR", "markets": ["Ahmedabad APMC", "Rajkot Mandi", "Surat Market"],
                          "prices": {"cotton": 65, "groundnut": 55, "wheat": 25, "bajra": 20, "castor": 60, "cumin": 250, "mustard": 50, "onion": 18, "tomato": 22}},
        "india_up": {"currency": "INR", "markets": ["Lucknow Mandi", "Varanasi APMC", "Agra Market"],
                     "prices": {"wheat": 22, "rice": 32, "sugarcane": 3.5, "potato": 12, "mustard": 48, "maize": 18, "tomato": 20, "onion": 15}},
        "bangladesh": {"currency": "BDT", "markets": ["Dhaka Kawran Bazar", "Mymensingh Market"],
                       "prices": {"rice": 55, "jute": 35, "wheat": 40, "potato": 25, "mustard": 80, "lentil": 95, "onion": 45}},
        "nigeria": {"currency": "NGN", "markets": ["Ibadan Bodija", "Ogbomoso Market"],
                    "prices": {"cassava": 250, "yam": 400, "maize": 350, "cocoa": 2500, "tomato": 500, "pepper": 800, "cowpea": 600}},
    }
    for region_key, mdata in market_data.items():
        for crop, base in mdata["prices"].items():
            for market in mdata["markets"]:
                for days_ago in range(14):
                    price = base * random.uniform(0.8, 1.3)
                    await db.execute(
                        """INSERT INTO market_prices (crop_name, region, price_per_kg, currency, recorded_at, source)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (crop, market, round(price, 2), mdata["currency"],
                         (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
                         f"{market} Board"),
                    )

    await db.commit()
    print("Created market price data.")

    # Sample conversations for demo farmers
    demo_farmers = [1, 2, 3, 4, 5]
    sample_convos = [
        ("My maize leaves have brown spots and they are curling. What is wrong?",
         "This sounds like Northern Leaf Blight, common in clay soils during humid weather. Apply a fungicide containing mancozeb — spray every 7 days for 3 weeks. Remove the worst affected leaves now to slow the spread.",
         "Farmer reported brown spots and curling on maize leaves. Diagnosed as Northern Leaf Blight. Recommended mancozeb fungicide treatment."),
        ("When should I plant my beans this season?",
         "For the long rains season in Machakos, plant your beans in the first two weeks of March when soil moisture is good. Your loam soil drains well so beans will do great. Plant 2-3 seeds per hole, 30cm apart.",
         "Farmer asked about bean planting timing. Advised early March planting for long rains. Noted good soil drainage."),
        ("A trader is offering me 40 shillings per kilo for my tomatoes. Is that fair?",
         "The current market rate in Machakos is around 80 KES per kilo for tomatoes. You are being offered half the market price! Tell the trader you know the going rate and ask for at least 70 KES per kilo.",
         "Farmer was being offered 40 KES/kg for tomatoes when market rate is 80 KES. Advised to negotiate for at least 70 KES."),
    ]

    for farmer_id in demo_farmers:
        for msg, reply, summary in sample_convos[:random.randint(1, 3)]:
            cursor = await db.execute(
                "INSERT INTO conversations (farmer_id, summary, created_at) VALUES (?, ?, ?)",
                (farmer_id, summary, (now - timedelta(days=random.randint(1, 14))).strftime("%Y-%m-%d %H:%M:%S")),
            )
            conv_id = cursor.lastrowid
            await db.execute(
                "INSERT INTO messages (conversation_id, role, content, language) VALUES (?, ?, ?, ?)",
                (conv_id, "farmer", msg, "en"),
            )
            await db.execute(
                "INSERT INTO messages (conversation_id, role, content, language) VALUES (?, ?, ?, ?)",
                (conv_id, "agent", reply, "en"),
            )

    await db.commit()
    print("Created sample conversations.")

    # Alerts
    alert_types = [
        ("weather", "Rain expected Tuesday-Wednesday. Hold off watering until Thursday. Good time to apply fertilizer before the rain."),
        ("price_drop", "Maize prices dropped 15% this week in Nairobi market. Consider storing your harvest if possible and selling next week."),
        ("outbreak", "Fall armyworm outbreak detected in 15 farms near Kithimani. Check your maize crop for small holes in leaves and caterpillars. Apply neem-based pesticide as prevention."),
        ("weekly_tip", "This week: your tomatoes are 6 weeks old — time to stake them and start weekly calcium spray to prevent blossom end rot."),
    ]
    for farmer_id in range(1, 50):
        alert_type, content = random.choice(alert_types)
        days_ago = random.randint(0, 6)
        await db.execute(
            "INSERT INTO alerts (farmer_id, alert_type, content, language, sent_at) VALUES (?, ?, ?, ?, ?)",
            (farmer_id, alert_type, content, "en",
             (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")),
        )

    await db.commit()
    print("Created alerts.")

    # Marketplace listings
    sell_listings = [
        # Gujarat
        {"fid": 151, "type": "sell", "cat": "crop", "title": "Cotton (raw)", "price": 65, "cur": "INR", "unit": "kg", "qty": 500, "region": "Gujarat"},
        {"fid": 155, "type": "sell", "cat": "crop", "title": "Groundnut", "price": 52, "cur": "INR", "unit": "kg", "qty": 200, "region": "Gujarat"},
        {"fid": 160, "type": "sell", "cat": "crop", "title": "Cumin (jeera)", "price": 280, "cur": "INR", "unit": "kg", "qty": 50, "region": "Gujarat"},
        {"fid": 165, "type": "sell", "cat": "seed", "title": "BT Cotton seeds (Bollgard)", "price": 800, "cur": "INR", "unit": "packet", "qty": 10, "region": "Gujarat"},
        # Kenya
        {"fid": 1, "type": "sell", "cat": "crop", "title": "Maize (dry)", "price": 45, "cur": "KES", "unit": "kg", "qty": 300, "region": "Machakos"},
        {"fid": 10, "type": "sell", "cat": "crop", "title": "Tomatoes (fresh)", "price": 80, "cur": "KES", "unit": "kg", "qty": 100, "region": "Machakos"},
        {"fid": 20, "type": "sell", "cat": "crop", "title": "Beans (rosecoco)", "price": 120, "cur": "KES", "unit": "kg", "qty": 150, "region": "Machakos"},
        # UP
        {"fid": 271, "type": "sell", "cat": "crop", "title": "Wheat", "price": 22, "cur": "INR", "unit": "kg", "qty": 1000, "region": "Uttar Pradesh"},
        {"fid": 280, "type": "sell", "cat": "crop", "title": "Rice (Basmati)", "price": 35, "cur": "INR", "unit": "kg", "qty": 500, "region": "Uttar Pradesh"},
        # Bangladesh
        {"fid": 351, "type": "sell", "cat": "crop", "title": "Rice (Aman)", "price": 28, "cur": "BDT", "unit": "kg", "qty": 800, "region": "Dhaka Division"},
        {"fid": 360, "type": "sell", "cat": "crop", "title": "Jute (raw)", "price": 35, "cur": "BDT", "unit": "kg", "qty": 400, "region": "Dhaka Division"},
        # Nigeria
        {"fid": 431, "type": "sell", "cat": "crop", "title": "Cassava (fresh)", "price": 250, "cur": "NGN", "unit": "kg", "qty": 500, "region": "Oyo State"},
        {"fid": 440, "type": "sell", "cat": "crop", "title": "Cocoa beans", "price": 2500, "cur": "NGN", "unit": "kg", "qty": 100, "region": "Oyo State"},
        # Buy requests
        {"fid": 170, "type": "buy", "cat": "supply", "title": "DAP Fertilizer (50kg bag)", "price": 1800, "cur": "INR", "unit": "bag", "qty": 5, "region": "Gujarat"},
        {"fid": 5, "type": "buy", "cat": "tool", "title": "Knapsack sprayer", "price": 2500, "cur": "KES", "unit": "piece", "qty": 1, "region": "Machakos"},
        {"fid": 290, "type": "buy", "cat": "seed", "title": "Potato seed (Shangi variety)", "price": 50, "cur": "INR", "unit": "kg", "qty": 100, "region": "Uttar Pradesh"},
    ]
    for l in sell_listings:
        await db.execute(
            "INSERT INTO marketplace (farmer_id, listing_type, category, title, price, currency, unit, quantity, region, status) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (l["fid"], l["type"], l["cat"], l["title"], l["price"], l["cur"], l["unit"], l["qty"], l["region"], "active"),
        )
    await db.commit()
    print("Created marketplace listings.")

    # Services directory
    services_data = [
        # Gujarat
        {"name": "Patel Tractor Service", "type": "tractor", "desc": "JD 5310 and Mahindra 575 available for hire", "region": "Gujarat", "district": "Anand", "price": "₹800-1200/hour", "cur": "INR", "phone": "+919876543210", "lat": 22.56, "lng": 72.93, "rating": 4.5},
        {"name": "Gujarat Agri Repairs", "type": "repair", "desc": "Pump motor, sprayer, tractor repair", "region": "Gujarat", "district": "Nadiad", "price": "₹200-2000", "cur": "INR", "phone": "+919876543211", "lat": 22.69, "lng": 72.86, "rating": 4.2},
        {"name": "Shree Irrigation Solutions", "type": "irrigation", "desc": "Drip and sprinkler installation, borewell drilling", "region": "Gujarat", "district": "Anand", "price": "₹15000-50000", "cur": "INR", "phone": "+919876543212", "lat": 22.55, "lng": 72.95, "rating": 4.7},
        {"name": "Kisaan Labour Group", "type": "labor", "desc": "Seasonal farm labor, 10-50 workers available", "region": "Gujarat", "district": "Petlad", "price": "₹300-400/day/person", "cur": "INR", "phone": "+919876543213", "lat": 22.47, "lng": 72.80, "rating": 4.0},
        {"name": "Dharti Harvesting", "type": "harvesting", "desc": "Combine harvester for wheat, groundnut thresher", "region": "Gujarat", "district": "Mehsana", "price": "₹2000-3000/acre", "cur": "INR", "phone": "+919876543214", "lat": 23.59, "lng": 72.38, "rating": 4.3},
        {"name": "Krushi Soil Lab", "type": "soil_testing", "desc": "Complete soil analysis report in 3 days", "region": "Gujarat", "district": "Anand", "price": "₹500/sample", "cur": "INR", "phone": "+919876543215", "lat": 22.56, "lng": 72.93, "rating": 4.8},
        # Kenya
        {"name": "Machakos Tractor Hire", "type": "tractor", "desc": "MF 290 for ploughing and harrowing", "region": "Machakos", "district": "Machakos", "price": "KES 3000-5000/acre", "cur": "KES", "phone": "+254712345678", "lat": -1.52, "lng": 37.26, "rating": 4.1},
        {"name": "AgroVet Supplies Machakos", "type": "seed_supply", "desc": "Certified seeds, fertilizers, pesticides", "region": "Machakos", "district": "Machakos", "price": "Various", "cur": "KES", "phone": "+254712345679", "lat": -1.51, "lng": 37.27, "rating": 4.4},
        {"name": "Mwala Water Solutions", "type": "irrigation", "desc": "Borehole drilling and solar pump installation", "region": "Machakos", "district": "Mwala", "price": "KES 50000-200000", "cur": "KES", "phone": "+254712345680", "lat": -1.55, "lng": 37.45, "rating": 4.6},
        # UP
        {"name": "Kisan Tractor Sewa", "type": "tractor", "desc": "Sonalika and Mahindra tractors for hire", "region": "Uttar Pradesh", "district": "Lucknow", "price": "₹600-1000/hour", "cur": "INR", "phone": "+919999888877", "lat": 26.85, "lng": 80.95, "rating": 4.0},
        {"name": "UP Krishi Kendra", "type": "fertilizer_supply", "desc": "DAP, Urea, NPK at government rates", "region": "Uttar Pradesh", "district": "Lucknow", "price": "Government rate", "cur": "INR", "phone": "+919999888878", "lat": 26.84, "lng": 80.93, "rating": 4.3},
        # Bangladesh
        {"name": "Dhaka Farm Machinery", "type": "tractor", "desc": "Power tiller and tractor rental", "region": "Dhaka Division", "district": "Dhaka", "price": "BDT 1500-3000/day", "cur": "BDT", "phone": "+8801712345678", "lat": 23.81, "lng": 90.41, "rating": 3.9},
        {"name": "Krishok Bondhu Labour", "type": "labor", "desc": "Rice transplanting and harvesting crews", "region": "Dhaka Division", "district": "Mymensingh", "price": "BDT 500-700/day", "cur": "BDT", "phone": "+8801712345679", "lat": 24.75, "lng": 90.41, "rating": 4.1},
        # Nigeria
        {"name": "Ibadan Agro Services", "type": "tractor", "desc": "Tractor ploughing and ridging", "region": "Oyo State", "district": "Ibadan", "price": "NGN 15000-25000/acre", "cur": "NGN", "phone": "+2348012345678", "lat": 7.38, "lng": 3.94, "rating": 4.0},
        {"name": "Oyo Spraying Team", "type": "spraying", "desc": "Drone and knapsack spraying for cocoa and maize", "region": "Oyo State", "district": "Ibadan", "price": "NGN 5000-10000/acre", "cur": "NGN", "phone": "+2348012345679", "lat": 7.39, "lng": 3.95, "rating": 4.5},
    ]
    for s in services_data:
        await db.execute(
            """INSERT INTO services (provider_name, service_type, description, region, district,
               price_range, currency, contact_phone, latitude, longitude, rating)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (s["name"], s["type"], s["desc"], s["region"], s["district"],
             s["price"], s["cur"], s["phone"], s["lat"], s["lng"], s["rating"]),
        )
    await db.commit()
    print("Created services directory.")

    print("Seeding complete! 500 farms across 5 regions ready for demo.")
    await db.close()


if __name__ == "__main__":
    asyncio.run(seed())
