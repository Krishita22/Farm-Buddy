# 🌱 Farm-Buddy

Farm-Buddy is an advanced, AI-powered agricultural assistant designed to help smallholder farmers make informed decisions about their crops. It provides localized advice, weather integration, offline maps for sourcing supplies, and voice-activated assistance in native dialects.
We are doing this project for Harper Personal - AI agent track , Asus Societal impact track , Actual food , 

## ✨ Features

- **🎙️ Multilingual Voice AI Assistant**: A voice-enabled conversational AI using OpenAI Whisper for speech-to-text and Piper TTS for natural, on-device audio responses in local languages.
- **🗺️ Offline Maps & Navigation**: Fully functional offline maps (using React Leaflet) that help farmers locate crucial resources like irrigation sources, fertilizer stores, and local farming services without needing an internet connection.
- **🌤️ Dynamic Weather Alerts**: Integrates with OpenWeatherMap APIs to deliver localized, real-time weather forecasts, allowing the AI to generate immediate, tailor-made farming advice.
- **📊 Interactive Dashboard**: A sleek, user-friendly interface visualizing farm metrics, task recommendations, and weather summaries through interactive Recharts.
- **🧑‍🌾 User Profiles & Farms**: Secure onboarding and authentication, where farmers can track their farm’s specific parameters to receive specialized guidance over time.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 & Vite
- **Styling**: Tailwind CSS (v4)
- **Routing**: React Router DOM (v7)
- **Maps**: React Leaflet
- **Data Visualization**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: Python & FastAPI
- **Database**: SQLite (managed asynchronously via `aiosqlite`) & HarperDB
- **Validation**: Pydantic v2
- **Audio Processing**: `openai-whisper` and `piper-tts`

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
https://drive.google.com/file/d/1QxWm9fj8d9CXI8w2oAKOUheaWX50PjBv/view?usp=sharing

## Snap chat links:
https://lens.snap.com/experience/2e10ef31-7f5e-4066-a4a6-d9dba0c5b6c6
https://lens.snap.com/experience/5741fb66-a437-4457-9f6a-53c62bdca4bb
https://lens.snap.com/experience/5d14ecba-5992-477a-a587-365ba4a33015 (https://lens.snap.com/experience/5d14ecba-5992-477a-a587-365ba4a33015-)

## 📜 License

This project is licensed under the MIT License.
