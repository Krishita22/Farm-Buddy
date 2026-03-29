# 🌱 Farm-Buddy

Farm-Buddy is an advanced, AI-powered agricultural assistant designed to help smallholder farmers make informed decisions about their crops. It provides localized advice, weather integration, offline maps for sourcing supplies, and voice-activated assistance in native dialects.
We are doing this project for Harper Personal - AI agent track , Asus Societal impact track. We want to qualify for these side tracks: MLH, Snapchat and most useless, Most Creative Hack, Best UI/UX, Actual Foods. 

## ✨ Features

- **🎙️ Multilingual Voice AI Assistant**: A voice-enabled conversational AI using OpenAI Whisper for speech-to-text and Piper TTS for natural, on-device audio responses in local languages.
- **🗺️ Offline Maps & Navigation**: Fully functional offline maps (using React Leaflet) that help farmers locate crucial resources like irrigation sources, fertilizer stores, and local farming services without needing an internet connection.
- **🌤️ Dynamic Weather Alerts**: Integrates with OpenWeatherMap APIs to deliver localized, real-time weather forecasts, allowing the AI to generate immediate, tailor-made farming advice.
- **📊 Interactive Dashboard**: A sleek, user-friendly interface visualizing farm metrics, task recommendations, and weather summaries through interactive Recharts.
- **🧑‍🌾 User Profiles & Farms**: Secure onboarding and authentication, where farmers can track their farm’s specific parameters to receive specialized guidance over time.

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.0 | UI framework |
| **Vite** | 6.0 | Build tool & dev server |
| **Tailwind CSS** | 4.0 | Utility-first styling |
| **React Router DOM** | 7.1 | Client-side routing |
| **Leaflet + React Leaflet** | 1.9 / 5.0 | Interactive offline maps |
| **Recharts** | 2.15 | Dashboard charts & data visualization |
| **Lucide React** | 0.469 | Icon library |
| **Service Worker** | Vanilla JS | PWA offline caching (network-first for APIs, cache-first for assets) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.115 | Async Python web framework |
| **Uvicorn** | 0.34 | ASGI server |
| **SQLite + aiosqlite** | 0.20 | Local database (zero config, offline) |
| **Pydantic** | 2.10 | Request/response validation |
| **httpx** | 0.28 | Async HTTP client for external APIs |
| **python-dotenv** | 1.0 | Environment config |

### AI / ML (all local, no cloud)
| Technology | Purpose |
|---|---|
| **Ollama** | Local LLM inference engine |
| **Llama 3** (8B) | Primary AI model — multilingual farming advisor |
| **OpenAI SDK** (1.58) | Client for Ollama's OpenAI-compatible API |
| **OpenAI Whisper** (small) | Speech-to-text — transcribes farmer voice in 10 languages |
| **Piper TTS** | Text-to-speech — offline, accent-aware voice synthesis |
| **ElevenLabs**| Premium TTS when online (multilingual v2) |
| **ChatterboxTTS**| Voice cloning from 5-second farmer samples |

### Memory & Data
| Technology | Purpose |
|---|---|
| **HarperDB** | Farmer memory layer — remembers past conversations, preferences, farm context |
| **SQLite** | Fallback storage + farmer/crop/market data |
| **Embedded JSON datasets** | Farming knowledge, crop calendar, regional prices, historical weather (30-year normals) |

### Weather APIs (cascading fallback)
| Priority | Service | Requirement |
|---|---|---|
| 1 | **Tomorrow.io** | API key (best accuracy) |
| 2 | **AccuWeather** | API key |
| 3 | **OpenWeather** | API key |
| 4 | **Open-Meteo** | Free, no key needed |
| 5 | **Offline historical** | Embedded 30-year climate averages |

### Offline-First Architecture
```
Online:  Open-Meteo → live weather, data.gov.in → live market prices, sync to cache
Offline: Ollama (local AI) + Whisper (local STT) + Piper (local TTS) + SQLite + cached data
```

> Everything critical runs **locally with zero internet**: the AI brain, voice input, voice output, weather predictions, market prices, and the full UI via service worker.

### Git
```bash
git clone https://github.com/Krishita22/Farm-Buddy.git
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.10+)
- An OpenAI API Key
- OpenWeatherMap API Key

### Installation

1. **Backend Setup**:
   Navigate to the backend directory, create a virtual environment, and install dependencies:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   *Note: Ensure you have your environment variables set up properly, such as API keys.*
   
   Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

2. **Frontend Setup**:
   Open a new terminal, navigate to the frontend directory, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
   
   Start the development server:
   ```bash
   npm run dev
   ```

## Video demo link:
[https://drive.google.com/file/d/1QxWm9fj8d9CXI8w2oAKOUheaWX50PjBv/view?usp=sharing](https://youtu.be/TnDjN7uxOnY)

## Snap chat links:
1) https://lens.snap.com/experience/2e10ef31-7f5e-4066-a4a6-d9dba0c5b6c6
2) https://lens.snap.com/experience/5741fb66-a437-4457-9f6a-53c62bdca4bb
3) https://lens.snap.com/experience/5d14ecba-5992-477a-a587-365ba4a33015 

## 📜 License

This project is licensed under the MIT License.
