import { createElement, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { Wrench, Tractor, Droplets, Users, Truck, Bug, FlaskConical, Wheat, Package, Phone, MapPin, Star, LocateFixed, Navigation, MapPinned, Search } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TYPE_CONFIG = {
  tractor: { icon: Tractor, color: 'bg-orange-50 text-orange-600 border-orange-200', label: 'Tractor' },
  harvesting: { icon: Wheat, color: 'bg-green-50 text-green-600 border-green-200', label: 'Harvesting' },
  irrigation: { icon: Droplets, color: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Irrigation' },
  repair: { icon: Wrench, color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Repair' },
  labor: { icon: Users, color: 'bg-purple-50 text-purple-600 border-purple-200', label: 'Labor' },
  transport: { icon: Truck, color: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Transport' },
  spraying: { icon: Bug, color: 'bg-red-50 text-red-600 border-red-200', label: 'Spraying' },
  soil_testing: { icon: FlaskConical, color: 'bg-teal-50 text-teal-600 border-teal-200', label: 'Soil Testing' },
  seed_supply: { icon: Package, color: 'bg-farm-50 text-farm-600 border-farm-200', label: 'Seeds & Supply' },
  fertilizer_supply: { icon: Package, color: 'bg-lime-50 text-lime-600 border-lime-200', label: 'Fertilizer' },
}

const TYPE_MAP_COLORS = {
  tractor: '#ea580c',
  harvesting: '#16a34a',
  irrigation: '#2563eb',
  repair: '#6b7280',
  labor: '#9333ea',
  transport: '#d97706',
  spraying: '#dc2626',
  soil_testing: '#0f766e',
  seed_supply: '#16a34a',
  fertilizer_supply: '#65a30d',
}

const WORLD_BOUNDS = [[-85, -180], [85, 180]]

function createServiceMarker(serviceType, highlighted = false) {
  const config = TYPE_CONFIG[serviceType] || TYPE_CONFIG.repair
  const Icon = config.icon
  const color = TYPE_MAP_COLORS[serviceType] || '#166534'
  const iconMarkup = renderToStaticMarkup(
    createElement(Icon, { size: highlighted ? 18 : 16, strokeWidth: 2.2 })
  )

  return L.divIcon({
    className: 'service-map-marker-wrapper',
    html: `
      <div class="service-map-marker ${highlighted ? 'service-map-marker-active' : ''}" style="--marker-color: ${color}">
        <div class="service-map-marker__icon">${iconMarkup}</div>
      </div>
    `,
    iconSize: highlighted ? [40, 40] : [36, 36],
    iconAnchor: highlighted ? [20, 20] : [18, 18],
    popupAnchor: [0, -18],
  })
}

function ServiceMapViewport({ userLocation, nearbyServices }) {
  const map = useMap()

  useEffect(() => {
    if (!userLocation) {
      map.fitBounds(WORLD_BOUNDS, { padding: [24, 24] })
      return
    }

    const points = [
      [userLocation.lat, userLocation.lng],
      ...nearbyServices
        .filter((service) => service.latitude != null && service.longitude != null)
        .map((service) => [service.latitude, service.longitude]),
    ]

    if (points.length === 1) {
      map.setView(points[0], 11, { animate: true })
      return
    }

    map.fitBounds(points, { padding: [36, 36], animate: true, maxZoom: 12 })
  }, [map, nearbyServices, userLocation])

  return null
}

export default function Services() {
  const { t } = useLanguage()
  const [services, setServices] = useState([])
  const [allServices, setAllServices] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [nearbyServices, setNearbyServices] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [radiusKm, setRadiusKm] = useState(30)
  const [locationQuery, setLocationQuery] = useState('')
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    setLoading(true)
    fetch('/api/services?limit=200')
      .then(r => r.json()).then((data) => {
        setServices(data)
        setAllServices(data)
      }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (!userLocation) return

    const params = new URLSearchParams({
      lat: String(userLocation.lat),
      lng: String(userLocation.lng),
      radius_km: String(radiusKm),
    })

    setNearbyLoading(true)
    fetch(`/api/services/nearby?${params.toString()}`)
      .then((r) => r.json())
      .then(setNearbyServices)
      .catch(() => setLocationError('Could not load nearby services'))
      .finally(() => setNearbyLoading(false))
  }, [userLocation, radiusKm])

  const filteredServices = useMemo(() => {
    if (selectedTypes.length === 0) return services
    return services.filter((service) => selectedTypes.includes(service.service_type))
  }, [selectedTypes, services])

  const filteredNearbyServices = useMemo(() => {
    if (selectedTypes.length === 0) return nearbyServices
    return nearbyServices.filter((service) => selectedTypes.includes(service.service_type))
  }, [nearbyServices, selectedTypes])

  const toggleServiceType = (type) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    )
  }

  const requestNearbyServices = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not available on this device')
      return
    }

    setLocationError('')
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude })
      },
      () => {
        setLocationError('Please allow location access to find nearby services')
        setNearbyLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const locationOptions = useMemo(() => {
    const grouped = new Map()
    for (const service of allServices) {
      if (service.latitude == null || service.longitude == null) continue

      const districtKey = service.district && service.region
        ? `district:${service.district}|${service.region}`
        : null
      if (districtKey && !grouped.has(districtKey)) {
        grouped.set(districtKey, {
          id: districtKey,
          label: `${service.district}, ${service.region}`,
          hint: 'District',
          lat: service.latitude,
          lng: service.longitude,
        })
      }

      const regionKey = service.region ? `region:${service.region}` : null
      if (regionKey && !grouped.has(regionKey)) {
        grouped.set(regionKey, {
          id: regionKey,
          label: service.region,
          hint: 'Region',
          lat: service.latitude,
          lng: service.longitude,
        })
      }
    }
    return [...grouped.values()]
  }, [allServices])

  const locationMatches = useMemo(() => {
    const query = locationQuery.trim().toLowerCase()
    if (!query) return []
    return locationOptions
      .filter((option) => option.label.toLowerCase().includes(query))
      .slice(0, 6)
  }, [locationOptions, locationQuery])

  const searchLocation = (option) => {
    setLocationError('')
    setUserLocation({ lat: option.lat, lng: option.lng })
    setLocationQuery(option.label)
  }

  return (
    <div className="page-crop-bg min-h-[calc(100dvh-64px)]">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench size={22} /> Farm Services
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Find tractors, repair, labor, irrigation, and more near you</p>
        </div>

        {/* Service type filters */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setSelectedTypes([])}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${selectedTypes.length === 0 ? 'bg-farm-600 text-white border-farm-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-farm-300'}`}>
            All
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <button key={type} onClick={() => toggleServiceType(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                selectedTypes.includes(type)
                  ? 'bg-farm-50 text-farm-700 border-farm-500 ring-2 ring-farm-500/25 shadow-md'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-farm-300'
              }`}>
              <cfg.icon size={12} /> {cfg.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-white/92 border border-farm-100 px-4 py-2 shadow-sm">
            <MapPinned size={16} className="text-farm-700" />
            <span className="text-sm font-medium text-gray-900">
              {selectedTypes.length === 0 ? 'Selected service: All services' : 'Selected services:'}
            </span>
            {selectedTypes.length === 0 ? (
              <span className="text-xs text-farm-700">All nearby service symbols will appear</span>
            ) : (
              selectedTypes.map((type) => {
                const cfg = TYPE_CONFIG[type] || { icon: Wrench, label: type }
                return (
                  <span key={type} className="inline-flex items-center gap-1.5 rounded-full bg-farm-50 text-farm-700 border border-farm-200 px-2.5 py-1 text-xs font-medium">
                    <cfg.icon size={12} />
                    {cfg.label}
                  </span>
                )
              })
            )}
          </div>
        </div>

        <div className="market-card-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm mb-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPinned size={18} className="text-farm-700" />
                Nearby Services Map
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Find nearby providers and see service symbols on the map.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
                <span className="text-xs text-gray-500">Radius</span>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                >
                  {[10, 20, 30, 50].map((distance) => (
                    <option key={distance} value={distance}>{distance} km</option>
                  ))}
                </select>
              </div>
              <button
                onClick={requestNearbyServices}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-farm-600 text-white text-sm font-medium hover:bg-farm-700 transition-colors shadow-sm"
              >
                <LocateFixed size={15} />
                {nearbyLoading && !userLocation ? 'Locating...' : 'Use My Location'}
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search a district or region to find nearby services"
                className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
              />
            </div>
            {locationMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[700] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                {locationMatches.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => searchLocation(option)}
                    className="w-full text-left px-4 py-3 hover:bg-farm-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.hint}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
            <div data-no-produce="true" className="relative min-h-[260px] rounded-[1.75rem] border border-farm-100 bg-[radial-gradient(circle_at_top,rgba(220,252,231,0.95),rgba(240,253,244,0.78))] overflow-hidden shadow-sm">
              <div className="absolute inset-x-6 top-5 flex items-center justify-between text-[11px] text-farm-800/70 font-medium z-[500] pointer-events-none">
                <span>
                  {selectedTypes.length === 0
                    ? 'All services nearby'
                    : `${selectedTypes.map((type) => TYPE_CONFIG[type]?.label || type).join(', ')} nearby only`}
                </span>
                <span>{radiusKm} km radius</span>
              </div>

              {!userLocation && !nearbyLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <Navigation size={26} className="text-farm-700 mb-3" />
                  <p className="text-sm font-medium text-gray-800">Search from your location to see nearby services on the map.</p>
                  <p className="text-xs text-gray-500 mt-1">Pinch to zoom out and see the full world map. Offline mode keeps the markers and local map view.</p>
                </div>
              )}

              {nearbyLoading && (
                <div className="absolute inset-0 p-5 z-[600]">
                  <div className="market-shimmer h-full w-full rounded-[1.25rem]" />
                </div>
              )}

              <MapContainer
                className="services-leaflet-map h-[260px] sm:h-[340px] w-full rounded-[1.75rem]"
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                maxZoom={18}
                worldCopyJump
                scrollWheelZoom
                doubleClickZoom
                touchZoom
                zoomControl
              >
                {isOnline && (
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                )}
                <ServiceMapViewport userLocation={userLocation} nearbyServices={nearbyServices} />

                {userLocation && (
                  <CircleMarker
                    center={[userLocation.lat, userLocation.lng]}
                    radius={10}
                    pathOptions={{ color: '#ffffff', weight: 4, fillColor: '#15803d', fillOpacity: 1 }}
                  >
                    <Popup>You are here</Popup>
                  </CircleMarker>
                )}

                {filteredNearbyServices
                  .filter((service) => service.latitude != null && service.longitude != null)
                  .map((service) => (
                    <Marker
                      key={service.id}
                      center={[service.latitude, service.longitude]}
                      icon={createServiceMarker(service.service_type, selectedTypes.includes(service.service_type))}
                    >
                      <Popup>
                        <div className="min-w-40">
                          <p className="font-semibold text-gray-900">{service.provider_name}</p>
                          <p className="text-xs text-gray-500">{TYPE_CONFIG[service.service_type]?.label || service.service_type}</p>
                          <p className="text-xs text-gray-600 mt-1">{service.district}, {service.region}</p>
                          <p className="text-xs text-gray-600">{service.price_range}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>

            <div className="bg-farm-50/90 border border-farm-100 rounded-[1.75rem] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Nearby Results</h3>
                {userLocation && <span className="text-xs text-farm-700 font-medium">{filteredNearbyServices.length} found</span>}
              </div>

              {locationError ? (
                <p className="text-sm text-red-500">{locationError}</p>
              ) : !userLocation ? (
                <p className="text-sm text-gray-500">Use your location or search a place name to find nearby {selectedTypes.length ? selectedTypes.map((type) => TYPE_CONFIG[type]?.label.toLowerCase() || type).join(', ') : 'tractors, irrigation, repair, labor, and more'}.</p>
              ) : nearbyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="market-shimmer h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : filteredNearbyServices.length === 0 ? (
                <p className="text-sm text-gray-500">No nearby {selectedTypes.length ? selectedTypes.map((type) => TYPE_CONFIG[type]?.label.toLowerCase() || type).join(', ') : 'services'} found for this radius.</p>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {filteredNearbyServices.map((service, index) => {
                    const Icon = TYPE_CONFIG[service.service_type]?.icon || Wrench
                    return (
                      <div
                        key={service.id}
                        className="market-card-enter bg-white rounded-2xl border border-farm-100 p-3 shadow-sm"
                        style={{ animationDelay: `${index * 55}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-farm-100 text-farm-700 flex items-center justify-center shrink-0">
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{service.provider_name}</p>
                            <p className="text-xs text-gray-500">{service.district}, {service.region}</p>
                            <p className="text-xs text-gray-600 mt-1">{service.price_range}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Services list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="market-shimmer h-11 w-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="market-shimmer h-4 w-36 rounded-full" />
                        <div className="market-shimmer h-5 w-24 rounded-full" />
                      </div>
                      <div className="market-shimmer h-4 w-12 rounded-full" />
                    </div>
                    <div className="market-shimmer h-4 w-full rounded-full" />
                    <div className="market-shimmer h-4 w-4/5 rounded-full" />
                    <div className="flex gap-3">
                      <div className="market-shimmer h-3 w-32 rounded-full" />
                      <div className="market-shimmer h-3 w-24 rounded-full" />
                    </div>
                    <div className="market-shimmer h-8 w-28 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No services found</div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((s, index) => {
              const cfg = TYPE_CONFIG[s.service_type] || { icon: Wrench, color: 'bg-gray-50 text-gray-600 border-gray-200', label: s.service_type }
              const Icon = cfg.icon
              return (
                <div
                  key={s.id}
                  className="market-card-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${Math.min(index * 55, 330)}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${cfg.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{s.provider_name}</h3>
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star size={13} fill="currentColor" />
                          <span className="text-xs font-semibold">{s.rating}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1.5">{s.description}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {s.district}, {s.region}</span>
                        <span className="font-medium text-gray-600">{s.price_range}</span>
                      </div>

                      {s.contact_phone && (
                        <a href={`tel:${s.contact_phone}`}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-farm-50 text-farm-700 rounded-xl text-xs font-medium hover:bg-farm-100 transition-colors border border-farm-200">
                          <Phone size={12} /> Call Now
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
