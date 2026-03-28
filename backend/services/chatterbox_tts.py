"""
FarmAgent ChatterboxTTS — FREE Voice Cloning. Offline.
Clones the farmer's actual voice from a 5-second sample.
When they speak, the AI responds in THEIR voice.

This is the mic-drop feature:
1. Farmer records a 5-sec voice sample once
2. Every response after that sounds like THEM
3. Works completely offline — no API, no cost, no internet

Pipeline: ElevenLabs (online, best) → ChatterboxTTS (offline, voice clone) → Piper (fast fallback)
"""
import tempfile
import os
import io
import wave
import logging

logger = logging.getLogger(__name__)

# Lazy load — model is ~2GB, only load when needed
_model = None
_sr = None

VOICE_SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "voice_samples")
os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)


def _get_model():
    global _model, _sr
    if _model is not None:
        return _model, _sr

    try:
        # Patch Perth watermarker for macOS ARM
        import perth
        class DummyWM:
            def apply(self, *args, **kwargs):
                return args[0] if args else None
            def __call__(self, *args, **kwargs):
                return args[0] if args else None
        if perth.PerthImplicitWatermarker is None or not callable(perth.PerthImplicitWatermarker):
            perth.PerthImplicitWatermarker = lambda: DummyWM()

        from chatterbox.tts import ChatterboxTTS
        logger.info("Loading ChatterboxTTS model (first time takes ~60 sec)...")
        _model = ChatterboxTTS.from_pretrained(device="cpu")
        _sr = _model.sr
        logger.info(f"ChatterboxTTS loaded. Sample rate: {_sr}")
        return _model, _sr
    except Exception as e:
        logger.error(f"ChatterboxTTS failed to load: {e}")
        return None, None


def get_voice_sample_path(farmer_id: int) -> str | None:
    """Get the path to a farmer's voice sample if it exists."""
    path = os.path.join(VOICE_SAMPLES_DIR, f"farmer_{farmer_id}.wav")
    return path if os.path.exists(path) else None


async def save_voice_sample(farmer_id: int, audio_bytes: bytes) -> str:
    """Save a farmer's voice sample for cloning."""
    path = os.path.join(VOICE_SAMPLES_DIR, f"farmer_{farmer_id}.wav")
    with open(path, "wb") as f:
        f.write(audio_bytes)
    logger.info(f"Voice sample saved for farmer {farmer_id}: {len(audio_bytes)} bytes")
    return path


async def synthesize(text: str, farmer_id: int = None) -> bytes | None:
    """
    Generate speech that clones the farmer's voice.
    Returns WAV bytes, or None if ChatterboxTTS isn't available.
    """
    model, sr = _get_model()
    if model is None:
        return None

    # Get voice sample
    voice_sample = None
    if farmer_id:
        voice_sample = get_voice_sample_path(farmer_id)

    if not voice_sample:
        # No voice sample — use a default sample or return None
        default_sample = os.path.join(VOICE_SAMPLES_DIR, "default.wav")
        if os.path.exists(default_sample):
            voice_sample = default_sample
        else:
            logger.debug("No voice sample available for ChatterboxTTS")
            return None

    try:
        import torchaudio as ta

        # Generate cloned speech
        wav = model.generate(
            text,
            audio_prompt_path=voice_sample,
            exaggeration=0.5,
            cfg_weight=0.5,
        )

        # Convert to WAV bytes
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            ta.save(f.name, wav, sr)
            temp_path = f.name

        with open(temp_path, "rb") as f:
            audio_bytes = f.read()

        os.unlink(temp_path)
        logger.info(f"ChatterboxTTS generated {len(audio_bytes)} bytes (voice clone for farmer {farmer_id})")
        return audio_bytes

    except Exception as e:
        logger.error(f"ChatterboxTTS synthesis failed: {e}")
        return None


def is_available() -> bool:
    """Check if ChatterboxTTS can be loaded."""
    try:
        from chatterbox.tts import ChatterboxTTS
        return True
    except ImportError:
        return False
