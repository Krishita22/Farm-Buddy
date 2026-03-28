from backend.database import get_db


async def get_prices(crop: str = None, region: str = None):
    """Get market prices, optionally filtered by crop and region."""
    db = await get_db()
    try:
        query = "SELECT * FROM market_prices WHERE 1=1"
        params = []
        if crop:
            query += " AND crop_name = ?"
            params.append(crop)
        if region:
            query += " AND region = ?"
            params.append(region)
        query += " ORDER BY recorded_at DESC LIMIT 20"

        rows = await db.execute_fetchall(query, params)
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def check_price_fairness(crop: str, offered_price: float, region: str = None) -> dict:
    """Check if an offered price is fair compared to market rates."""
    db = await get_db()
    try:
        query = """SELECT AVG(price_per_kg) as avg_price, MIN(price_per_kg) as min_price,
                   MAX(price_per_kg) as max_price, currency
                   FROM market_prices WHERE crop_name = ?"""
        params = [crop]
        if region:
            query += " AND region = ?"
            params.append(region)
        query += " AND recorded_at > datetime('now', '-7 days')"

        rows = await db.execute_fetchall(query, params)
        if not rows or dict(rows[0])["avg_price"] is None:
            return {"status": "no_data", "message": "No recent price data available for this crop."}

        data = dict(rows[0])
        avg = data["avg_price"]
        currency = data["currency"] or "KES"

        if offered_price < avg * 0.8:
            return {
                "status": "underpaid",
                "market_avg": round(avg, 2),
                "offered": offered_price,
                "currency": currency,
                "message": f"You are being underpaid. The market average is {currency} {avg:.1f}/kg. You were offered {currency} {offered_price:.1f}/kg. Ask for at least {currency} {avg * 0.9:.1f}/kg.",
            }
        elif offered_price > avg * 1.1:
            return {
                "status": "good_deal",
                "market_avg": round(avg, 2),
                "offered": offered_price,
                "currency": currency,
                "message": f"This is a good price! Market average is {currency} {avg:.1f}/kg.",
            }
        else:
            return {
                "status": "fair",
                "market_avg": round(avg, 2),
                "offered": offered_price,
                "currency": currency,
                "message": f"This price is fair. Market average is {currency} {avg:.1f}/kg.",
            }
    finally:
        await db.close()
