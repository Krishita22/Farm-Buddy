import { useLanguage } from '../../lib/LanguageContext'
import { Droplets, Mountain, Ruler, Sprout } from 'lucide-react'

export default function FarmerProfile({ farmer }) {
  const { t } = useLanguage()
  if (!farmer) return null

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="text-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center mx-auto mb-2 shadow-lg">
          <span className="text-2xl">👨‍🌾</span>
        </div>
        <h3 className="font-bold text-gray-900">{farmer.name}</h3>
        <p className="text-xs text-gray-400">{farmer.village}, {farmer.district}</p>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 text-sm bg-gray-50 rounded-xl px-3 py-2">
          <Ruler size={14} className="text-gray-400" />
          <span className="text-gray-600">{farmer.farm_size_acres} {t('acres')}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm bg-gray-50 rounded-xl px-3 py-2">
          <Mountain size={14} className="text-gray-400" />
          <span className="text-gray-600">{farmer.soil_type} {t('soil')} (pH {farmer.soil_ph})</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm bg-gray-50 rounded-xl px-3 py-2">
          <Droplets size={14} className="text-gray-400" />
          <span className="text-gray-600">{farmer.irrigation_type}</span>
        </div>
      </div>
      {farmer.crops?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">{t('crops')}</h4>
          <div className="space-y-1.5">
            {farmer.crops.map(crop => (
              <div key={crop.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-3 py-1.5">
                <Sprout size={13} className={crop.status === 'growing' ? 'text-green-500' : crop.status === 'harvested' ? 'text-yellow-500' : 'text-red-400'} />
                <span className="text-gray-700 flex-1">{crop.crop_name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${crop.status === 'growing' ? 'bg-green-50 text-green-600' : crop.status === 'harvested' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                  {t(crop.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {farmer.recent_conversations?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">{t('memory')}</h4>
          {farmer.recent_conversations.map(conv => (
            <div key={conv.id} className="p-2 bg-purple-50 rounded-xl text-xs text-purple-700 mb-1.5">
              {conv.summary || conv.created_at}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
