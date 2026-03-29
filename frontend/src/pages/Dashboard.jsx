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
    <div className="page-crop-bg flex items-center justify-center h-[calc(100dvh-64px)]">
      <div className="w-full max-w-7xl px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="market-shimmer h-8 w-64 rounded-full" />
            <div className="market-shimmer h-4 w-52 rounded-full" />
          </div>
          <div className="market-shimmer h-10 w-36 rounded-full" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="market-shimmer h-4 w-24 rounded-full" />
                <div className="market-shimmer h-4 w-4 rounded-full" />
              </div>
              <div className="market-shimmer h-10 w-20 rounded-2xl" />
            </div>
          ))}
        </div>

        <div className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="market-shimmer h-6 w-36 rounded-full" />
            <div className="market-shimmer h-8 w-40 rounded-full" />
          </div>
          <div className="market-shimmer h-32 w-full rounded-2xl mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="market-shimmer h-3 w-10 rounded-full mx-auto" />
                <div className="market-shimmer h-4 w-4 rounded-full mx-auto" />
                <div className="market-shimmer h-3 w-8 rounded-full mx-auto" />
                <div className="market-shimmer h-3 w-8 rounded-full mx-auto" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 h-80 shadow-sm" />
          <div className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 h-80 shadow-sm" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-crop-bg min-h-[calc(100dvh-64px)]">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashTitle')}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{t('dashSubtitle')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-full border border-green-200">
            <WifiOff size={12} />
            {t('dashOffline')}
          </div>
        </div>

        <div className="dashboard-section-enter" style={{ animationDelay: '40ms' }}>
          <StatsCards stats={stats} outbreakCount={outbreaks.length} />
        </div>
        <div className="dashboard-section-enter" style={{ animationDelay: '110ms' }}>
          <WeatherWidget />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 dashboard-section-enter" style={{ animationDelay: '180ms' }}>
            <OutbreakMap farms={farms} outbreaks={outbreaks} />
          </div>
          <div className="dashboard-section-enter" style={{ animationDelay: '240ms' }}>
            <AlertFeed alerts={alerts} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="dashboard-section-enter" style={{ animationDelay: '300ms' }}>
            <DiseaseChart topDiseases={stats?.top_diseases || []} />
          </div>
          <div className="dashboard-section-enter" style={{ animationDelay: '360ms' }}>
            <FarmList farms={farms} />
          </div>
        </div>
      </div>
    </div>
  )
}
