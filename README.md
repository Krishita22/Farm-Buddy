# 🌾 Farm Buddy — Personal AI Farming Advisor

**Every rich farmer has advisors. Farm Buddy is the advisor for the farmer who has nothing — and it speaks their language.**

Built for **YHack Hackathon** (Harper AI Track)

## What It Does

A farmer calls, speaks in their language — Gujarati, Hindi, Swahili, Bengali, anything — and Farm Buddy listens, thinks, and talks back. Like a neighbor who knows everything about farming.

- **10 languages** with native accent TTS (ElevenLabs + Piper offline)
- **Works offline** — Ollama LLM, Whisper STT, local weather fallback
- **Remembers you** — Harper AI memory learns your farm across conversations
- **Real weather** — Open-Meteo API with offline historical fallback
- **Marketplace** — Buy/sell crops, seeds, tools across regions
- **Services** — Find tractors, labor, irrigation, repair near you
- **5 regions** — Kenya, Gujarat, Uttar Pradesh, Bangladesh, Nigeria

## Tech Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| LLM | Llama 3 via Ollama (local) | Offline |
| Voice (Premium) | ElevenLabs Multilingual v2 | Online |
| Voice (Offline) | Piper TTS with accent models | Offline |
| Speech-to-Text | OpenAI Whisper (local) | Offline |
| Memory | HarperDB (Harper AI Track) | Local |
| Weather | Open-Meteo (free) + offline fallback | Hybrid |
| Farm Data | SQLite with 500 demo farms | Local |
| Frontend | React + Vite + Tailwind v4 | PWA |

## Quick Start

```bash
# 1. Setup (one-time)
./setup.sh

# 2. Add your ElevenLabs key (optional — Piper works without it)
cp .env.example .env
# Edit .env and add ELEVENLABS_API_KEY=sk_...

# 3. Start
./start.sh
```

Open **http://localhost:5173**

## Sponsors

- **Harper AI** — Personal agent memory layer (HarperDB)
- **Nous Research** — Open-source LLM foundation
- **ASUS Societal Impact** — Mission framing for 500M smallholder farmers
- **ElevenLabs** — Premium multilingual conversational voice

## License

MIT
