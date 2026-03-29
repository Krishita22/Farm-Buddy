"""
Chat endpoint — The full offline pipeline:
1. Whisper STT (local) — transcribes farmer's voice
2. Harper Memory — retrieves personal context
3. Ollama LLM (local) — generates farming advice
4. Piper TTS (local) — speaks response in farmer's accent
Everything runs on device. Zero internet.
"""
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from backend.services.ai_brain import (
    get_ai_response, extract_disease_report, extract_crop_update,
    extract_memory, clean_response,
)
from backend.services.memory import (
    build_farmer_context, get_conversation_history,
    store_message, get_or_create_conversation,
)
from backend.services.harper_memory import (
    store_memory, build_harper_context, store_conversation_summary,
    add_knowledge,
)
from backend.services.weather_engine import get_weather_context_for_ai  # now async
from backend.services.piper_tts import synthesize as piper_synthesize
from backend.services.elevenlabs_tts import synthesize as elevenlabs_synthesize
from backend.services.chatterbox_tts import synthesize as chatterbox_synthesize, get_voice_sample_path
from backend.services.voice_profile import analyze_audio, get_voice_profile, save_voice_profile
from backend.database import get_db
import base64
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    farmer_id: int
    message: str
    language: str = "en"


class ChatResponse(BaseModel):
    reply: str
    audio_base64: str | None = None
    audio_format: str = "wav"
    language: str
    detected_language: str | None = None
    disease_detected: dict | None = None
    crop_update: dict | None = None
    memory_stored: dict | None = None
    offline: bool = True


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Text-based chat — uses Ollama LLM locally."""
    return await _process_message(
        farmer_id=request.farmer_id,
        message_text=request.message,
        language=request.language,
    )


@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    farmer_id: int = Form(...),
    language: str = Form("en"),
):
    """
    Voice-based chat — full offline pipeline:
    Audio → Whisper STT → Ollama LLM → Piper TTS → Audio response
    """
    # Step 1: Transcribe with local Whisper
    audio_bytes = await audio.read()
    try:
        from backend.services.whisper_stt import transcribe
        stt_result = await transcribe(audio_bytes, language_hint=language)
        message_text = stt_result.get("text", "")
        detected_lang = stt_result.get("language", language)
    except Exception as e:
        logger.error(f"Whisper STT failed: {e}")
        return ChatResponse(
            reply="I couldn't understand the audio. Please try speaking again or type your question.",
            language=language,
            detected_language=language,
        )

    if not message_text.strip():
        return ChatResponse(
            reply="I didn't hear anything. Please try again.",
            language=language,
            detected_language=detected_lang,
        )

    # Step 1.5: Analyze farmer's voice and update their profile
    try:
        profile = analyze_audio(audio_bytes)
        if profile.get("analyzed"):
            await save_voice_profile(farmer_id, profile)
            logger.info(f"Voice profile updated for farmer {farmer_id}: pitch={profile['pitch_class']}, speed={profile['speed_class']}")
    except Exception as e:
        logger.debug(f"Voice profiling failed: {e}")

    # Use detected language for response
    return await _process_message(
        farmer_id=farmer_id,
        message_text=message_text,
        language=detected_lang or language,
        detected_language=detected_lang,
    )


async def _process_message(
    farmer_id: int,
    message_text: str,
    language: str,
    detected_language: str = None,
) -> ChatResponse:
    """Core processing pipeline — shared by text and voice chat."""

    # Step 1: Get or create conversation
    conversation_id = await get_or_create_conversation(farmer_id)

    # Step 2: Store farmer's message
    await store_message(conversation_id, "farmer", message_text, language)

    # Step 3: Build context from all sources
    farmer_context = await build_farmer_context(farmer_id)
    history = await get_conversation_history(conversation_id)
    harper_context = await build_harper_context(farmer_id)

    # Get farmer's coordinates for location-accurate weather
    lat, lng = -1.52, 37.26  # defaults
    try:
        from backend.database import get_db
        db = await get_db()
        try:
            rows = await db.execute_fetchall("SELECT latitude, longitude FROM farmers WHERE id = ?", (farmer_id,))
            if rows:
                f = dict(rows[0])
                if f.get("latitude") and f.get("longitude"):
                    lat, lng = f["latitude"], f["longitude"]
        finally:
            await db.close()
    except Exception:
        pass
    weather_context = await get_weather_context_for_ai(lat, lng)

    # Step 4: Get AI response from local Ollama
    raw_response = await get_ai_response(
        message=message_text,
        farmer_context=farmer_context,
        language=language,
        conversation_history=history,
        harper_memories=harper_context,
        weather_context=weather_context,
    )

    # Step 5: Extract metadata from response
    disease = extract_disease_report(raw_response)
    crop_update = extract_crop_update(raw_response)
    memory_data = extract_memory(raw_response)
    clean_reply = clean_response(raw_response)

    # Step 6: Store extracted data
    memory_stored = None

    if disease:
        db = await get_db()
        try:
            farmer = await db.execute_fetchall(
                "SELECT latitude, longitude FROM farmers WHERE id = ?", (farmer_id,)
            )
            f = dict(farmer[0]) if farmer else {}
            await db.execute(
                """INSERT INTO disease_reports (farmer_id, crop_name, disease_name, severity, latitude, longitude)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (farmer_id, disease.get("crop"), disease.get("disease"),
                 disease.get("severity", "moderate"), f.get("latitude"), f.get("longitude")),
            )
            await db.commit()
        finally:
            await db.close()

        # Store in Harper memory too
        await store_memory(
            farmer_id, "event",
            f"Reported {disease['disease']} on {disease['crop']} ({disease['severity']})",
            conversation_id,
        )
        await add_knowledge(farmer_id, f"farmer_{farmer_id}", "reported_disease", disease["disease"])

    if memory_data:
        memory_stored = await store_memory(
            farmer_id,
            memory_data.get("type", "fact"),
            memory_data.get("content", ""),
            conversation_id,
        )

    # Step 7: Store agent response
    await store_message(conversation_id, "agent", clean_reply, language)

    # Step 8: Store conversation summary in Harper (every 5 messages)
    if len(history) > 0 and len(history) % 5 == 0:
        summary = f"Discussed: {message_text[:100]}. Advised: {clean_reply[:100]}"
        await store_conversation_summary(farmer_id, conversation_id, summary)

    # Step 9: Generate TTS — 3-tier voice pipeline
    # Tier 1: ElevenLabs (online, best quality, multilingual)
    # Tier 2: ChatterboxTTS (offline, CLONES farmer's actual voice)
    # Tier 3: Piper (offline, fast, accent-matched)
    audio_b64 = None
    audio_format = "mp3"
    tts_engine = "none"
    try:
        # Tier 1: ElevenLabs (when online)
        audio_bytes = await elevenlabs_synthesize(clean_reply, language)
        if audio_bytes:
            audio_b64 = base64.b64encode(audio_bytes).decode()
            audio_format = "mp3"
            tts_engine = "elevenlabs"
        else:
            # Tier 2: ChatterboxTTS (offline voice clone — speaks in farmer's OWN voice)
            has_voice_sample = get_voice_sample_path(farmer_id) is not None
            if has_voice_sample:
                audio_bytes = await chatterbox_synthesize(clean_reply, farmer_id)
                if audio_bytes:
                    audio_b64 = base64.b64encode(audio_bytes).decode()
                    audio_format = "wav"
                    tts_engine = "chatterbox"

            # Tier 3: Piper (fast offline fallback)
            if not audio_b64:
                profile = await get_voice_profile(farmer_id)
                audio_bytes = await piper_synthesize(clean_reply, language, voice_profile=profile)
                if audio_bytes:
                    audio_b64 = base64.b64encode(audio_bytes).decode()
                    audio_format = "wav"
                    tts_engine = "piper"

        if tts_engine != "none":
            logger.info(f"TTS: {tts_engine} ({len(audio_bytes)} bytes)")
    except Exception as e:
        logger.debug(f"TTS failed (will use browser fallback): {e}")

    return ChatResponse(
        reply=clean_reply,
        audio_base64=audio_b64,
        audio_format=audio_format,
        language=language,
        detected_language=detected_language,
        disease_detected=disease,
        crop_update=crop_update,
        memory_stored=memory_stored,
        offline=True,
    )
