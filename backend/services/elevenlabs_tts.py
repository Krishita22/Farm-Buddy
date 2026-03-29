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
    # Using YOUR ElevenLabs account voices (multilingual v2 adapts to any language)
    "default": "CwhRBWXzGAHq8TQ4Fs17",      # Roger — laid-back, casual
    "male": "CwhRBWXzGAHq8TQ4Fs17",          # Roger
    "female": "EXAVITQu4vr4xnSDxMaL",        # Sarah — mature, reassuring

    # Language-preferred (all multilingual — auto-detect language from text)
    "en": "CwhRBWXzGAHq8TQ4Fs17",            # Roger — casual American
    "hi": "nPczCjzI2devNBz1zQrb",             # Brian — deep, comforting (good for Hindi)
    "gu": "nPczCjzI2devNBz1zQrb",             # Brian — deep, comforting (Hindi/Gujarati)
    "sw": "EXAVITQu4vr4xnSDxMaL",            # Sarah — warm female (Swahili)
    "bn": "JBFqnCBsd6RMkjVDRZzb",            # George — warm storyteller (Bengali)
    "fr": "pFZP5JQG7iQjIQuC4Bku",            # Lily — velvety (French)
    "es": "EXAVITQu4vr4xnSDxMaL",            # Sarah (Spanish)
    "pt": "iP95p4xoKVk53GoZ742B",            # Chris — down-to-earth (Portuguese)
    "yo": "CwhRBWXzGAHq8TQ4Fs17",            # Roger (Yoruba)
    "ar": "JBFqnCBsd6RMkjVDRZzb",            # George (Arabic)
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
