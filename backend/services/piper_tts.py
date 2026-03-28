"""
FarmAgent Piper TTS — Runs FULLY OFFLINE.
Generates natural speech in the farmer's accent/dialect.
No internet. No cloud TTS. Voices stored locally as ONNX models.
"""
import subprocess
import tempfile
import os
import logging
import json

logger = logging.getLogger(__name__)

ACCENT_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "accent_map.json")


def _load_accent_map():
    try:
        with open(ACCENT_MAP_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def get_voice_for_language(language: str, dialect: str = None) -> dict:
    """Map detected language/dialect to a Piper voice model."""
    accent_map = _load_accent_map()

    # Try exact dialect match first
    if dialect and f"{language}_{dialect}" in accent_map:
        return accent_map[f"{language}_{dialect}"]

    # Try language match
    if language in accent_map:
        return accent_map[language]

    # Fallback to English
    return accent_map.get("en", {
        "voice": "en_US-lessac-medium",
        "description": "English (US)",
    })


async def synthesize(text: str, language: str = "en", dialect: str = None, voice_profile: dict = None) -> bytes | None:
    """
    Generate speech audio from text using local Piper TTS.
    If voice_profile is provided, adjusts pitch and speed to match the farmer's speaking style.

    Returns WAV audio bytes, or None if Piper is not available.
    Falls back to browser SpeechSynthesis on the frontend.
    """
    voice_info = get_voice_for_language(language, dialect)
    voice_name = voice_info.get("voice")

    if not voice_name:
        return None  # No Piper model for this language, frontend uses browser TTS

    # Try piper-tts Python package first
    try:
        audio = await _synthesize_python(text, voice_name)
        # Apply voice profile adjustments (pitch/speed)
        if audio and voice_profile and voice_profile.get("analyzed"):
            audio = _apply_voice_profile(audio, voice_profile)
        return audio
    except Exception as e:
        logger.debug(f"Piper Python failed ({e}), trying CLI...")

    # Try piper CLI
    try:
        return await _synthesize_cli(text, voice_name)
    except Exception as e:
        logger.debug(f"Piper CLI failed ({e}), trying espeak...")

    # Last resort: espeak (available on most Linux/Mac)
    try:
        return await _synthesize_espeak(text, language)
    except Exception as e:
        logger.warning(f"All TTS engines failed: {e}")

    return None


async def _synthesize_python(text: str, voice_name: str) -> bytes:
    """Use piper-tts Python package."""
    import wave
    import io
    from piper import PiperVoice

    voices_dir = os.environ.get(
        "PIPER_VOICES_DIR",
        os.path.join(os.path.dirname(__file__), "..", "models", "piper_voices"),
    )
    model_path = os.path.join(voices_dir, f"{voice_name}.onnx")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Voice model not found: {model_path}")

    voice = PiperVoice.load(model_path)

    buf = io.BytesIO()
    wav_file = wave.open(buf, "wb")
    voice.synthesize_wav(text, wav_file)
    wav_file.close()

    audio = buf.getvalue()
    if len(audio) <= 44:  # WAV header only = no audio
        raise RuntimeError("Piper produced empty audio")
    return audio


async def _synthesize_cli(text: str, voice_name: str) -> bytes:
    """Use piper CLI if installed."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        temp_path = f.name

    try:
        proc = subprocess.run(
            ["piper", "--model", voice_name, "--output_file", temp_path],
            input=text.encode(),
            capture_output=True,
            timeout=10,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Piper CLI error: {proc.stderr.decode()}")

        with open(temp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


async def _synthesize_espeak(text: str, language: str) -> bytes:
    """Fallback to espeak for basic TTS."""
    lang_map = {
        "en": "en", "sw": "sw", "hi": "hi", "bn": "bn",
        "fr": "fr", "yo": "yo", "ar": "ar", "es": "es", "pt": "pt",
    }
    espeak_lang = lang_map.get(language, "en")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        temp_path = f.name

    try:
        proc = subprocess.run(
            ["espeak", "-v", espeak_lang, "-w", temp_path, text],
            capture_output=True,
            timeout=10,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"espeak error: {proc.stderr.decode()}")

        with open(temp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def list_available_voices() -> list:
    """List all downloaded Piper voice models."""
    voices_dir = os.environ.get(
        "PIPER_VOICES_DIR",
        os.path.join(os.path.dirname(__file__), "..", "models", "piper_voices"),
    )

    if not os.path.isdir(voices_dir):
        return []

    voices = []
    for f in os.listdir(voices_dir):
        if f.endswith(".onnx"):
            name = f.replace(".onnx", "")
            accent_map = _load_accent_map()
            # Find matching language
            for lang, info in accent_map.items():
                if info.get("voice") == name:
                    voices.append({"name": name, "language": lang, "description": info.get("description", "")})
                    break
            else:
                voices.append({"name": name, "language": "unknown", "description": ""})

    return voices


def _apply_voice_profile(audio_bytes: bytes, profile: dict) -> bytes:
    """
    Adjust WAV audio to match the farmer's voice profile.
    Modifies playback speed and pitch by resampling.
    """
    import wave
    import io
    import struct

    speed_factor = profile.get("speed_factor", 1.0)
    pitch_factor = profile.get("pitch_factor", 1.0)

    # Only apply if meaningfully different from default
    if abs(speed_factor - 1.0) < 0.05 and abs(pitch_factor - 1.0) < 0.05:
        return audio_bytes

    try:
        buf_in = io.BytesIO(audio_bytes)
        with wave.open(buf_in, 'rb') as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)

        if sample_width != 2:
            return audio_bytes

        # Pitch: change sample rate (higher rate = higher pitch on playback)
        # Speed: resample the audio data
        new_framerate = int(framerate * pitch_factor)

        # For speed adjustment, we do simple linear interpolation resampling
        fmt = f"<{n_frames * n_channels}h"
        samples = list(struct.unpack(fmt, raw))

        if abs(speed_factor - 1.0) > 0.05:
            new_length = int(len(samples) / speed_factor)
            new_samples = []
            for i in range(new_length):
                src = i * speed_factor
                idx = int(src)
                frac = src - idx
                if idx + 1 < len(samples):
                    val = samples[idx] * (1 - frac) + samples[idx + 1] * frac
                    new_samples.append(int(val))
                elif idx < len(samples):
                    new_samples.append(samples[idx])
            samples = new_samples

        # Write output
        buf_out = io.BytesIO()
        with wave.open(buf_out, 'wb') as wf:
            wf.setnchannels(n_channels)
            wf.setsampwidth(sample_width)
            wf.setframerate(new_framerate)
            wf.writeframes(struct.pack(f"<{len(samples)}h", *samples))

        result = buf_out.getvalue()
        logger.info(f"Voice profile applied: pitch={pitch_factor:.2f}x, speed={speed_factor:.2f}x, {len(audio_bytes)}→{len(result)} bytes")
        return result

    except Exception as e:
        logger.warning(f"Voice profile adjustment failed: {e}")
        return audio_bytes
