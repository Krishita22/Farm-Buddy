import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TYPE_COLORS = {
  farm_supply: '#f97316', market: '#d97706', veterinary: '#ec4899',
  hardware: '#6b7280', fuel: '#ef4444', general_store: '#8b5cf6',
  bank: '#0ea5e9', hospital: '#dc2626',
  water_well: '#3b82f6', canal: '#0ea5e9', water_tower: '#2563eb',
  irrigation_channel: '#06b6d4', reservoir_covered: '#1d4ed8',
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function FlyToCenter({ lat, lng }) {
  const map = useMapEvents({})
  useEffect(() => {
    map.flyTo([lat, lng], 11, { duration: 1 })
  }, [lat, lng, map])
  return null
}

export default function MapView({ center, places = [], waterSources = [], height = '350px' }) {
  const [userPin, setUserPin] = useState(null)
  if (!center) return null

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height, width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToCenter lat={center.lat} lng={center.lng} />
      <ClickHandler onMapClick={setUserPin} />

      {/* User's pin — placed by clicking on the map */}
      {userPin && (
        <CircleMarker center={[userPin.lat, userPin.lng]} radius={8}
          pathOptions={{ color: '#14532d', fillColor: '#166534', fillOpacity: 0.9, weight: 2 }}>
          <Popup><b>You</b></Popup>
        </CircleMarker>
      )}

      {/* Region center (before user clicks) */}
      {!userPin && (
        <CircleMarker center={[center.lat, center.lng]} radius={8}
          pathOptions={{ color: '#14532d', fillColor: '#166534', fillOpacity: 0.7, weight: 2 }}>
          <Popup><b>Your Region</b><br />Click anywhere to set your location</Popup>
        </CircleMarker>
      )}

      {/* Nearby places */}
      {places.map((p, i) => {
        if (!p.latitude || !p.longitude) return null
        const color = TYPE_COLORS[p.type] || '#6b7280'
        return (
          <CircleMarker key={`p-${i}`} center={[p.latitude, p.longitude]} radius={7}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1.5 }}>
            <Popup>
              <b>{p.name}</b><br />
              {p.type.replace(/_/g, ' ')}<br />
              {p.distance_km} km away
              {p.phone && <><br /><a href={`tel:${p.phone}`}>{p.phone}</a></>}
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Water sources */}
      {waterSources.map((w, i) => {
        if (!w.latitude || !w.longitude) return null
        const color = TYPE_COLORS[w.type] || '#3b82f6'
        return (
          <CircleMarker key={`w-${i}`} center={[w.latitude, w.longitude]} radius={5}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1 }}>
            <Popup>
              <b>{w.name}</b><br />
              {w.type.replace(/_/g, ' ')}<br />
              {w.distance_km} km away
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
