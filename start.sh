#!/bin/bash
# FarmAgent — Start (Nous Research + Open-Meteo + HarperDB)
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🌾 FarmAgent — Starting"
echo "========================"

# 1. Ollama (Nous Research model)
echo ""
echo "🧠 Checking Nous Research LLM..."
if command -v ollama &> /dev/null; then
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "   Starting Ollama..."
        ollama serve &
        sleep 3
    fi
    # Check which models are available
    MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null | python -c "import sys,json; [print('   -', m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "   (could not list)")
    echo "   ✅ Ollama running. Available models:"
    echo "$MODELS"
else
    echo "   ⚠️  Ollama not found — install from https://ollama.ai"
fi

# 2. HarperDB (optional)
echo ""
echo "💾 Checking HarperDB..."
if curl -s http://localhost:9925 > /dev/null 2>&1; then
    echo "   ✅ HarperDB running (personal memory layer)"
else
    echo "   ⚠️  Not running — using SQLite fallback"
fi

# 3. Weather connectivity check
echo ""
echo "🌤️  Checking weather API..."
if curl -s --max-time 3 "https://api.open-meteo.com/v1/forecast?latitude=-1.52&longitude=37.26&current=temperature_2m" > /dev/null 2>&1; then
    echo "   ✅ Open-Meteo reachable — real weather data"
else
    echo "   ⚠️  Open-Meteo unreachable — using offline historical data"
fi

# 4. Seed if needed
cd "$ROOT_DIR/backend"
python seed_data.py 2>/dev/null

# 5. Backend
echo ""
echo "🚀 Starting backend..."
cd "$ROOT_DIR"
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 2

# 6. Frontend
echo ""
echo "🚀 Starting frontend..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================"
echo "✅ FarmAgent is running!"
echo ""
echo "   🌐 App:        http://localhost:5173"
echo "   📡 API:        http://localhost:8000"
echo "   📚 API Docs:   http://localhost:8000/docs"
echo "   🧠 LLM:        Nous Research (localhost:11434)"
echo "   🌤️  Weather:    Open-Meteo (free) + offline fallback"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
