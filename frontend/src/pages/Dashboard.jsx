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
import { AlertTriangle, X } from 'lucide-react'

export default function Dashboard() {
  const { lang, t } = useLanguage()
  const { region } = useUser()
  const [stats, setStats] = useState(null)
  const [outbreaks, setOutbreaks] = useState([])
  const [farms, setFarms] = useState([])
  const [alerts, setAlerts] = useState([])
  const [, setTimeline] = useState([])
  const [liveAlerts, setLiveAlerts] = useState([])
  const [regionalPrices, setRegionalPrices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [reportCrop, setReportCrop] = useState('')
  const [reportDisease, setReportDisease] = useState('')
  const [reportSeverity, setReportSeverity] = useState('moderate')
  const [reportMsg, setReportMsg] = useState('')

  const handleReport = async () => {
    if (!reportCrop || !reportDisease) return
    try {
      const res = await fetch('/api/dashboard/report-outbreak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_name: reportCrop,
          disease_name: reportDisease,
          severity: reportSeverity,
          latitude: region?.lat,
          longitude: region?.lng,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setReportMsg('Reported! Refreshing data...')
        setReportCrop(''); setReportDisease(''); setReportSeverity('moderate')
        // Reload dashboard data to show the new report
        setTimeout(async () => {
          setReportMsg(''); setShowReport(false)
          const [s, o, a] = await Promise.all([api.getStats(), api.getOutbreaks(), api.getAlerts()])
          setStats(s); setOutbreaks(o); setAlerts(a)
        }, 1000)
      }
    } catch { setReportMsg('Failed to report') }
  }

  useEffect(() => {
    async function load() {
      try {
        // Always load local/cached data
        const [s, o, f, a, tl] = await Promise.all([
          api.getStats(), api.getOutbreaks(), api.getFarms(), api.getAlerts(), api.getDiseaseTimeline(),
        ])
        setStats(s); setOutbreaks(o); setFarms(f); setAlerts(a); setTimeline(tl)

        // Fetch regional prices (works for all regions)
        if (region?.code) {
          const rp = await api.getRegionalPrices(region.code).catch(() => null)
          if (rp?.prices?.length) setRegionalPrices(rp)
        }

        // If online, also fetch live data
        if (navigator.onLine) {
          const [realAlerts] = await Promise.allSettled([
            api.getLiveAlerts(region?.code),
          ])
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
    <div className="page-crop-bg flex items-center justify-center h-[calc(100dvh-56px)]">
      <div className="w-full max-w-7xl px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="market-shimmer h-8 w-64 rounded-full" />
            <div className="market-shimmer h-4 w-52 rounded-full" />
          </div>
          <div className="market-shimmer h-10 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="market-shimmer h-4 w-24 rounded-full" />
                <div className="market-shimmer h-4 w-4 rounded-full" />
              </div>
              <div className="market-shimmer h-10 w-20 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 h-40 shadow-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 h-80 shadow-sm" />
          <div className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 h-80 shadow-sm" />
        </div>
      </div>
    </div>
  )

  // Merge live alerts with local alerts
  const allAlerts = [
    ...liveAlerts.map(a => ({
      alert_type: a.type || 'weather',
      content: `${a.title} ·${a.description}`,
      farmer_name: a.source || 'Live',
      sent_at: a.date || new Date().toISOString(),
    })),
    ...alerts,
  ]

  return (
    <div className="page-crop-bg min-h-[calc(100dvh-56px)]"><div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashTitle')}</h1>
          <p className="text-xs sm:text-sm text-gray-700">{region?.name || ''} -{stats?.total_farms || 0} {t('totalFarms').toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
            <AlertTriangle size={12} /> {t('reportOutbreak')}
          </button>
        </div>
      </div>

      {/* Report Outbreak Form */}
      {showReport && (
        <div className="dashboard-section-enter bg-white rounded-2xl border border-red-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> {t('reportOutbreak')}</h3>
            <button onClick={() => setShowReport(false)} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('cropLabel')}</label>
              <input type="text" value={reportCrop} onChange={e => setReportCrop(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-red-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('diseasePest')}</label>
              <input type="text" value={reportDisease} onChange={e => setReportDisease(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-red-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('severity')}</label>
              <select value={reportSeverity} onChange={e => setReportSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-red-400 focus:outline-none">
                <option value="mild">{t('mild')}</option>
                <option value="moderate">{t('moderate')}</option>
                <option value="severe">{t('severe')}</option>
              </select>
            </div>
          </div>
          {reportMsg && <p className="text-xs text-green-600 mt-2">{reportMsg}</p>}
          <button onClick={handleReport} disabled={!reportCrop || !reportDisease}
            className="mt-3 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
            {t('submitReport')}
          </button>
        </div>
      )}

      <div className="dashboard-section-enter" style={{ animationDelay: '40ms' }}>
        <StatsCards stats={stats} outbreakCount={outbreaks.length} />
      </div>
      <div className="dashboard-section-enter" style={{ animationDelay: '110ms' }}>
        <WeatherWidget />
      </div>

      {/* Market prices — all regions */}
      {regionalPrices?.prices?.length > 0 && (
        <div className="dashboard-section-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm overflow-hidden" style={{ animationDelay: '180ms' }}>
          <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('cropPrices')} - {region?.i18n?.[lang] || region?.name}</h3>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">{regionalPrices.currency}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('cropLabel')}</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('navMarket')}</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">{t('pricePerUnit')}/{regionalPrices.unit}</th>
                </tr>
              </thead>
              <tbody>
                {regionalPrices.prices.map((p, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-farm-50/30 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{p.crop}</td>
                    <td className="px-3 py-2.5 text-gray-500">{p.market}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-farm-700">{regionalPrices.currency} {p.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 dashboard-section-enter" style={{ animationDelay: '180ms' }}><OutbreakMap farms={farms} outbreaks={outbreaks} /></div>
        <div className="dashboard-section-enter" style={{ animationDelay: '240ms' }}><AlertFeed alerts={allAlerts} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="dashboard-section-enter" style={{ animationDelay: '300ms' }}><DiseaseChart topDiseases={stats?.top_diseases || []} /></div>
        <div className="dashboard-section-enter" style={{ animationDelay: '360ms' }}><FarmList farms={farms} /></div>
      </div>
    </div></div>
  )
}
