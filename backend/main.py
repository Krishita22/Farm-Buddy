"""
FarmAgent — Fully Offline AI Farming Advisor
Built for YHack Hackathon (Harper AI Track)

Runs COMPLETELY offline:
- Ollama for local LLM (no cloud API)
- Whisper for local speech-to-text
- Piper for local text-to-speech with accent matching
- HarperDB for personal AI agent memory
- SQLite for farm data
- Historical weather patterns (no internet weather API)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routers import chat, farmers, dashboard, market, voice, weather, marketplace, services, sync
from backend.services.harper_memory import init_harper_schema
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🌾 FarmAgent starting — OFFLINE MODE")
    await init_db()
    logger.info("✅ SQLite database initialized")

    # Try to initialize HarperDB (non-blocking if not available)
    try:
        await init_harper_schema()
        logger.info("✅ HarperDB memory layer initialized")
    except Exception as e:
        logger.warning(f"⚠️  HarperDB not available ({e}). Using SQLite fallback for memory.")

    logger.info("✅ FarmAgent ready — all services local, zero internet required")
    yield


app = FastAPI(
    title="FarmAgent — Offline AI Farming Advisor",
    description="Personal AI agent for smallholder farmers. Runs fully offline with local LLM, STT, TTS, and memory.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(farmers.router)
app.include_router(dashboard.router)
app.include_router(market.router)
app.include_router(voice.router)
app.include_router(weather.router)
app.include_router(marketplace.router)
app.include_router(services.router)
app.include_router(sync.router)


@app.get("/api/health")
async def health():
    """Health check — also reports which offline services are available."""
    status = {
        "status": "ok",
        "service": "FarmAgent",
        "mode": "OFFLINE",
        "services": {
            "llm": "checking...",
            "stt": "checking...",
            "tts": "checking...",
            "memory": "checking...",
            "weather": "available",
            "database": "available",
        },
    }

    # Check Ollama
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get("http://localhost:11434/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                status["services"]["llm"] = f"ollama ({', '.join(models[:3])})"
            else:
                status["services"]["llm"] = "ollama (running but no models)"
    except Exception:
        status["services"]["llm"] = "unavailable — run: ollama serve"

    # Check Whisper
    try:
        import whisper
        status["services"]["stt"] = "whisper (local)"
    except ImportError:
        status["services"]["stt"] = "unavailable — run: pip install openai-whisper"

    # Check Piper/espeak
    import shutil
    if shutil.which("piper"):
        status["services"]["tts"] = "piper (local)"
    elif shutil.which("espeak"):
        status["services"]["tts"] = "espeak (fallback)"
    else:
        status["services"]["tts"] = "browser fallback only"

    # Check HarperDB
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get("http://localhost:9925")
            status["services"]["memory"] = "harperdb (local)"
    except Exception:
        status["services"]["memory"] = "sqlite fallback"

    return status
