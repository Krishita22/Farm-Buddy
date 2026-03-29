import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useUser } from '../../lib/UserContext'
import { DISEASE_COLORS } from '../../lib/constants'

export default function OutbreakMap({ farms, outbreaks }) {
  const { t } = useLanguage()
  const { region } = useUser()
  const [selectedOutbreak, setSelectedOutbreak] = useState(null)
  const [hoveredFarm, setHoveredFarm] = useState(null)

  // Use region center as anchor, with a geographic bounding box
  const regionLat = region?.lat || 0
  const regionLng = region?.lng || 0

  const farmsWithCoords = farms.filter(f => f.latitude && f.longitude)

  // Calculate bounds from actual farm data or use region-based defaults
  let minLat, maxLat, minLng, maxLng
  if (farmsWithCoords.length > 1) {
    const lats = farmsWithCoords.map(f => f.latitude)
    const lngs = farmsWithCoords.map(f => f.longitude)
    minLat = Math.min(...lats); maxLat = Math.max(...lats)
    minLng = Math.min(...lngs); maxLng = Math.max(...lngs)
    // Add 10% padding
    const latPad = (maxLat - minLat) * 0.1 || 0.05
    const lngPad = (maxLng - minLng) * 0.1 || 0.05
    minLat -= latPad; maxLat += latPad
    minLng -= lngPad; maxLng += lngPad
  } else {
    // Default: ~50km box around region center
    minLat = regionLat - 0.25; maxLat = regionLat + 0.25
    minLng = regionLng - 0.25; maxLng = regionLng + 0.25
  }

  const latRange = maxLat - minLat || 0.5
  const lngRange = maxLng - minLng || 0.5
  const toX = (lng) => ((lng - minLng) / lngRange) * 100
  const toY = (lat) => (1 - (lat - minLat) / latRange) * 100
  const outbreakFarmerIds = new Set(outbreaks.flatMap(o => o.affected_farmer_ids))

  // Geographic grid labels
  const gridLats = [minLat, minLat + latRange * 0.25, minLat + latRange * 0.5, minLat + latRange * 0.75, maxLat]
  const gridLngs = [minLng, minLng + lngRange * 0.25, minLng + lngRange * 0.5, minLng + lngRange * 0.75, maxLng]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('farmMap')}</h3>
          <p className="text-xs text-gray-400">{region?.name} ({regionLat.toFixed(2)}°, {regionLng.toFixed(2)}°)</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> {t('healthy')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('atRisk')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('outbreak')}</span>
        </div>
      </div>

      <div className="relative w-full" style={{ paddingBottom: '55%', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)' }}>
        <svg viewBox="-8 -5 116 115" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid with coordinate labels */}
          {[0, 25, 50, 75, 100].map((v, i) => (
            <g key={v}>
              <line x1={v} y1={0} x2={v} y2={100} stroke="#e5e7eb" strokeWidth="0.15" />
              <line x1={0} y1={v} x2={100} y2={v} stroke="#e5e7eb" strokeWidth="0.15" />
              {/* Longitude labels (bottom) */}
              <text x={v} y={108} textAnchor="middle" fill="#9ca3af" fontSize="2.5">
                {gridLngs[i].toFixed(2)}°
              </text>
              {/* Latitude labels (left) */}
              <text x={-3} y={v + 1} textAnchor="end" fill="#9ca3af" fontSize="2.5">
                {gridLats[4 - i].toFixed(2)}°
              </text>
            </g>
          ))}

          {/* Region center marker */}
          <g>
            <circle cx={toX(regionLng)} cy={toY(regionLat)} r={2} fill="none" stroke="#166534" strokeWidth="0.3" strokeDasharray="1,1" />
            <line x1={toX(regionLng) - 1.5} y1={toY(regionLat)} x2={toX(regionLng) + 1.5} y2={toY(regionLat)} stroke="#166534" strokeWidth="0.2" />
            <line x1={toX(regionLng)} y1={toY(regionLat) - 1.5} x2={toX(regionLng)} y2={toY(regionLat) + 1.5} stroke="#166534" strokeWidth="0.2" />
          </g>

          {/* Outbreak zones */}
          {outbreaks.map((ob, i) => {
            const cx = toX(ob.center_lng), cy = toY(ob.center_lat)
            const color = DISEASE_COLORS[ob.disease_name] || '#ef4444'
            return (
              <g key={`ob-${i}`}>
                <circle cx={cx} cy={cy} r={Math.max(6, ob.farm_count * 0.8)} fill={color} fillOpacity={0.12} stroke={color} strokeWidth="0.4" strokeDasharray="2,1" className="cursor-pointer" onClick={() => setSelectedOutbreak(selectedOutbreak === i ? null : i)} />
                <circle cx={cx} cy={cy} r={1.5} fill={color} fillOpacity={0.7} />
              </g>
            )
          })}

          {/* Farm dots */}
          {farmsWithCoords.map(farm => {
            const isAffected = outbreakFarmerIds.has(farm.id)
            return (
              <circle key={farm.id} cx={toX(farm.longitude)} cy={toY(farm.latitude)} r={isAffected ? 1.1 : 0.7}
                fill={isAffected ? '#ef4444' : farm.recent_issues > 0 ? '#f97316' : '#4ade80'}
                fillOpacity={isAffected ? 0.9 : 0.6} className="cursor-pointer"
                onMouseEnter={() => setHoveredFarm(farm)} onMouseLeave={() => setHoveredFarm(null)} />
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredFarm && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-2.5 text-xs z-10 min-w-44 border border-gray-100">
            <p className="font-semibold text-gray-900">{hoveredFarm.name}</p>
            <p className="text-gray-400">{hoveredFarm.village}</p>
            <p className="text-gray-300 text-[10px]">{hoveredFarm.latitude?.toFixed(4)}°, {hoveredFarm.longitude?.toFixed(4)}°</p>
            {hoveredFarm.active_crops && <p className="text-gray-500 mt-0.5">{hoveredFarm.active_crops}</p>}
            {hoveredFarm.recent_issues > 0 && <p className="text-red-500 mt-0.5 font-medium">{hoveredFarm.recent_issues} {t('issues').toLowerCase()}</p>}
          </div>
        )}

        {/* Outbreak detail panel */}
        {selectedOutbreak !== null && outbreaks[selectedOutbreak] && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs z-10 border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{outbreaks[selectedOutbreak].disease_name.replace(/_/g, ' ')}</p>
                <p className="text-gray-400">
                  {outbreaks[selectedOutbreak].farm_count} {t('totalFarms').toLowerCase()} &middot; {outbreaks[selectedOutbreak].report_count} {t('diseaseReports').toLowerCase()} &middot; {outbreaks[selectedOutbreak].crop}
                </p>
                <p className="text-gray-300 text-[10px] mt-0.5">
                  {outbreaks[selectedOutbreak].center_lat?.toFixed(4)}°, {outbreaks[selectedOutbreak].center_lng?.toFixed(4)}°
                </p>
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
