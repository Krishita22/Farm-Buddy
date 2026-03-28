"""Voice endpoints — Local Whisper STT + Piper TTS + Voice Profiling. No internet."""
from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import Response
from backend.services.whisper_stt import transcribe, detect_language
from backend.services.piper_tts import synthesize, list_available_voices
from backend.services.voice_profile import analyze_audio, get_voice_profile, save_voice_profile

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_hint: str = Query(None),
):
    """Transcribe audio using local Whisper. Returns text + detected language."""
    audio_bytes = await audio.read()
    result = await transcribe(audio_bytes, language_hint)
    return result


@router.post("/detect-language")
async def detect_lang(audio: UploadFile = File(...)):
    """Detect language from audio without full transcription."""
    audio_bytes = await audio.read()
    result = await detect_language(audio_bytes)
    return result


@router.post("/synthesize")
async def synthesize_speech(
    text: str = Query(...),
    language: str = Query("en"),
    dialect: str = Query(None),
    farmer_id: int = Query(None),
):
    """Generate speech using local Piper TTS, adjusted to farmer's voice profile."""
    profile = None
    if farmer_id:
        profile = await get_voice_profile(farmer_id)

    audio_bytes = await synthesize(text, language, dialect, voice_profile=profile)
    if audio_bytes:
        return Response(content=audio_bytes, media_type="audio/wav")
    return {"error": "TTS not available for this language.", "fallback": "browser"}


@router.post("/enroll")
async def enroll_voice(
    audio: UploadFile = File(...),
    farmer_id: int = Query(...),
):
    """
    Enroll a farmer's voice — analyze their speaking style from a sample.
    This adapts all future TTS responses to match their pitch and speed.
    Call this once when a farmer first uses the app.
    """
    audio_bytes = await audio.read()
    profile = analyze_audio(audio_bytes)

    if profile.get("analyzed"):
        await save_voice_profile(farmer_id, profile)
        return {
            "status": "enrolled",
            "profile": profile,
            "message": f"Voice profile saved. Pitch: {profile['pitch_class']}, Speed: {profile['speed_class']}. All responses will match your speaking style.",
        }
    else:
        return {
            "status": "failed",
            "message": "Could not analyze voice. Please record a longer sample (at least 3 seconds).",
        }


@router.get("/profile/{farmer_id}")
async def get_profile(farmer_id: int):
    """Get a farmer's voice profile."""
    profile = await get_voice_profile(farmer_id)
    return profile


@router.get("/voices")
async def voices():
    """List available offline TTS voices."""
    return list_available_voices()
