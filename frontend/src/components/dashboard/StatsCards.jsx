import { useLanguage } from '../../lib/LanguageContext'
import { Activity, AlertTriangle, MessageSquare, Users } from 'lucide-react'

export default function StatsCards({ stats, outbreakCount }) {
  const { t } = useLanguage()
  if (!stats) return null

  const totalReports = (stats.active_disease_reports || 0) + outbreakCount

  const cards = [
    { label: t('totalFarms'), value: stats.total_farms, icon: Users, color: 'text-farm-600', bg: 'from-farm-50 to-green-50', border: 'border-farm-200' },
    { label: 'Disease Reports', value: totalReports, icon: Activity, color: 'text-red-600', bg: 'from-red-50 to-orange-50', border: 'border-red-200' },
    { label: 'Crops Tracked', value: stats.crops_count || 0, icon: MessageSquare, color: 'text-blue-600', bg: 'from-blue-50 to-sky-50', border: 'border-blue-200' },
    { label: t('alertsSent'), value: stats.alerts_sent_this_week, icon: AlertTriangle, color: 'text-amber-600', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-200' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map(card => (
        <div key={card.label} className={`market-card-enter bg-gradient-to-br ${card.bg} rounded-2xl border ${card.border} p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-300`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">{card.label}</span>
            <card.icon size={16} className={card.color} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
