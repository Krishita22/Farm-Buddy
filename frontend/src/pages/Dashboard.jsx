import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { api } from '../lib/api'
import StatsCards from '../components/dashboard/StatsCards'
import OutbreakMap from '../components/dashboard/OutbreakMap'
import DiseaseChart from '../components/dashboard/DiseaseChart'
import AlertFeed from '../components/dashboard/AlertFeed'
import FarmList from '../components/dashboard/FarmList'
import WeatherWidget from '../components/dashboard/WeatherWidget'
import { WifiOff } from 'lucide-react'

export default function Dashboard() {
  const { t } = useLanguage()
  const [stats, setStats] = useState(null)
  const [outbreaks, setOutbreaks] = useState([])
  const [farms, setFarms] = useState([])
  const [alerts, setAlerts] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, o, f, a, tl] = await Promise.all([
          api.getStats(), api.getOutbreaks(), api.getFarms(), api.getAlerts(), api.getDiseaseTimeline(),
        ])
        setStats(s); setOutbreaks(o); setFarms(f); setAlerts(a); setTimeline(tl)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100dvh-56px)]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-farm-400 to-farm-600 flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse">
          <span className="text-3xl">🌾</span>
        </div>
        <p className="text-gray-400 text-sm">{t('chatThinking')}</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashTitle')}</h1>
          <p className="text-xs sm:text-sm text-gray-400">{t('dashSubtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-full border border-green-200">
          <WifiOff size={12} />
          {t('dashOffline')}
        </div>
      </div>

      <StatsCards stats={stats} outbreakCount={outbreaks.length} />
      <WeatherWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2"><OutbreakMap farms={farms} outbreaks={outbreaks} /></div>
        <div><AlertFeed alerts={alerts} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <DiseaseChart topDiseases={stats?.top_diseases || []} />
        <FarmList farms={farms} />
      </div>
    </div>
  )
}
