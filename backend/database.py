import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "farmagent.db")

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS farmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            language TEXT DEFAULT 'en',
            dialect TEXT,
            village TEXT,
            district TEXT,
            latitude REAL,
            longitude REAL,
            farm_size_acres REAL,
            soil_type TEXT,
            soil_ph REAL,
            irrigation_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER REFERENCES farmers(id),
            crop_name TEXT NOT NULL,
            season TEXT,
            planted_date DATE,
            harvest_date DATE,
            status TEXT DEFAULT 'growing',
            yield_kg REAL,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER REFERENCES farmers(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            summary TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER REFERENCES conversations(id),
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            content_en TEXT,
            language TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS disease_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER REFERENCES farmers(id),
            crop_name TEXT,
            disease_name TEXT NOT NULL,
            severity TEXT DEFAULT 'moderate',
            reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            latitude REAL,
            longitude REAL,
            confirmed BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS market_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop_name TEXT NOT NULL,
            region TEXT NOT NULL,
            price_per_kg REAL NOT NULL,
            currency TEXT DEFAULT 'KES',
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER REFERENCES farmers(id),
            alert_type TEXT NOT NULL,
            content TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            acknowledged BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS marketplace (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER REFERENCES farmers(id),
            listing_type TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            price REAL,
            currency TEXT DEFAULT 'INR',
            unit TEXT DEFAULT 'kg',
            quantity REAL,
            region TEXT,
            status TEXT DEFAULT 'active',
            contact_phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_name TEXT NOT NULL,
            service_type TEXT NOT NULL,
            description TEXT,
            region TEXT,
            district TEXT,
            price_range TEXT,
            currency TEXT DEFAULT 'INR',
            contact_phone TEXT,
            rating REAL DEFAULT 0,
            available BOOLEAN DEFAULT 1,
            latitude REAL,
            longitude REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sync_type TEXT NOT NULL,
            data_type TEXT NOT NULL,
            records_synced INTEGER DEFAULT 0,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT,
            status TEXT DEFAULT 'success'
        );
    """)
    await db.commit()
    await db.close()
