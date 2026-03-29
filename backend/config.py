import os
from dotenv import load_dotenv

load_dotenv()

# ===== LLM — Nous Research (runs locally via Ollama, no internet) =====
# Nous Research open-source models run on Ollama:
#   - nous-hermes2       (13B, best quality, needs 16GB RAM)
#   - nous-hermes2:10.7b-solar-q4_0  (10.7B, good balance)
#   - phi3:mini           (3.8B, fastest, works on 8GB RAM)
# All run LOCALLY. No API key. No cloud. No monthly bill.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
# llama3 = best multilingual (8B, good balance of quality + speed)
# nous-hermes2 = best English reasoning (13B, slow)
# phi3:mini = fastest (3.8B, quick but lower quality)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# ===== STT — Whisper (local, no internet) =====
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")

# ===== TTS — Piper (local, no internet) =====
PIPER_VOICES_DIR = os.getenv("PIPER_VOICES_DIR", os.path.join(os.path.dirname(__file__), "models", "piper_voices"))
PIPER_DEFAULT_VOICE = os.getenv("PIPER_DEFAULT_VOICE", "en_US-lessac-medium")

# ===== Memory — HarperDB (Harper AI track, local) =====
HARPER_URL = os.getenv("HARPER_URL", "http://localhost:9925")
HARPER_USERNAME = os.getenv("HARPER_USERNAME", "HDB_ADMIN")
HARPER_PASSWORD = os.getenv("HARPER_PASSWORD", "password123")
HARPER_SCHEMA = os.getenv("HARPER_SCHEMA", "farm_agent")

# ===== TTS — ElevenLabs (premium, online) + Piper (offline fallback) =====
# ElevenLabs: best voice quality, multilingual v2, conversational
# When key is set: uses ElevenLabs (sounds human)
# When offline/no key: falls back to Piper (still works locally)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# ===== Weather — Tomorrow.io (primary) + Open-Meteo (fallback) + offline =====
TOMORROW_API_KEY = os.getenv("TOMORROW_API_KEY", "")

# ===== Weather — Open-Meteo (free, no key) + offline fallback =====
# Open-Meteo: 100% free, no signup, no API key, 10k req/day
# When offline: falls back to embedded historical climate normals
# Caches last API response for 6 hours to survive short outages
WEATHER_CACHE_HOURS = int(os.getenv("WEATHER_CACHE_HOURS", "6"))

# ===== Database — SQLite (local) =====
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./farmagent.db")

# ===== App =====
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
OFFLINE_MODE = os.getenv("OFFLINE_MODE", "true").lower() == "true"
