"""
FarmAgent ElevenLabs TTS — Premium conversational voice quality.
Uses ElevenLabs Multilingual v2 for natural, human-like speech in any language.

When API key is set: Uses ElevenLabs (best quality, sounds human)
When offline/no key: Falls back to Piper (still works, less natural)

ElevenLabs supports: English, Hindi, Gujarati-accented, Swahili, Bengali,
French, Spanish, Portuguese, Arabic, Yoruba and 28+ languages.
"""
import logging
import httpx
from backend.config import ELEVENLABS_API_KEY

logger = logging.getLogger(__name__)

# ElevenLabs voice IDs — multilingual voices that adapt to input language
# These voices automatically detect language and speak with native accent
VOICE_MAP = {
    # Multilingual voices — these adapt to ANY language automatically
    "default": "21m00Tcm4TlvDq8ikWAM",      # Rachel — warm female
    "male": "29vD33N1CtxCmqQRPOHJ",          # Drew — warm male
    "female": "EXAVITQu4vr4xnSDxMaL",        # Bella — friendly female

    # Language-preferred voices (still multilingual, but sound best in these)
    "en": "21m00Tcm4TlvDq8ikWAM",            # Rachel
    "hi": "29vD33N1CtxCmqQRPOHJ",            # Drew (good Hindi accent)
    "gu": "29vD33N1CtxCmqQRPOHJ",            # Drew (Hindi/Gujarati accent)
    "sw": "EXAVITQu4vr4xnSDxMaL",            # Bella
    "bn": "29vD33N1CtxCmqQRPOHJ",            # Drew (South Asian accent)
    "fr": "EXAVITQu4vr4xnSDxMaL",            # Bella
    "es": "EXAVITQu4vr4xnSDxMaL",            # Bella
    "pt": "EXAVITQu4vr4xnSDxMaL",            # Bella
    "yo": "29vD33N1CtxCmqQRPOHJ",            # Drew
    "ar": "29vD33N1CtxCmqQRPOHJ",            # Drew
}

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"


async def synthesize(text: str, language: str = "en", voice_id: str = None) -> bytes | None:
    """
    Generate speech using ElevenLabs Multilingual v2.
    Returns MP3 audio bytes, or None if unavailable (falls back to Piper).
    """
    if not ELEVENLABS_API_KEY:
        return None  # No key — fall back to Piper

    vid = voice_id or VOICE_MAP.get(language, VOICE_MAP["default"])

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{ELEVENLABS_API_URL}/{vid}",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.4,            # More expressive/conversational
                        "use_speaker_boost": True,
                    },
                },
            )

            if response.status_code == 200:
                audio = response.content
                logger.info(f"ElevenLabs TTS: {len(audio)} bytes for {language}")
                return audio
            else:
                logger.warning(f"ElevenLabs error {response.status_code}: {response.text[:200]}")
                return None

    except Exception as e:
        logger.warning(f"ElevenLabs TTS failed: {e}")
        return None


async def list_voices() -> list:
    """List available ElevenLabs voices."""
    if not ELEVENLABS_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": ELEVENLABS_API_KEY},
            )
            if response.status_code == 200:
                voices = response.json().get("voices", [])
                return [
                    {
                        "voice_id": v["voice_id"],
                        "name": v["name"],
                        "labels": v.get("labels", {}),
                        "preview_url": v.get("preview_url"),
                    }
                    for v in voices[:20]
                ]
    except Exception as e:
        logger.warning(f"Failed to list ElevenLabs voices: {e}")

    return []
