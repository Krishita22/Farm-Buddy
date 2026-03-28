"""
FarmAgent Whisper STT — Runs FULLY OFFLINE.
Uses OpenAI Whisper locally for speech-to-text with automatic language detection.
No internet. No API calls. Processes audio on device.
"""
import io
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

# Lazy-load the model (heavy import)
_model = None
_model_size = None


def _get_model():
    global _model, _model_size
    from backend.config import WHISPER_MODEL_SIZE

    if _model is None or _model_size != WHISPER_MODEL_SIZE:
        import whisper
        logger.info(f"Loading Whisper model: {WHISPER_MODEL_SIZE}...")
        _model = whisper.load_model(WHISPER_MODEL_SIZE)
        _model_size = WHISPER_MODEL_SIZE
        logger.info("Whisper model loaded successfully.")
    return _model


async def transcribe(audio_bytes: bytes, language_hint: str = None) -> dict:
    """
    Transcribe audio bytes using local Whisper model.

    Returns:
        {
            "text": "transcribed text",
            "language": "detected language code (e.g., 'en', 'sw', 'hi')",
            "language_confidence": 0.95,
            "segments": [...]
        }
    """
    model = _get_model()

    # Write audio to temp file (Whisper needs a file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        # Detect language first
        import whisper
        audio = whisper.load_audio(temp_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        _, probs = model.detect_language(mel)
        detected_lang = max(probs, key=probs.get)
        lang_confidence = probs[detected_lang]

        # Transcribe with detected or hinted language
        use_lang = language_hint if language_hint else detected_lang
        result = model.transcribe(
            temp_path,
            language=use_lang,
            fp16=False,  # CPU-safe
        )

        return {
            "text": result["text"].strip(),
            "language": detected_lang,
            "language_confidence": round(lang_confidence, 3),
            "segments": [
                {"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in result.get("segments", [])
            ],
        }
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return {
            "text": "",
            "language": language_hint or "en",
            "language_confidence": 0.0,
            "error": str(e),
        }
    finally:
        os.unlink(temp_path)


async def detect_language(audio_bytes: bytes) -> dict:
    """Detect the language of audio without full transcription."""
    model = _get_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        import whisper
        audio = whisper.load_audio(temp_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        _, probs = model.detect_language(mel)

        # Top 5 languages
        sorted_langs = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:5]
        return {
            "detected": sorted_langs[0][0],
            "confidence": round(sorted_langs[0][1], 3),
            "top_languages": {k: round(v, 3) for k, v in sorted_langs},
        }
    finally:
        os.unlink(temp_path)
