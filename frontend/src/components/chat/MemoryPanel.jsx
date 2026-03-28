import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { Brain } from 'lucide-react'
import { api } from '../../lib/api'

export default function MemoryPanel({ farmerId }) {
  const { t } = useLanguage()
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!farmerId) return
    setLoading(true)
    api.getFarmerMemory(farmerId).then(setMemory).catch(() => setMemory(null)).finally(() => setLoading(false))
  }, [farmerId])

  return (
    <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Brain size={13} className="text-purple-600" />
        <h4 className="text-xs font-semibold text-purple-600">{t('memoryTitle')}</h4>
        <span className="text-xs text-purple-300 ml-auto">{t('memoryPowered')}</span>
      </div>
      {loading ? (
        <p className="text-xs text-gray-400">{t('memoryLoading')}</p>
      ) : memory?.context ? (
        <div className="text-xs text-gray-600 leading-relaxed max-h-28 overflow-y-auto">
          {memory.context.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className={line.startsWith('-') ? 'ml-2 text-gray-500' : 'font-medium text-gray-700 mt-1'}>{line}</p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">{t('memoryEmpty')}</p>
      )}
    </div>
  )
}
