import { useState, useEffect, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import MessageBubble from '../components/chat/MessageBubble'
import MemoryPanel from '../components/chat/MemoryPanel'
import VoiceEnroll from '../components/chat/VoiceEnroll'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { Mic, MicOff, Send, Brain, Loader2, Wifi, WifiOff, Globe, Sparkles, AudioWaveform, CloudSun } from 'lucide-react'

export default function FarmerChat() {
  const { lang, t, languages } = useLanguage()
  const { user, region } = useUser()
  const isOnline = useOnlineStatus()
  const farmerId = user?.farmer_id || 1
  const [inputText, setInputText] = useState('')
  const [showEnroll, setShowEnroll] = useState(false)
  const [hasVoiceProfile, setHasVoiceProfile] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [weather, setWeather] = useState(null)
  const messagesEndRef = useRef(null)

  const langConfig = languages.find(l => l.code === lang) || languages[0]
  const { messages, isLoading, sendMessage, clearMessages } = useChat(farmerId, lang)
  const { isRecording, isTranscribing, transcript, startRecording, stopRecording, setTranscript } = useVoiceRecorder()
  const { isPlaying, playAudio, speakText } = useAudioPlayer()

  // Load weather for user's region
  useEffect(() => {
    if (region) {
      fetch(`/api/weather/current?lat=${region.lat}&lng=${region.lng}`)
        .then(r => r.json()).then(setWeather).catch(() => {})
    }
  }, [region])

  // Check voice profile
  useEffect(() => {
    if (farmerId) {
      fetch(`/api/voice/profile/${farmerId}`).then(r => r.json())
        .then(p => setHasVoiceProfile(p?.analyzed === true))
        .catch(() => setHasVoiceProfile(false))
    }
  }, [farmerId])

  // Clear messages when language changes
  useEffect(() => { clearMessages() }, [lang, clearMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Voice transcript → input
  useEffect(() => {
    if (transcript && !transcript.startsWith('[')) setInputText(transcript)
  }, [transcript])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    setTranscript('')
    const response = await sendMessage(text)
    if (response) {
      if (response.audio_base64) playAudio(response.audio_base64, response.audio_format || 'wav')
      else speakText(response.reply, langConfig.speechCode)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Auto-send after transcription
  useEffect(() => {
    if (!isTranscribing && transcript && !isRecording && inputText === transcript) {
      const timer = setTimeout(() => { if (inputText.trim()) handleSend() }, 800)
      return () => clearTimeout(timer)
    }
  }, [isTranscribing, transcript, isRecording])

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* Header — YOUR profile, not demo farmers */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{user?.name || 'Farmer'}</p>
            <p className="text-xs text-gray-400">{region?.flag} {region?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Weather quick view */}
          {weather && (
            <div className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
              <CloudSun size={12} />
              {weather.current_temp_c}°C
            </div>
          )}
          <button onClick={() => setShowEnroll(true)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${hasVoiceProfile ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
            <AudioWaveform size={12} />
            <span className="hidden sm:inline">{hasVoiceProfile ? 'Voice' : 'Setup'}</span>
          </button>
          <button onClick={() => setShowMemory(!showMemory)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${showMemory ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'}`}>
            <Brain size={12} />
          </button>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isOnline ? t('online') : t('offline')}
          </div>
        </div>
      </div>

      {/* Memory panel */}
      {showMemory && <MemoryPanel farmerId={farmerId} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center mt-12 sm:mt-16 px-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">🌾</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t('chatWelcome')}</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{t('chatWelcomeDesc')}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {[
                { icon: isOnline ? <Wifi size={12} /> : <WifiOff size={12} />, label: isOnline ? t('liveData') : t('chatOfflineBadge') },
                { icon: <Brain size={12} />, label: t('chatMemoryBadge') },
                { icon: <Globe size={12} />, label: t('chatLanguageBadge') },
                { icon: <Sparkles size={12} />, label: t('chatAccentBadge') },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1 text-xs bg-farm-50 text-farm-700 px-2.5 py-1 rounded-full border border-farm-200">
                  {b.icon} {b.label}
                </span>
              ))}
            </div>

            {/* Weather card inline */}
            {weather && (
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-3 mb-4 max-w-sm mx-auto border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs text-gray-400">{region?.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{weather.current_temp_c}°C</p>
                    <p className="text-xs text-gray-500">{weather.condition?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 space-y-0.5">
                    <p>💧 {weather.humidity_pct}%</p>
                    <p>💨 {weather.wind_kph} km/h</p>
                    <p className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>{weather.source === 'tomorrow.io' || weather.source === 'accuweather' || weather.source === 'open-meteo' ? t('liveData') : t('offline')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {(t('chatSuggestions') || []).map(q => (
                <button key={q} onClick={() => setInputText(q)}
                  className="text-xs sm:text-sm px-3 py-2 bg-white border border-gray-200 rounded-2xl text-gray-700 hover:bg-farm-50 hover:border-farm-300 transition-all shadow-sm">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg}
            onPlayAudio={() => {
              if (msg.audio) playAudio(msg.audio, 'wav')
              else speakText(msg.content, langConfig.speechCode)
            }}
            isPlaying={isPlaying} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">🌾</div>
            <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                {t('chatThinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/60 px-3 py-2.5 safe-bottom">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <button onClick={() => isRecording ? stopRecording() : startRecording()} disabled={isTranscribing}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm ${
              isRecording ? 'bg-red-500 text-white mic-recording shadow-red-200'
              : isTranscribing ? 'bg-amber-100 text-amber-600'
              : 'bg-farm-600 text-white hover:bg-farm-700'
            }`}>
            {isTranscribing ? <Loader2 size={20} className="animate-spin" />
             : isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isRecording ? t('chatRecording') : isTranscribing ? t('chatTranscribing') : t('chatPlaceholder')}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-farm-500 focus:border-transparent focus:outline-none text-sm bg-gray-50"
            disabled={isLoading || isTranscribing} />
          <button onClick={handleSend} disabled={!inputText.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-farm-600 text-white flex items-center justify-center hover:bg-farm-700 disabled:opacity-30 transition-all shrink-0 shadow-sm">
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Voice clone enrollment */}
      {showEnroll && (
        <VoiceEnroll farmerId={farmerId}
          onComplete={(profile) => { setShowEnroll(false); if (profile) setHasVoiceProfile(true) }} />
      )}
    </div>
  )
}
