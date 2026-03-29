import { useState, useEffect, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { api } from '../lib/api'
import MessageBubble from '../components/chat/MessageBubble'
import FarmerProfile from '../components/chat/FarmerProfile'
import MemoryPanel from '../components/chat/MemoryPanel'
import VoiceEnroll from '../components/chat/VoiceEnroll'
import { Mic, MicOff, Send, ChevronDown, User, Brain, Loader2, WifiOff, Globe, Sparkles, AudioWaveform } from 'lucide-react'

export default function FarmerChat() {
  const { lang, t, languages } = useLanguage()
  const { user, region } = useUser()
  const [farmerId, setFarmerId] = useState(() => user?.farmer_id || 1)
  const [inputText, setInputText] = useState('')
  const [showEnroll, setShowEnroll] = useState(false)
  const [hasVoiceProfile, setHasVoiceProfile] = useState(false)
  const [farmer, setFarmer] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [showProfile, setShowProfile] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showFarmerSelect, setShowFarmerSelect] = useState(false)
  const messagesEndRef = useRef(null)

  const langConfig = languages.find(l => l.code === lang) || languages[0]
  const { messages, isLoading, sendMessage, clearMessages } = useChat(farmerId, lang)
  const { isRecording, isTranscribing, transcript, detectedLanguage, startRecording, stopRecording, setTranscript } = useVoiceRecorder()
  const { isPlaying, playAudio, speakText } = useAudioPlayer()

  useEffect(() => { api.getFarmers(20).then(setFarmers).catch(() => {}) }, [])

  // Check voice profile when farmer changes
  useEffect(() => {
    if (farmerId) {
      fetch(`/api/voice/profile/${farmerId}`).then(r => r.json())
        .then(p => setHasVoiceProfile(p?.analyzed === true))
        .catch(() => setHasVoiceProfile(false))
    }
  }, [farmerId])

  // Clear messages when farmer OR language changes
  useEffect(() => {
    clearMessages()
  }, [farmerId, lang, clearMessages])

  useEffect(() => {
    if (farmerId) {
      api.getFarmer(farmerId).then(setFarmer).catch(() => {})
    }
  }, [farmerId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const toggleRecording = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  useEffect(() => {
    if (!isTranscribing && transcript && !isRecording && inputText === transcript) {
      const timer = setTimeout(() => { if (inputText.trim()) handleSend() }, 800)
      return () => clearTimeout(timer)
    }
  }, [isTranscribing, transcript, isRecording])

  return (
    <div className="flex h-[calc(100dvh-56px)]">
      {/* Profile Sidebar */}
      <div className={`${showProfile ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white`}>
        {farmer && <FarmerProfile farmer={farmer} />}
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {farmer?.name?.[0] || '?'}
            </button>
            <div>
              <div className="relative">
                <button onClick={() => setShowFarmerSelect(!showFarmerSelect)}
                  className="font-semibold text-gray-900 flex items-center gap-1 hover:text-farm-700 text-sm">
                  {farmer?.name || t('selectFarmer')}
                  <ChevronDown size={14} />
                </button>
                {showFarmerSelect && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowFarmerSelect(false)} />
                    <div className="absolute top-7 left-0 bg-white border rounded-xl shadow-xl z-30 w-64 max-h-60 overflow-y-auto">
                      {farmers.map(f => (
                        <button key={f.id} onClick={() => { setFarmerId(f.id); setShowFarmerSelect(false) }}
                          className={`w-full text-left px-3 py-2 hover:bg-farm-50 text-sm transition-colors ${f.id === farmerId ? 'bg-farm-100 font-medium' : ''}`}>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-gray-400 ml-1">— {f.village}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400">{farmer?.village}, {farmer?.district}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowEnroll(true)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${hasVoiceProfile ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'}`}
              title={hasVoiceProfile ? 'Voice profile active' : 'Set up your voice'}>
              <AudioWaveform size={12} />
              <span className="hidden sm:inline">{hasVoiceProfile ? 'Voice' : 'Setup Voice'}</span>
            </button>
            <button onClick={() => setShowMemory(!showMemory)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${showMemory ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Brain size={12} />
              <span className="hidden sm:inline">{t('memory')}</span>
            </button>
            <div className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
              <WifiOff size={10} />
              {t('offline')}
            </div>
          </div>
        </div>

        {/* Memory */}
        {showMemory && farmer && <MemoryPanel farmerId={farmerId} />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center mt-12 sm:mt-20 px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-4xl">🌾</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{t('chatWelcome')}</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{t('chatWelcomeDesc')}</p>
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {[
                  { icon: <WifiOff size={12} />, label: t('chatOfflineBadge') },
                  { icon: <Brain size={12} />, label: t('chatMemoryBadge') },
                  { icon: <Globe size={12} />, label: t('chatLanguageBadge') },
                  { icon: <Sparkles size={12} />, label: t('chatAccentBadge') },
                ].map(b => (
                  <span key={b.label} className="flex items-center gap-1 text-xs bg-farm-50 text-farm-700 px-2.5 py-1 rounded-full border border-farm-200">
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {t('chatSuggestions').map(q => (
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">FA</div>
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
            <button onClick={toggleRecording} disabled={isTranscribing}
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
          {(isRecording || isTranscribing) && (
            <p className="text-center text-xs mt-1.5 text-gray-400">
              {isRecording ? t('chatRecording') : t('chatTranscribing')}
            </p>
          )}
        </div>
      </div>

      {/* Voice Enrollment Modal */}
      {showEnroll && (
        <VoiceEnroll
          farmerId={farmerId}
          onComplete={(profile) => {
            setShowEnroll(false)
            if (profile) setHasVoiceProfile(true)
          }}
        />
      )}
    </div>
  )
}
