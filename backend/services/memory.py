"""Farmer context building and conversation memory helpers."""
from backend.constants import use_db


async def build_farmer_context(farmer_id: int) -> str:
    """Build a rich context string about a farmer for the AI."""
    async with use_db() as db:
        # Get farmer profile
        farmer = await db.execute_fetchall(
            "SELECT * FROM farmers WHERE id = ?", (farmer_id,)
        )
        if not farmer:
            return "New farmer, no profile yet."

        f = dict(farmer[0])
        context_parts = []

        # Basic profile
        context_parts.append(
            f"Name: {f['name']}, Village: {f['village']}, District: {f['district']}\n"
            f"Farm size: {f['farm_size_acres']} acres, Soil: {f['soil_type']} (pH {f['soil_ph']})\n"
            f"Irrigation: {f['irrigation_type']}, Language: {f['language']}"
        )

        # Current crops
        crops = await db.execute_fetchall(
            "SELECT * FROM crops WHERE farmer_id = ? ORDER BY planted_date DESC LIMIT 5",
            (farmer_id,),
        )
        if crops:
            crop_lines = []
            for c in crops:
                c = dict(c)
                crop_lines.append(
                    f"- {c['crop_name']} ({c['status']}), planted {c['planted_date']}, season {c['season']}"
                )
            context_parts.append("Current/Recent Crops:\n" + "\n".join(crop_lines))

        # Recent disease reports from their farm
        diseases = await db.execute_fetchall(
            "SELECT * FROM disease_reports WHERE farmer_id = ? ORDER BY reported_at DESC LIMIT 3",
            (farmer_id,),
        )
        if diseases:
            disease_lines = []
            for d in diseases:
                d = dict(d)
                disease_lines.append(
                    f"- {d['disease_name']} on {d['crop_name']} ({d['severity']}) - {d['reported_at']}"
                )
            context_parts.append("Recent Disease Reports:\n" + "\n".join(disease_lines))

        # Nearby disease reports (within ~0.1 degree ≈ 10km)
        if f["latitude"] and f["longitude"]:
            nearby = await db.execute_fetchall(
                """SELECT disease_name, crop_name, COUNT(*) as count, severity
                   FROM disease_reports
                   WHERE ABS(latitude - ?) < 0.1 AND ABS(longitude - ?) < 0.1
                   AND farmer_id != ?
                   AND reported_at > datetime('now', '-14 days')
                   GROUP BY disease_name, crop_name
                   ORDER BY count DESC LIMIT 5""",
                (f["latitude"], f["longitude"], farmer_id),
            )
            if nearby:
                nearby_lines = []
                for n in nearby:
                    n = dict(n)
                    nearby_lines.append(
                        f"- {n['disease_name']} on {n['crop_name']}: {n['count']} nearby farms affected"
                    )
                context_parts.append("Nearby Outbreaks:\n" + "\n".join(nearby_lines))

        # Past conversation summaries (memory)
        convos = await db.execute_fetchall(
            "SELECT summary, created_at FROM conversations WHERE farmer_id = ? AND summary IS NOT NULL ORDER BY created_at DESC LIMIT 5",
            (farmer_id,),
        )
        if convos:
            memory_lines = []
            for c in convos:
                c = dict(c)
                memory_lines.append(f"- [{c['created_at']}] {c['summary']}")
            context_parts.append("Past Conversations:\n" + "\n".join(memory_lines))

        # Market prices for their crops
        if crops:
            crop_names = [dict(c)["crop_name"] for c in crops]
            placeholders = ",".join("?" * len(crop_names))
            prices = await db.execute_fetchall(
                f"""SELECT crop_name, price_per_kg, currency, recorded_at
                    FROM market_prices
                    WHERE crop_name IN ({placeholders})
                    ORDER BY recorded_at DESC LIMIT 5""",
                crop_names,
            )
            if prices:
                price_lines = []
                for p in prices:
                    p = dict(p)
                    price_lines.append(
                        f"- {p['crop_name']}: {p['currency']} {p['price_per_kg']}/kg ({p['recorded_at']})"
                    )
                context_parts.append("Market Prices:\n" + "\n".join(price_lines))

        return "\n\n".join(context_parts)


async def get_conversation_history(conversation_id: int) -> list:
    """Get message history for a conversation."""
    async with use_db() as db:
        messages = await db.execute_fetchall(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        return [dict(m) for m in messages]


async def store_message(conversation_id: int, role: str, content: str, language: str = "en"):
    """Store a message in a conversation."""
    async with use_db() as db:
        await db.execute(
            "INSERT INTO messages (conversation_id, role, content, language) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, language),
        )
        await db.commit()


async def get_or_create_conversation(farmer_id: int) -> int:
    """Get the most recent open conversation or create a new one."""
    async with use_db() as db:
        # Get the most recent conversation from today
        row = await db.execute_fetchall(
            """SELECT id FROM conversations
               WHERE farmer_id = ? AND date(created_at) = date('now')
               ORDER BY created_at DESC LIMIT 1""",
            (farmer_id,),
        )
        if row:
            return dict(row[0])["id"]

        # Create new conversation
        cursor = await db.execute(
            "INSERT INTO conversations (farmer_id) VALUES (?)", (farmer_id,)
        )
        await db.commit()
        return cursor.lastrowid
