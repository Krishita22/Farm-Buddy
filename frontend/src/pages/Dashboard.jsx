import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { api } from '../lib/api'
import StatsCards from '../components/dashboard/StatsCards'
import OutbreakMap from '../components/dashboard/OutbreakMap'
import DiseaseChart from '../components/dashboard/DiseaseChart'
import AlertFeed from '../components/dashboard/AlertFeed'
import FarmList from '../components/dashboard/FarmList'
import WeatherWidget from '../components/dashboard/WeatherWidget'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { Wifi, WifiOff } from 'lucide-react'

export default function Dashboard() {
  const { t } = useLanguage()
  const { region } = useUser()
  const [stats, setStats] = useState(null)
  const [outbreaks, setOutbreaks] = useState([])
  const [farms, setFarms] = useState([])
  const [alerts, setAlerts] = useState([])
  const [, setTimeline] = useState([])
  const [liveAlerts, setLiveAlerts] = useState([])
  const [livePrices, setLivePrices] = useState([])
  const isOnline = useOnlineStatus()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Always load local/cached data
        const [s, o, f, a, tl] = await Promise.all([
          api.getStats(), api.getOutbreaks(), api.getFarms(), api.getAlerts(), api.getDiseaseTimeline(),
        ])
        setStats(s); setOutbreaks(o); setFarms(f); setAlerts(a); setTimeline(tl)

        // If online, also fetch real-time data
        if (navigator.onLine) {
          const state = region?.name?.split(',')[0] || undefined
          const [prices, realAlerts] = await Promise.allSettled([
            api.getLivePrices(state),
            api.getLiveAlerts(region?.code),
          ])
          if (prices.status === 'fulfilled' && prices.value.prices?.length) {
            setLivePrices(prices.value.prices)
          }
          if (realAlerts.status === 'fulfilled' && realAlerts.value.alerts?.length) {
            setLiveAlerts(realAlerts.value.alerts)
          }
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [region])

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

  // Merge live alerts with local alerts
  const allAlerts = [
    ...liveAlerts.map(a => ({
      alert_type: a.type || 'weather',
      content: `${a.title} — ${a.description}`,
      farmer_name: a.source || 'Live',
      sent_at: a.date || new Date().toISOString(),
    })),
    ...alerts,
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashTitle')}</h1>
          <p className="text-xs sm:text-sm text-gray-400">{region?.name || ''} — {stats?.total_farms || 0} {t('totalFarms').toLowerCase()}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${
          isOnline
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? t('liveData') : t('dashOffline')}
        </div>
      </div>

      <StatsCards stats={stats} outbreakCount={outbreaks.length} />
      <WeatherWidget />

      {/* Live market prices when online */}
      {livePrices.length > 0 && (
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-green-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('navMarket')} — {t('liveData')}</h3>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">data.gov.in</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('crops')}</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('navMarket')}</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Min</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Max</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Modal</th>
                </tr>
              </thead>
              <tbody>
                {livePrices.filter(p => (p.commodity || p.crop_name)).slice(0, 10).map((p, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-farm-50/30">
                    <td className="px-3 py-2 font-medium text-gray-900">{p.commodity || p.crop_name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.market ? `${p.market}, ${p.state}` : p.region}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{p.min_price || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{p.max_price || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-farm-700">{p.modal_price || `₹${p.price_per_kg}/kg`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2"><OutbreakMap farms={farms} outbreaks={outbreaks} /></div>
        <div><AlertFeed alerts={allAlerts} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <DiseaseChart topDiseases={stats?.top_diseases || []} />
        <FarmList farms={farms} />
      </div>
    </div>
  )
}
