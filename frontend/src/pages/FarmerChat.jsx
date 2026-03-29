/**
 * Farmer chat page — voice-first conversational interface with the AI farming assistant.
 * Supports mic recording, text input, auto-send after transcription, and audio playback.
 */
import { useState, useEffect, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import MessageBubble from '../components/chat/MessageBubble'
import { Mic, Send, Loader2 } from 'lucide-react'

export default function FarmerChat() {
  const { lang, t, languages } = useLanguage()
  const { user } = useUser()
  const farmerId = user?.farmer_id || 1
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  const langConfig = languages.find(l => l.code === lang) || languages[0]
  const { messages, isLoading, sendMessage, clearMessages } = useChat(farmerId, lang)
  const { isRecording, isTranscribing, transcript, startRecording, stopRecording, setTranscript } = useVoiceRecorder(lang)
  const { isPlaying, playAudio, speakText, stop: stopAudio } = useAudioPlayer()

  // Stop audio when leaving chat
  useEffect(() => { return () => stopAudio() }, [stopAudio])
  useEffect(() => { clearMessages() }, [lang, clearMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (transcript && !transcript.startsWith('[')) setInputText(transcript) }, [transcript])

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

  const toggleRecording = () => isRecording ? stopRecording() : startRecording()

  useEffect(() => {
    if (!isTranscribing && transcript && !isRecording && inputText === transcript) {
      const timer = setTimeout(() => { if (inputText.trim()) handleSend() }, 800)
      return () => clearTimeout(timer)
    }
  }, [isTranscribing, transcript, isRecording])

  return (
    <div className="page-crop-bg flex flex-col h-[calc(100dvh-80px)] overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-6 slide-up px-4">
              {/* Mic button with hint animations */}
              <div className="flex flex-col items-center gap-3">
                <button type="button" onClick={toggleRecording} disabled={isTranscribing}
                  className={`group relative w-32 h-32 sm:w-36 sm:h-36 rounded-[2.2rem] flex items-center justify-center transition-all duration-700 ease-out ${
                    isRecording
                      ? 'bg-gradient-to-br from-farm-500 to-farm-700 text-white listening-mic shadow-[0_16px_50px_rgba(22,101,52,0.35)]'
                      : isTranscribing
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_16px_40px_rgba(217,119,6,0.3)]'
                        : 'bg-gradient-to-br from-farm-700 to-farm-900 text-white hover:scale-105 shadow-[0_16px_50px_rgba(22,101,52,0.25)] mic-hint-pulse'
                  }`}>
                  {/* Ripple rings — always visible when idle to draw attention */}
                  {!isRecording && !isTranscribing && (
                    <>
                      <span className="absolute inset-[-6px] rounded-[2.5rem] border-2 border-farm-500/20 mic-hint-ring" />
                      <span className="absolute inset-[-14px] rounded-[2.8rem] border border-farm-400/10 mic-hint-ring mic-hint-ring-delay" />
                    </>
                  )}
                  {isRecording && (
                    <>
                      <span className="absolute inset-[-8px] rounded-[2.6rem] border border-farm-500/30 listening-ring" />
                      <span className="absolute inset-[-18px] rounded-[3rem] border border-farm-400/15 listening-ring listening-ring-delay" />
                    </>
                  )}
                  {isTranscribing ? <Loader2 size={56} className="relative z-10 animate-spin" />
                    : <Mic size={56} strokeWidth={1.8} className="relative z-10 drop-shadow-md" />}
                </button>
                {/* Tap hint text */}
                {!isRecording && !isTranscribing && (
                  <span className="text-sm text-gray-400 mic-hint-text">{t('chatTapToSpeak')}</span>
                )}
                {isRecording && (
                  <span className="text-sm text-farm-600 font-medium animate-pulse">{t('chatRecording')}</span>
                )}
              </div>

              {/* Title */}
              {(
                <div className="text-center">
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">{t('chatWelcome')}</h2>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">{t('chatWelcomeDesc')}</p>
                </div>
              )}

              {/* Suggestions */}
              {(
                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-xl">
                  {(t('chatSuggestions') || []).slice(0, 4).map(q => (
                    <button key={q} onClick={() => setInputText(q)}
                      className="text-sm sm:text-base px-6 py-4 bg-farm-700/90 backdrop-blur-sm border border-farm-800/50 rounded-2xl text-white hover:bg-farm-800 hover:-translate-y-1 hover:shadow-lg btn-press transition-all duration-200 shadow-md text-center leading-snug">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              {(
                <div className="flex items-center gap-2.5 w-full">
                  <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={isTranscribing ? t('chatTranscribing') : t('chatPlaceholder')}
                    className="flex-1 px-6 py-4 border border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-farm-500 focus:border-transparent focus:outline-none text-base bg-white/80 backdrop-blur-sm shadow-sm"
                    disabled={isLoading || isTranscribing} />
                  <button onClick={handleSend} disabled={!inputText.trim() || isLoading}
                    className="w-13 h-13 p-3.5 rounded-2xl bg-farm-600 text-white flex items-center justify-center hover:bg-farm-700 disabled:opacity-30 btn-press transition-all shrink-0 shadow-sm">
                    <Send size={22} />
                  </button>
                </div>
              )}
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
          <div className="flex items-end gap-2 msg-left">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-farm-500 to-farm-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">🌾</div>
            <div className="glass-card !bg-white/95 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="typing-dots"><span /><span /><span /></span>
                {t('chatThinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — only shows when there are messages (welcome has its own inline input) */}
      {messages.length > 0 && (
        <div className="px-4 sm:px-6 py-3 mb-4">
          <div className="flex items-center gap-2 max-w-xl mx-auto">
            <button onClick={toggleRecording} disabled={isTranscribing}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 shadow-sm btn-press ${
                isRecording ? 'bg-gradient-to-br from-farm-500 to-farm-700 text-white listening-mic shadow-[0_0_30px_rgba(22,163,74,0.4)]'
                : isTranscribing ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)]'
                : 'bg-gradient-to-br from-farm-700 to-farm-900 text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(20,83,45,0.4)]'
              }`}>
              {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isRecording ? t('chatRecording') : isTranscribing ? t('chatTranscribing') : t('chatPlaceholder')}
              className="flex-1 px-5 py-3 border border-gray-200/60 rounded-2xl focus:ring-2 focus:ring-farm-500 focus:border-transparent focus:outline-none text-sm bg-white/80 backdrop-blur-sm shadow-sm"
              disabled={isLoading || isTranscribing} />
            <button onClick={handleSend} disabled={!inputText.trim() || isLoading}
              className="w-11 h-11 rounded-2xl bg-farm-600 text-white flex items-center justify-center hover:bg-farm-700 disabled:opacity-30 btn-press transition-all shrink-0 shadow-sm">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
