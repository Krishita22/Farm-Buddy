import { useEffect, useRef } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useUser } from '../../lib/UserContext'
import { DISEASE_COLORS } from '../../lib/constants'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function OutbreakMap({ farms, outbreaks }) {
  const { lang, t } = useLanguage()
  const { region } = useUser()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !region) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current).setView([region.lat, region.lng], 11)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    const outbreakFarmerIds = new Set(outbreaks.flatMap(o => o.affected_farmer_ids || []))

    // Farm dots
    const farmsWithCoords = farms.filter(f => f.latitude && f.longitude)
    farmsWithCoords.forEach(farm => {
      const isAffected = outbreakFarmerIds.has(farm.id)
      const color = isAffected ? '#ef4444' : farm.recent_issues > 0 ? '#f97316' : '#4ade80'
      L.circleMarker([farm.latitude, farm.longitude], {
        radius: isAffected ? 7 : 5,
        color,
        fillColor: color,
        fillOpacity: isAffected ? 0.9 : 0.6,
        weight: 1,
      }).addTo(map).bindPopup(
        `<b>${farm.name}</b><br/>${farm.village || ''}<br/>` +
        (farm.active_crops ? `${farm.active_crops}<br/>` : '') +
        (farm.recent_issues > 0 ? `<span style="color:red">${farm.recent_issues} ${t('issues').toLowerCase()}</span>` : `<span style="color:green">${t('healthy')}</span>`)
      )
    })

    // Outbreak zones
    outbreaks.forEach(ob => {
      if (!ob.center_lat || !ob.center_lng) return
      const color = DISEASE_COLORS[ob.disease_name] || '#ef4444'
      L.circle([ob.center_lat, ob.center_lng], {
        radius: Math.max(500, ob.farm_count * 200),
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '8,4',
      }).addTo(map).bindPopup(
        `<b>${ob.disease_name.replace(/_/g, ' ')}</b><br/>` +
        `${ob.farm_count} ${t('totalFarms').toLowerCase()} · ${ob.report_count} ${t('diseaseReports').toLowerCase()}<br/>` +
        `${t('crops')}: ${ob.crop}`
      )
    })

    // Fit bounds
    const points = [
      [region.lat, region.lng],
      ...farmsWithCoords.map(f => [f.latitude, f.longitude]),
    ]
    if (points.length > 1) {
      map.fitBounds(points, { padding: [20, 20], maxZoom: 13 })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [region?.lat, farms.length, outbreaks.length])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('farmMap')}</h3>
          <p className="text-xs text-gray-400">{region?.i18n?.[lang] || region?.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> {t('healthy')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('atRisk')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('outbreak')}</span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: '350px', width: '100%' }} />
    </div>
  )
}
