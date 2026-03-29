import { useLanguage } from '../../lib/LanguageContext'
import { useUser } from '../../lib/UserContext'
import { DISEASE_COLORS } from '../../lib/constants'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function OutbreakMap({ farms, outbreaks }) {
  const { lang, t } = useLanguage()
  const { region } = useUser()

  const center = [region?.lat || 22.31, region?.lng || 72.13]
  const outbreakFarmerIds = new Set(outbreaks.flatMap(o => o.affected_farmer_ids || []))
  const farmsWithCoords = farms.filter(f => f.latitude && f.longitude)

  return (
    <div className="bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('farmMap')}</h3>
          <p className="text-xs text-gray-500">{region?.i18n?.[lang] || region?.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> {t('healthy')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> {t('atRisk')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {t('outbreak')}</span>
        </div>
      </div>
      <MapContainer center={center} zoom={10} style={{ height: '350px', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Outbreak zones */}
        {outbreaks.map((ob, i) => {
          if (!ob.center_lat || !ob.center_lng) return null
          const color = DISEASE_COLORS[ob.disease_name] || '#ef4444'
          return (
            <Circle key={`ob-${i}`} center={[ob.center_lat, ob.center_lng]}
              radius={Math.max(500, ob.farm_count * 200)}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2, dashArray: '8,4' }}>
              <Popup>
                <b>{ob.disease_name.replace(/_/g, ' ')}</b><br />
                {ob.farm_count} farms -{ob.report_count} reports<br />
                Crop: {ob.crop}
              </Popup>
            </Circle>
          )
        })}

        {/* Farm dots */}
        {farmsWithCoords.map(farm => {
          const isAffected = outbreakFarmerIds.has(farm.id)
          const color = isAffected ? '#ef4444' : farm.recent_issues > 0 ? '#f97316' : '#4ade80'
          return (
            <CircleMarker key={farm.id} center={[farm.latitude, farm.longitude]}
              radius={isAffected ? 7 : 5}
              pathOptions={{ color, fillColor: color, fillOpacity: isAffected ? 0.9 : 0.6, weight: 1 }}>
              <Popup>
                <b>{farm.name}</b><br />
                {farm.village || ''}<br />
                {farm.active_crops && <>{farm.active_crops}<br /></>}
                {farm.recent_issues > 0
                  ? <span style={{ color: 'red' }}>{farm.recent_issues} issues</span>
                  : <span style={{ color: 'green' }}>Healthy</span>}
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
