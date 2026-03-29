import { useState, useEffect, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useLanguage } from '../lib/LanguageContext'
import { api } from '../lib/api'
import MessageBubble from '../components/chat/MessageBubble'
import FarmerProfile from '../components/chat/FarmerProfile'
import MemoryPanel from '../components/chat/MemoryPanel'
import VoiceEnroll from '../components/chat/VoiceEnroll'
import { Mic, MicOff, Send, ChevronDown, User, Brain, Loader2, WifiOff, Globe, Sparkles, AudioWaveform } from 'lucide-react'

export default function FarmerChat() {
  const { lang, t, languages } = useLanguage()
  const [farmerId, setFarmerId] = useState(1)
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

  useEffect(() => {
    if (farmerId) {
      api.getFarmer(farmerId).then(setFarmer).catch(() => {})
      clearMessages()
    }
  }, [farmerId, clearMessages])

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
    <div className="page-crop-bg relative flex h-[calc(100dvh-64px)] overflow-hidden">
      {/* Profile Sidebar */}
      <div className={`${showProfile ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white`}>
        {farmer && <FarmerProfile farmer={farmer} />}
      </div>

      <div className="flex-1 flex flex-col w-full min-h-0">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-base font-bold shadow-sm shrink-0">
              {farmer?.name?.[0] || '?'}
            </button>
            <div>
              <div className="relative">
                <button onClick={() => setShowFarmerSelect(!showFarmerSelect)}
                  className="font-semibold text-gray-900 flex items-center gap-1.5 hover:text-farm-700 text-lg leading-tight">
                  {farmer?.name || t('selectFarmer')}
                  <ChevronDown size={16} />
                </button>
                {showFarmerSelect && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowFarmerSelect(false)} />
                    <div className="absolute top-10 left-0 bg-white border rounded-2xl shadow-xl z-30 w-80 max-h-72 overflow-y-auto">
                      {farmers.map(f => (
                        <button key={f.id} onClick={() => { setFarmerId(f.id); setShowFarmerSelect(false) }}
                          className={`w-full text-left px-4 py-3 hover:bg-farm-50 text-base transition-colors ${f.id === farmerId ? 'bg-farm-100 font-medium' : ''}`}>
                          <span className="font-medium">{f.name}</span>
                          <span className="text-gray-400 ml-1">— {f.village}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{farmer?.village}, {farmer?.district}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button onClick={() => setShowEnroll(true)}
              className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all ${hasVoiceProfile ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'}`}
              title={hasVoiceProfile ? 'Voice profile active' : 'Set up your voice'}>
              <AudioWaveform size={14} className="sm:size-4" />
              <span className="hidden sm:inline">{hasVoiceProfile ? 'Voice' : 'Setup Voice'}</span>
            </button>
            <button onClick={() => setShowMemory(!showMemory)}
              className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all ${showMemory ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Brain size={14} className="sm:size-4" />
              <span className="hidden sm:inline">{t('memory')}</span>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full">
              <WifiOff size={12} className="sm:size-[14px]" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </div>
          </div>
        </div>

        {/* Memory */}
        {showMemory && farmer && <MemoryPanel farmerId={farmerId} />}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center px-4 sm:px-8 lg:px-12 py-3">
              <div className="w-full max-w-5xl text-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  className={`group relative w-24 h-24 sm:w-28 sm:h-28 rounded-[1.9rem] flex items-center justify-center mx-auto mb-3 shadow-[0_18px_40px_rgba(22,163,74,0.22)] transition-all duration-300 ${
                    isRecording
                      ? 'bg-gradient-to-br from-farm-400 via-farm-500 to-farm-600 text-white listening-mic'
                      : isTranscribing
                        ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
                        : 'bg-gradient-to-br from-farm-700 via-farm-800 to-farm-900 text-white hover:scale-105 hover:shadow-[0_24px_60px_rgba(20,83,45,0.4)]'
                  }`}
                  aria-label={isRecording ? t('chatRecording') : t('chatPlaceholder')}
                >
                  {isRecording && (
                    <>
                      <span className="absolute inset-[-7px] rounded-[2.2rem] border-2 border-farm-500/40 listening-ring" />
                      <span className="absolute inset-[-14px] rounded-[2.5rem] border-2 border-farm-400/25 listening-ring listening-ring-delay" />
                    </>
                  )}
                  <span className="absolute inset-0 rounded-[1.9rem] bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-2 rounded-[1.45rem] border border-white/20" />
                  {isTranscribing ? (
                    <Loader2 size={46} className="relative z-10 animate-spin sm:size-[52px]" />
                  ) : isRecording ? (
                    <Mic size={46} strokeWidth={2.4} className="relative z-10 drop-shadow-sm sm:size-[52px]" />
                  ) : (
                    <Mic size={46} strokeWidth={2.4} className="relative z-10 drop-shadow-sm sm:size-[52px]" />
                  )}
                </button>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{t('chatWelcome')}</h2>
                <p className="text-base sm:text-xl text-gray-700 max-w-4xl mx-auto mb-4 leading-relaxed">
                  {t('chatWelcomeDesc')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-3 max-w-5xl mx-auto">
                  {[
                    { icon: <WifiOff size={20} />, label: t('chatOfflineBadge') },
                    { icon: <Brain size={20} />, label: t('chatMemoryBadge') },
                    { icon: <Globe size={20} />, label: t('chatLanguageBadge') },
                    { icon: <Sparkles size={20} />, label: t('chatAccentBadge') },
                  ].map(b => (
                    <span key={b.label} className="flex items-center justify-center gap-2 text-[11px] sm:text-sm bg-white text-farm-700 px-3 sm:px-5 py-1.5 sm:py-2 min-w-[120px] sm:min-w-[140px] rounded-full border border-farm-200 shadow-sm">
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 max-w-4xl mx-auto w-full">
                  {t('chatSuggestions').map(q => (
                    <button key={q} onClick={() => setInputText(q)}
                      className="text-xs sm:text-base px-4 sm:px-6 py-2.5 sm:py-3 min-h-[46px] sm:min-h-[54px] bg-farm-700 border border-farm-800 rounded-[1.1rem] sm:rounded-[1.35rem] text-white hover:bg-farm-800 hover:border-farm-900 transition-all shadow-sm">
                      {q}
                    </button>
                  ))}
                </div>
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
        <div className="bg-white/85 backdrop-blur-lg border-t border-gray-200/60 px-4 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 w-full max-w-none mx-auto">
            <button onClick={toggleRecording} disabled={isTranscribing}
              className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shrink-0 shadow-sm ${
                isRecording ? 'bg-red-500 text-white mic-recording shadow-red-200'
                : isTranscribing ? 'bg-amber-100 text-amber-600'
                : 'bg-farm-600 text-white hover:bg-farm-700'
              }`}>
              {isTranscribing ? <Loader2 size={24} className="animate-spin" />
               : isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isRecording ? t('chatRecording') : isTranscribing ? t('chatTranscribing') : t('chatPlaceholder')}
              className="flex-1 min-w-0 px-5 py-3 border border-gray-200 rounded-[1.5rem] focus:ring-2 focus:ring-farm-500 focus:border-transparent focus:outline-none text-base bg-gray-50"
              disabled={isLoading || isTranscribing} />
            <button onClick={handleSend} disabled={!inputText.trim() || isLoading}
              className="w-14 h-14 rounded-[1.5rem] bg-farm-600 text-white flex items-center justify-center hover:bg-farm-700 disabled:opacity-30 transition-all shrink-0 shadow-sm">
              <Send size={22} />
            </button>
          </div>
          {(isRecording || isTranscribing) && (
            <p className="text-center text-sm mt-2 text-gray-500">
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
