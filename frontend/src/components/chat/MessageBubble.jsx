import { useLanguage } from '../../lib/LanguageContext'
import { Volume2 } from 'lucide-react'

export default function MessageBubble({ message, onPlayAudio, isPlaying }) {
  const { t } = useLanguage()
  const isFarmer = message.role === 'farmer'

  return (
    <div className={`flex items-end gap-2 ${isFarmer ? 'flex-row-reverse' : ''} ${isFarmer ? 'msg-right' : 'msg-left'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ${
        isFarmer ? 'bg-gradient-to-br from-earth-400 to-earth-600' : 'bg-gradient-to-br from-farm-500 to-farm-700'
      }`}>
        {isFarmer ? '?' : '🌾'}
      </div>
      <div className="max-w-[80%]">
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isFarmer
            ? 'bg-gradient-to-br from-farm-600 to-farm-700 text-white rounded-br-md'
            : 'glass-card text-gray-800 rounded-bl-md !bg-white/95'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        {!isFarmer && (
          <button onClick={onPlayAudio}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-300 hover:text-farm-600 transition-colors ml-1 btn-press">
            <Volume2 size={12} />
            {isPlaying ? (
              <span className="audio-wave text-farm-600"><span /><span /><span /><span /><span /></span>
            ) : t('chatPlayAudio')}
          </button>
        )}
        {message.disease && (
          <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-full border border-red-200 ml-1 scale-in">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            {t('diseaseDetected')}: {message.disease.disease}
          </div>
        )}
      </div>
    </div>
  )
}
