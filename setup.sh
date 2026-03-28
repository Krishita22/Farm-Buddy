#!/bin/bash
# FarmAgent — One-Time Setup Script
# Downloads Nous Research model, Whisper, and initializes everything
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🌾 FarmAgent — Setup"
echo "===================="
echo "No paid API keys needed. Everything is free or local."
echo ""

# 1. Python dependencies
echo "📦 [1/6] Installing Python dependencies..."
cd "$ROOT_DIR/backend"
pip install -r requirements.txt -q
echo "   ✅ Done"

# 2. Frontend dependencies
echo ""
echo "📦 [2/6] Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install --silent
echo "   ✅ Done"

# 3. Nous Research model via Ollama
echo ""
echo "🧠 [3/6] Setting up Nous Research LLM (local AI brain)..."
if command -v ollama &> /dev/null; then
    echo "   Ollama found. Pulling Nous Research Hermes 2 model..."
    echo "   (This is a one-time ~7GB download)"
    ollama pull nous-hermes2
    echo "   ✅ Nous Research model ready"

    # Create custom FarmAgent model with farming system prompt
    echo "   Creating FarmAgent custom model..."
    cd "$ROOT_DIR/backend/models"
    ollama create farmagent -f Modelfile 2>/dev/null && echo "   ✅ Custom model created" || echo "   (Using default nous-hermes2)"

    # Also pull a lighter model as fallback
    echo "   Pulling lightweight fallback model (phi3:mini)..."
    ollama pull phi3:mini 2>/dev/null || true
    echo "   ✅ Fallback model ready"
else
    echo "   ⚠️  Ollama not installed!"
    echo "   Install from: https://ollama.ai"
    echo "   Then run:"
    echo "     ollama pull nous-hermes2"
    echo "     ollama pull phi3:mini"
fi

# 4. Whisper model
echo ""
echo "🎤 [4/6] Setting up Whisper STT (local speech-to-text)..."
python -c "
try:
    import whisper
    print('   Pre-downloading Whisper small model...')
    whisper.load_model('small')
    print('   ✅ Whisper ready')
except ImportError:
    print('   ⚠️  openai-whisper not installed. Run: pip install openai-whisper')
except Exception as e:
    print(f'   ⚠️  Whisper setup: {e}')
"

# 5. Piper TTS voices
echo ""
echo "🗣️  [5/6] Setting up Piper TTS (local text-to-speech)..."
VOICES_DIR="$ROOT_DIR/backend/models/piper_voices"
mkdir -p "$VOICES_DIR"
if [ ! -f "$VOICES_DIR/en_US-lessac-medium.onnx" ]; then
    echo "   Downloading English voice model (~60MB)..."
    curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" -o "$VOICES_DIR/en_US-lessac-medium.onnx"
    curl -sL "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" -o "$VOICES_DIR/en_US-lessac-medium.onnx.json"
    echo "   ✅ English voice downloaded"
else
    echo "   ✅ English voice already downloaded"
fi
# Verify piper works
python -c "
from piper import PiperVoice
import wave, io
v = PiperVoice.load('$VOICES_DIR/en_US-lessac-medium.onnx')
buf = io.BytesIO()
w = wave.open(buf, 'wb')
v.synthesize_wav('Test.', w)
w.close()
print(f'   ✅ Piper TTS verified ({len(buf.getvalue())} bytes)')
" 2>/dev/null || echo "   ⚠️  Piper test failed — will use browser TTS fallback"

# 6. Seed database
echo ""
echo "🌱 [6/6] Seeding database with 500 demo farms..."
cd "$ROOT_DIR/backend"
python seed_data.py

# Generate training data for judges
echo ""
echo "📊 Generating fine-tuning training data for demo..."
cd "$ROOT_DIR/backend/models/training"
python prepare_dataset.py 2>/dev/null || true

echo ""
echo "===================="
echo "✅ FarmAgent setup complete!"
echo ""
echo "Stack:"
echo "  🧠 LLM:     Nous Research Hermes 2 (local via Ollama)"
echo "  🎤 STT:     OpenAI Whisper small (local)"
echo "  🗣️  TTS:     Piper / espeak / browser fallback"
echo "  💾 Memory:  HarperDB (optional) / SQLite"
echo "  🌤️  Weather: Open-Meteo API (free, no key) + offline fallback"
echo "  📊 Data:    SQLite with 500 demo farms"
echo ""
echo "To start: ./start.sh"
