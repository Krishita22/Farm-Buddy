"""
FarmAgent Voice Profiling — Matches TTS output to the farmer's speaking style.

When a farmer first speaks, we analyze their voice and extract:
- Speaking rate (words per second)
- Pitch range (Hz) — high/medium/low
- Pause patterns

Then every TTS response adjusts Piper's speed and pitch to sound
more like the farmer's natural rhythm. Not a full voice clone,
but it makes the AI feel familiar — like a neighbor, not a robot.

Stored in Harper memory so it persists across conversations.
"""
import io
import wave
import struct
import math
import logging
import json
import os

logger = logging.getLogger(__name__)

# Load Mozilla Common Voice accent profiles
_ACCENT_PROFILES = {}
_accent_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "accent_profiles.json")
try:
    with open(_accent_path) as f:
        _raw = json.load(f)
        _ACCENT_PROFILES = {k: v for k, v in _raw.items() if not k.startswith("_")}
except Exception:
    pass


def get_accent_profile(accent_code: str) -> dict:
    """Get accent profile from Mozilla Common Voice accent data.
    accent_code matches region.accent from UserContext (e.g. 'gujarati_rural')."""
    return _ACCENT_PROFILES.get(accent_code, {})


def analyze_audio(audio_bytes: bytes) -> dict:
    """
    Analyze raw audio to extract voice characteristics.
    Returns pitch estimate, speaking rate estimate, and energy profile.
    """
    try:
        buf = io.BytesIO(audio_bytes)
        with wave.open(buf, 'rb') as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)

        if sample_width == 2:
            fmt = f"<{n_frames * n_channels}h"
            samples = list(struct.unpack(fmt, raw))
        else:
            return _default_profile()

        # Take mono channel
        if n_channels > 1:
            samples = samples[::n_channels]

        if len(samples) < framerate:  # Less than 1 second
            return _default_profile()

        duration = len(samples) / framerate

        # --- Pitch estimation via zero-crossing rate ---
        zero_crossings = 0
        for i in range(1, len(samples)):
            if (samples[i] >= 0) != (samples[i - 1] >= 0):
                zero_crossings += 1
        zcr = zero_crossings / (2 * duration)  # Approximate fundamental freq

        # Classify pitch
        if zcr < 140:
            pitch_class = "low"
            pitch_factor = 0.85
        elif zcr < 200:
            pitch_class = "medium"
            pitch_factor = 1.0
        elif zcr < 280:
            pitch_class = "medium_high"
            pitch_factor = 1.1
        else:
            pitch_class = "high"
            pitch_factor = 1.2

        # --- Energy / volume ---
        rms = math.sqrt(sum(s * s for s in samples) / len(samples))
        max_amplitude = max(abs(s) for s in samples) if samples else 1
        energy_ratio = rms / max_amplitude if max_amplitude > 0 else 0.5

        # --- Speaking rate estimation via energy envelope ---
        # Count syllable-like energy peaks
        chunk_size = framerate // 20  # 50ms chunks
        energies = []
        for i in range(0, len(samples), chunk_size):
            chunk = samples[i:i + chunk_size]
            if chunk:
                e = math.sqrt(sum(s * s for s in chunk) / len(chunk))
                energies.append(e)

        # Count peaks (syllables roughly)
        if len(energies) > 2:
            threshold = sum(energies) / len(energies) * 0.6
            peaks = 0
            was_above = False
            for e in energies:
                if e > threshold and not was_above:
                    peaks += 1
                    was_above = True
                elif e <= threshold:
                    was_above = False

            syllables_per_sec = peaks / duration if duration > 0 else 3.5
        else:
            syllables_per_sec = 3.5

        # Map to speaking rate factor
        # Average speech is ~4 syllables/sec
        if syllables_per_sec < 2.5:
            speed_class = "slow"
            speed_factor = 0.8
        elif syllables_per_sec < 4.0:
            speed_class = "normal"
            speed_factor = 1.0
        elif syllables_per_sec < 5.5:
            speed_class = "fast"
            speed_factor = 1.15
        else:
            speed_class = "very_fast"
            speed_factor = 1.3

        profile = {
            "pitch_hz": round(zcr, 1),
            "pitch_class": pitch_class,
            "pitch_factor": pitch_factor,
            "speed_syllables_per_sec": round(syllables_per_sec, 2),
            "speed_class": speed_class,
            "speed_factor": speed_factor,
            "energy_ratio": round(energy_ratio, 3),
            "duration_sec": round(duration, 2),
            "analyzed": True,
        }

        logger.info(f"Voice profile: pitch={pitch_class} ({zcr:.0f}Hz), speed={speed_class} ({syllables_per_sec:.1f} syl/s)")
        return profile

    except Exception as e:
        logger.warning(f"Voice analysis failed: {e}")
        return _default_profile()


def _default_profile():
    return {
        "pitch_hz": 170,
        "pitch_class": "medium",
        "pitch_factor": 1.0,
        "speed_syllables_per_sec": 3.5,
        "speed_class": "normal",
        "speed_factor": 1.0,
        "energy_ratio": 0.5,
        "duration_sec": 0,
        "analyzed": False,
    }


async def get_voice_profile(farmer_id: int, accent_code: str = None) -> dict:
    """Get stored voice profile for a farmer, merged with regional accent data.
    accent_code comes from the region's accent field (e.g. 'gujarati_rural')."""
    profile = None

    try:
        from backend.services.harper_memory import get_memories
        memories = await get_memories(farmer_id, memory_type="voice_profile", limit=1)
        if memories:
            content = memories[0].get("content", "{}")
            if isinstance(content, str):
                profile = json.loads(content)
            else:
                profile = content
    except Exception:
        pass

    # SQLite fallback
    if not profile:
        try:
            from backend.database import get_db
            db = await get_db()
            try:
                rows = await db.execute_fetchall(
                    "SELECT content FROM alerts WHERE farmer_id = ? AND alert_type = 'memory_voice_profile' ORDER BY sent_at DESC LIMIT 1",
                    (farmer_id,),
                )
                if rows:
                    profile = json.loads(dict(rows[0])["content"])
            finally:
                await db.close()
        except Exception:
            pass

    if not profile:
        profile = _default_profile()

    # Merge regional accent data from Mozilla Common Voice profiles
    if accent_code:
        accent = get_accent_profile(accent_code)
        if accent:
            profile["accent"] = accent_code
            profile["dialect"] = accent.get("dialect", "")
            profile["whisper_hints"] = accent.get("whisper_hints", {})
            profile["farming_vocabulary"] = accent.get("farming_vocabulary", [])
            # Use accent TTS adjustments as base if no personal analysis
            if not profile.get("analyzed"):
                adj = accent.get("tts_adjustments", {})
                if adj.get("speed_factor"):
                    profile["speed_factor"] = adj["speed_factor"]
                if adj.get("pitch_factor"):
                    profile["pitch_factor"] = adj["pitch_factor"]

    return profile


async def save_voice_profile(farmer_id: int, profile: dict):
    """Save voice profile to Harper memory."""
    try:
        from backend.services.harper_memory import store_memory
        await store_memory(farmer_id, "voice_profile", json.dumps(profile))
    except Exception as e:
        logger.debug(f"Harper save failed: {e}")

    # Also save to SQLite as fallback
    try:
        from backend.database import get_db
        db = await get_db()
        try:
            # Delete old profile
            await db.execute(
                "DELETE FROM alerts WHERE farmer_id = ? AND alert_type = 'memory_voice_profile'",
                (farmer_id,),
            )
            await db.execute(
                "INSERT INTO alerts (farmer_id, alert_type, content, language) VALUES (?, ?, ?, ?)",
                (farmer_id, "memory_voice_profile", json.dumps(profile), "en"),
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        logger.debug(f"SQLite profile save failed: {e}")
