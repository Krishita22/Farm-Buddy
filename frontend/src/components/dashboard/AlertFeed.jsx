import { useLanguage } from '../../lib/LanguageContext'
import { Bell, CloudRain, TrendingDown, Bug, Lightbulb } from 'lucide-react'

const ALERT_ICONS = { weather: CloudRain, price_drop: TrendingDown, outbreak: Bug, weekly_tip: Lightbulb }
const ALERT_COLORS = { weather: 'text-blue-500 bg-blue-50', price_drop: 'text-orange-500 bg-orange-50', outbreak: 'text-red-500 bg-red-50', weekly_tip: 'text-green-500 bg-green-50' }

export default function AlertFeed({ alerts }) {
  const { t } = useLanguage()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Bell size={15} className="text-gray-400" />
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('recentAlerts')}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">{alerts.length}</span>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {alerts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{t('noData')}</p>
        ) : alerts.map(alert => {
          const Icon = ALERT_ICONS[alert.alert_type] || Bell
          const colorClass = ALERT_COLORS[alert.alert_type] || 'text-gray-500 bg-gray-50'
          return (
            <div key={alert.id} className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}><Icon size={13} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2">{alert.content}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{alert.farmer_name} &middot; {alert.sent_at}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
