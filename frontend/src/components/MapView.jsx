import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon (broken with bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TYPE_COLORS = {
  farm_supply: '#16a34a',
  market: '#d97706',
  veterinary: '#ec4899',
  hardware: '#6b7280',
  fuel: '#ef4444',
  water_well: '#3b82f6',
  canal: '#0ea5e9',
  water_tower: '#2563eb',
  irrigation_channel: '#06b6d4',
  reservoir_covered: '#1d4ed8',
}

export default function MapView({ center, places = [], waterSources = [], height = '350px' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !center) return

    // Destroy existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current).setView([center.lat, center.lng], 12)
    mapInstanceRef.current = map

    // OpenStreetMap tiles (free, cacheable)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    // User's farm location
    L.circleMarker([center.lat, center.lng], {
      radius: 10, color: '#166534', fillColor: '#22c55e', fillOpacity: 0.8, weight: 2,
    }).addTo(map).bindPopup('<b>Your Farm</b>')

    // Nearby places
    places.forEach(p => {
      if (!p.latitude || !p.longitude) return
      const color = TYPE_COLORS[p.type] || '#6b7280'
      L.circleMarker([p.latitude, p.longitude], {
        radius: 7, color, fillColor: color, fillOpacity: 0.7, weight: 1,
      }).addTo(map).bindPopup(
        `<b>${p.name}</b><br/>` +
        `<span style="color:${color}">${p.type.replace(/_/g, ' ')}</span><br/>` +
        `${p.distance_km} km away` +
        (p.phone ? `<br/><a href="tel:${p.phone}">${p.phone}</a>` : '') +
        (p.opening_hours ? `<br/>${p.opening_hours}` : '')
      )
    })

    // Water sources
    waterSources.forEach(w => {
      if (!w.latitude || !w.longitude) return
      const color = TYPE_COLORS[w.type] || '#3b82f6'
      L.circleMarker([w.latitude, w.longitude], {
        radius: 6, color, fillColor: color, fillOpacity: 0.6, weight: 1,
      }).addTo(map).bindPopup(
        `<b>${w.name}</b><br/>` +
        `<span style="color:${color}">${w.type.replace(/_/g, ' ')}</span><br/>` +
        `${w.distance_km} km away`
      )
    })

    // Fit bounds if we have markers
    const allPoints = [
      [center.lat, center.lng],
      ...places.filter(p => p.latitude).map(p => [p.latitude, p.longitude]),
      ...waterSources.filter(w => w.latitude).map(w => [w.latitude, w.longitude]),
    ]
    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [30, 30], maxZoom: 14 })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center?.lat, center?.lng, places.length, waterSources.length])

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '16px', zIndex: 1 }} />
}
