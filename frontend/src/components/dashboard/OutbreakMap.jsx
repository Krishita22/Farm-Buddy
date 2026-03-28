import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { DISEASE_COLORS } from '../../lib/constants'

export default function OutbreakMap({ farms, outbreaks }) {
  const { t } = useLanguage()
  const [selectedOutbreak, setSelectedOutbreak] = useState(null)
  const [hoveredFarm, setHoveredFarm] = useState(null)

  const lats = farms.map(f => f.latitude).filter(Boolean)
  const lngs = farms.map(f => f.longitude).filter(Boolean)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 1, lngRange = maxLng - minLng || 1
  const toX = (lng) => ((lng - minLng) / lngRange) * 100
  const toY = (lat) => (1 - (lat - minLat) / latRange) * 100
  const outbreakFarmerIds = new Set(outbreaks.flatMap(o => o.affected_farmer_ids))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('farmMap')}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> {t('healthy')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('atRisk')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('outbreak')}</span>
        </div>
      </div>

      <div className="relative w-full" style={{ paddingBottom: '55%', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)' }}>
        <svg viewBox="-5 -5 110 110" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          {[0,25,50,75,100].map(v => (
            <g key={v}>
              <line x1={v} y1={0} x2={v} y2={100} stroke="#e5e7eb" strokeWidth="0.15" />
              <line x1={0} y1={v} x2={100} y2={v} stroke="#e5e7eb" strokeWidth="0.15" />
            </g>
          ))}
          {outbreaks.map((ob, i) => {
            const cx = toX(ob.center_lng), cy = toY(ob.center_lat)
            const color = DISEASE_COLORS[ob.disease_name] || '#ef4444'
            return (
              <g key={`ob-${i}`}>
                <circle cx={cx} cy={cy} r={Math.max(8, ob.farm_count)} fill={color} fillOpacity={0.12} stroke={color} strokeWidth="0.4" strokeDasharray="2,1" className="cursor-pointer" onClick={() => setSelectedOutbreak(selectedOutbreak === i ? null : i)} />
                <circle cx={cx} cy={cy} r={1.5} fill={color} fillOpacity={0.7} />
              </g>
            )
          })}
          {farms.map(farm => {
            if (!farm.latitude || !farm.longitude) return null
            const isAffected = outbreakFarmerIds.has(farm.id)
            return (
              <circle key={farm.id} cx={toX(farm.longitude)} cy={toY(farm.latitude)} r={isAffected ? 1.1 : 0.7}
                fill={isAffected ? '#ef4444' : farm.recent_issues > 0 ? '#f97316' : '#4ade80'}
                fillOpacity={isAffected ? 0.9 : 0.6} className="cursor-pointer"
                onMouseEnter={() => setHoveredFarm(farm)} onMouseLeave={() => setHoveredFarm(null)} />
            )
          })}
        </svg>

        {hoveredFarm && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-2.5 text-xs z-10 min-w-44 border border-gray-100">
            <p className="font-semibold text-gray-900">{hoveredFarm.name}</p>
            <p className="text-gray-400">{hoveredFarm.village}</p>
            {hoveredFarm.active_crops && <p className="text-gray-500 mt-0.5">{hoveredFarm.active_crops}</p>}
            {hoveredFarm.recent_issues > 0 && <p className="text-red-500 mt-0.5 font-medium">{hoveredFarm.recent_issues} issue(s)</p>}
          </div>
        )}

        {selectedOutbreak !== null && outbreaks[selectedOutbreak] && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs z-10 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{outbreaks[selectedOutbreak].disease_name.replace(/_/g, ' ')}</p>
                <p className="text-gray-400">{outbreaks[selectedOutbreak].farm_count} farms &middot; {outbreaks[selectedOutbreak].report_count} reports &middot; {outbreaks[selectedOutbreak].crop}</p>
              </div>
              <button onClick={() => setSelectedOutbreak(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">&times;</button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {Object.entries(outbreaks[selectedOutbreak].severity_distribution || {}).map(([sev, count]) => (
                <span key={sev} className={`px-2 py-0.5 rounded-full font-medium ${sev === 'severe' ? 'bg-red-100 text-red-700' : sev === 'moderate' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{sev}: {count}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
