"""
FarmAgent Harper Memory — Personal AI Agent Memory Layer.
Built on HarperDB for the Harper AI track at YHack.

This is what makes FarmAgent a TRUE personal AI agent:
- Remembers every farmer across conversations
- Builds a knowledge graph of their farm, preferences, and history
- Learns patterns and provides increasingly personalized advice
- Data stays LOCAL — never leaves the farmer's device
- Can sync between village hub and farmer phone when connectivity exists (HarperDB replication)
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# HarperDB connection (lazy init)
_harper = None


def _get_harper():
    """Get HarperDB connection, or return None if not available."""
    global _harper
    if _harper is not None:
        return _harper

    try:
        import harperdb
        from backend.config import HARPER_URL, HARPER_USERNAME, HARPER_PASSWORD
        _harper = harperdb.HarperDB(
            url=HARPER_URL,
            username=HARPER_USERNAME,
            password=HARPER_PASSWORD,
        )
        logger.info("Connected to HarperDB.")
        return _harper
    except Exception as e:
        logger.warning(f"HarperDB not available ({e}). Using SQLite fallback for memory.")
        return None


async def init_harper_schema():
    """Initialize HarperDB schema and tables for FarmAgent memory."""
    db = _get_harper()
    if not db:
        return False

    try:
        from backend.config import HARPER_SCHEMA

        # Create schema
        try:
            db.create_schema(HARPER_SCHEMA)
        except Exception:
            pass  # Schema may already exist

        # Table: farmer_memories — stores semantic memories about each farmer
        try:
            db.create_table(HARPER_SCHEMA, "farmer_memories", hash_attribute="id")
        except Exception:
            pass

        # Table: conversation_summaries — LLM-generated conversation digests
        try:
            db.create_table(HARPER_SCHEMA, "conversation_summaries", hash_attribute="id")
        except Exception:
            pass

        # Table: knowledge_graph — relationships the agent learns
        try:
            db.create_table(HARPER_SCHEMA, "knowledge_graph", hash_attribute="id")
        except Exception:
            pass

        # Table: agent_insights — patterns detected across conversations
        try:
            db.create_table(HARPER_SCHEMA, "agent_insights", hash_attribute="id")
        except Exception:
            pass

        logger.info("HarperDB schema initialized.")
        return True
    except Exception as e:
        logger.error(f"Failed to init HarperDB schema: {e}")
        return False


# ==================== MEMORY CRUD ====================

async def store_memory(
    farmer_id: int,
    memory_type: str,  # "fact", "preference", "event", "insight"
    content: str,
    source_conversation_id: int = None,
    confidence: float = 0.8,
) -> dict | None:
    """Store a personal memory about a farmer in HarperDB."""
    db = _get_harper()
    if not db:
        return await _store_memory_sqlite(farmer_id, memory_type, content, source_conversation_id)

    try:
        from backend.config import HARPER_SCHEMA
        record = {
            "farmer_id": farmer_id,
            "memory_type": memory_type,
            "content": content,
            "confidence": confidence,
            "source_conversation_id": source_conversation_id,
            "created_at": datetime.now().isoformat(),
            "last_accessed": datetime.now().isoformat(),
            "access_count": 0,
        }
        result = db.insert(HARPER_SCHEMA, "farmer_memories", [record])
        return record
    except Exception as e:
        logger.error(f"Harper memory store failed: {e}")
        return await _store_memory_sqlite(farmer_id, memory_type, content, source_conversation_id)


async def get_memories(
    farmer_id: int,
    memory_type: str = None,
    limit: int = 20,
) -> list:
    """Retrieve memories for a farmer from HarperDB."""
    db = _get_harper()
    if not db:
        return await _get_memories_sqlite(farmer_id, memory_type, limit)

    try:
        from backend.config import HARPER_SCHEMA
        if memory_type:
            query = f"SELECT * FROM {HARPER_SCHEMA}.farmer_memories WHERE farmer_id = {farmer_id} AND memory_type = '{memory_type}' ORDER BY created_at DESC LIMIT {limit}"
        else:
            query = f"SELECT * FROM {HARPER_SCHEMA}.farmer_memories WHERE farmer_id = {farmer_id} ORDER BY created_at DESC LIMIT {limit}"

        result = db.sql(query)
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.error(f"Harper memory get failed: {e}")
        return await _get_memories_sqlite(farmer_id, memory_type, limit)


async def store_conversation_summary(
    farmer_id: int,
    conversation_id: int,
    summary: str,
    extracted_entities: dict = None,
    topics: list = None,
    sentiment: str = "neutral",
) -> dict | None:
    """Store a conversation summary in HarperDB."""
    db = _get_harper()
    if not db:
        return await _store_summary_sqlite(farmer_id, conversation_id, summary)

    try:
        from backend.config import HARPER_SCHEMA
        record = {
            "farmer_id": farmer_id,
            "conversation_id": conversation_id,
            "summary": summary,
            "extracted_entities": extracted_entities or {},
            "topics": topics or [],
            "sentiment": sentiment,
            "created_at": datetime.now().isoformat(),
        }
        db.insert(HARPER_SCHEMA, "conversation_summaries", [record])
        return record
    except Exception as e:
        logger.error(f"Harper summary store failed: {e}")
        return await _store_summary_sqlite(farmer_id, conversation_id, summary)


async def add_knowledge(
    farmer_id: int,
    subject: str,
    predicate: str,
    obj: str,
    confidence: float = 0.8,
    source: str = "conversation",
) -> dict | None:
    """Add a knowledge graph triple about a farmer."""
    db = _get_harper()
    if not db:
        return None

    try:
        from backend.config import HARPER_SCHEMA
        record = {
            "farmer_id": farmer_id,
            "subject": subject,
            "predicate": predicate,
            "object": obj,
            "confidence": confidence,
            "source": source,
            "created_at": datetime.now().isoformat(),
        }
        db.insert(HARPER_SCHEMA, "knowledge_graph", [record])
        return record
    except Exception as e:
        logger.error(f"Harper knowledge add failed: {e}")
        return None


async def get_knowledge_graph(farmer_id: int) -> list:
    """Get the knowledge graph for a farmer."""
    db = _get_harper()
    if not db:
        return []

    try:
        from backend.config import HARPER_SCHEMA
        result = db.sql(
            f"SELECT * FROM {HARPER_SCHEMA}.knowledge_graph WHERE farmer_id = {farmer_id} ORDER BY confidence DESC"
        )
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.error(f"Harper knowledge get failed: {e}")
        return []


async def build_harper_context(farmer_id: int) -> str:
    """Build a rich memory context string from HarperDB for the AI prompt."""
    memories = await get_memories(farmer_id, limit=15)
    knowledge = await get_knowledge_graph(farmer_id)

    parts = []

    if memories:
        facts = [m for m in memories if m.get("memory_type") == "fact"]
        preferences = [m for m in memories if m.get("memory_type") == "preference"]
        events = [m for m in memories if m.get("memory_type") == "event"]

        if facts:
            parts.append("Known Facts:\n" + "\n".join(f"- {m['content']}" for m in facts[:5]))
        if preferences:
            parts.append("Farmer Preferences:\n" + "\n".join(f"- {m['content']}" for m in preferences[:3]))
        if events:
            parts.append("Recent Events:\n" + "\n".join(f"- [{m.get('created_at', '')}] {m['content']}" for m in events[:5]))

    if knowledge:
        triples = [f"- {k['subject']} {k['predicate']} {k['object']}" for k in knowledge[:10]]
        parts.append("Knowledge Graph:\n" + "\n".join(triples))

    return "\n\n".join(parts) if parts else "No personal memories stored yet. This is a new farmer interaction."


# ==================== SQLITE FALLBACKS ====================
# When HarperDB isn't running, fall back to SQLite so the app still works

async def _store_memory_sqlite(farmer_id, memory_type, content, source_conversation_id):
    from backend.database import get_db
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO alerts (farmer_id, alert_type, content, language)
               VALUES (?, ?, ?, ?)""",
            (farmer_id, f"memory_{memory_type}", content, "en"),
        )
        await db.commit()
        return {"farmer_id": farmer_id, "memory_type": memory_type, "content": content}
    finally:
        await db.close()


async def _get_memories_sqlite(farmer_id, memory_type, limit):
    from backend.database import get_db
    db = await get_db()
    try:
        if memory_type:
            rows = await db.execute_fetchall(
                "SELECT * FROM alerts WHERE farmer_id = ? AND alert_type = ? ORDER BY sent_at DESC LIMIT ?",
                (farmer_id, f"memory_{memory_type}", limit),
            )
        else:
            rows = await db.execute_fetchall(
                "SELECT * FROM alerts WHERE farmer_id = ? AND alert_type LIKE 'memory_%' ORDER BY sent_at DESC LIMIT ?",
                (farmer_id, limit),
            )
        return [{"content": dict(r)["content"], "memory_type": dict(r)["alert_type"].replace("memory_", "")} for r in rows]
    finally:
        await db.close()


async def _store_summary_sqlite(farmer_id, conversation_id, summary):
    from backend.database import get_db
    db = await get_db()
    try:
        await db.execute(
            "UPDATE conversations SET summary = ? WHERE id = ?",
            (summary, conversation_id),
        )
        await db.commit()
        return {"farmer_id": farmer_id, "conversation_id": conversation_id, "summary": summary}
    finally:
        await db.close()
