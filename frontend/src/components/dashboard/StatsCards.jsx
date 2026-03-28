import { useLanguage } from '../../lib/LanguageContext'
import { Activity, AlertTriangle, MessageSquare, Users } from 'lucide-react'

export default function StatsCards({ stats, outbreakCount }) {
  const { t } = useLanguage()
  if (!stats) return null

  const cards = [
    { label: t('totalFarms'), value: stats.total_farms, icon: Users, color: 'text-farm-600', bg: 'from-farm-50 to-green-50', border: 'border-farm-200' },
    { label: t('activeOutbreaks'), value: outbreakCount, icon: AlertTriangle, color: 'text-red-600', bg: 'from-red-50 to-orange-50', border: 'border-red-200' },
    { label: t('diseaseReports'), value: stats.active_disease_reports, icon: Activity, color: 'text-orange-600', bg: 'from-orange-50 to-amber-50', border: 'border-orange-200' },
    { label: t('alertsSent'), value: stats.alerts_sent_this_week, icon: MessageSquare, color: 'text-blue-600', bg: 'from-blue-50 to-sky-50', border: 'border-blue-200' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map(card => (
        <div key={card.label} className={`bg-gradient-to-br ${card.bg} rounded-2xl border ${card.border} p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">{card.label}</span>
            <card.icon size={16} className={card.color} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
