import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { api } from '../lib/api'
import MapView from '../components/MapView'
import { Wrench, Tractor, Droplets, Users, Truck, Bug, FlaskConical, Wheat, Package, Phone, MapPin, Star, ShoppingBag, Stethoscope, Hammer, Navigation } from 'lucide-react'

export default function Services() {
  const { lang, t } = useLanguage()
  const { region } = useUser()
  const [services, setServices] = useState([])
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [waterSources, setWaterSources] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const TYPE_CONFIG = {
    tractor: { icon: Tractor, color: 'bg-orange-50 text-orange-600 border-orange-200', label: t('svcTractor') },
    harvesting: { icon: Wheat, color: 'bg-green-50 text-green-600 border-green-200', label: t('svcHarvesting') },
    irrigation: { icon: Droplets, color: 'bg-blue-50 text-blue-600 border-blue-200', label: t('svcIrrigation') },
    repair: { icon: Wrench, color: 'bg-gray-50 text-gray-600 border-gray-200', label: t('svcRepair') },
    labor: { icon: Users, color: 'bg-purple-50 text-purple-600 border-purple-200', label: t('svcLabor') },
    transport: { icon: Truck, color: 'bg-amber-50 text-amber-600 border-amber-200', label: t('svcTransport') },
    spraying: { icon: Bug, color: 'bg-red-50 text-red-600 border-red-200', label: t('svcSpraying') },
    soil_testing: { icon: FlaskConical, color: 'bg-teal-50 text-teal-600 border-teal-200', label: t('svcSoilTest') },
    seed_supply: { icon: Package, color: 'bg-farm-50 text-farm-600 border-farm-200', label: t('svcSeeds') },
    fertilizer_supply: { icon: Package, color: 'bg-lime-50 text-lime-600 border-lime-200', label: t('svcFertilizer') },
    farm_supply: { icon: ShoppingBag, color: 'bg-green-50 text-green-600 border-green-200', label: t('svcSeeds') },
    market: { icon: ShoppingBag, color: 'bg-amber-50 text-amber-600 border-amber-200', label: t('navMarket') },
    veterinary: { icon: Stethoscope, color: 'bg-pink-50 text-pink-600 border-pink-200', label: 'Veterinary' },
    hardware: { icon: Hammer, color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Hardware' },
  }

  // Fetch everything when region or filter changes
  useEffect(() => {
    setLoading(true)
    setNearbyPlaces([])
    setWaterSources([])
    setServices([])

    const params = new URLSearchParams()
    if (typeFilter) params.set('service_type', typeFilter)

    // Registered services filtered by region code
    if (region?.code) params.set('region', region.code)

    const promises = [
      fetch(`/api/services?${params}&limit=50`).then(r => r.json()).catch(() => []),
    ]

    // Nearby places from OpenStreetMap for this region
    if (region?.lat && region?.lng) {
      promises.push(
        api.getNearbyPlaces(region.lat, region.lng).catch(() => ({ places: [] })),
        api.getWaterSources(region.lat, region.lng).catch(() => ({ water_sources: [] })),
      )
    }

    Promise.all(promises).then(([svc, places, water]) => {
      setServices(svc || [])
      if (places?.places) setNearbyPlaces(places.places)
      if (water?.water_sources) setWaterSources(water.water_sources)
    }).finally(() => setLoading(false))
  }, [region, typeFilter])

  return (
    <div className="page-crop-bg min-h-[calc(100dvh-56px)]">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench size={22} /> {t('servicesTitle')}
          </h1>
          <p className="text-xs text-gray-700 mt-0.5">{region?.i18n?.[lang] || region?.name}</p>
        </div>

        {/* Category filters — at the top */}
        <div className="grid grid-cols-6 gap-1.5 mb-4">
          <button onClick={() => setTypeFilter('')}
            className={`px-2 py-1.5 rounded-xl text-xs font-medium border transition-all text-center ${!typeFilter ? 'bg-farm-600 text-white border-farm-600' : 'bg-white/80 text-gray-500 border-gray-200'}`}>
            {t('all')}
          </button>
          {Object.entries(TYPE_CONFIG).slice(0, 10).map(([type, cfg]) => (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition-all ${typeFilter === type ? cfg.color : 'bg-white/80 text-gray-400 border-gray-200 hover:border-gray-300'}`}>
              <cfg.icon size={12} /> {cfg.label}
            </button>
          ))}
        </div>

        {/* Services list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="market-shimmer h-11 w-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="market-shimmer h-4 w-36 rounded-full" />
                    <div className="market-shimmer h-4 w-full rounded-full" />
                    <div className="market-shimmer h-3 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (() => {
          // Filter nearby places by category if a filter is selected
          const filteredNearby = typeFilter ? nearbyPlaces.filter(p => p.type === typeFilter) : nearbyPlaces
          const allItems = [...filteredNearby, ...services]
          return allItems.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm bg-white/80 rounded-2xl border border-white/70 shadow-sm">
            <p className="font-medium mb-1">{t('noServicesFound')}</p>
            <p className="text-xs text-gray-400">{t('tryDifferent')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Nearby places from OpenStreetMap */}
            {filteredNearby.slice(0, 15).map((p, i) => {
              const cfg = TYPE_CONFIG[p.type] || { icon: MapPin, color: 'bg-gray-50 text-gray-500 border-gray-200', label: p.type?.replace(/_/g, ' ') }
              const Icon = cfg.icon
              return (
                <div key={`n-${i}`}
                  className="market-card-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${Math.min(i * 55, 330)}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${cfg.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5"><Navigation size={9} /> {p.distance_km} {t('kmAway')}</span>
                        {p.opening_hours && <span>{p.opening_hours}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.phone && <a href={`tel:${p.phone}`} className="text-farm-600 hover:text-farm-700"><Phone size={14} /></a>}
                      <a href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`}
                        target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600"><MapPin size={14} /></a>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Registered services */}
            {services.map((s, index) => {
              const cfg = TYPE_CONFIG[s.service_type] || { icon: Wrench, color: 'bg-gray-50 text-gray-600 border-gray-200', label: s.service_type }
              const Icon = cfg.icon
              return (
                <div key={s.id}
                  className="market-card-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${Math.min((nearbyPlaces.length + index) * 55, 500)}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${cfg.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{s.provider_name}</h3>
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {s.rating > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star size={13} fill="currentColor" />
                            <span className="text-xs font-semibold">{s.rating}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5">{s.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {(s.district || s.region) && <span className="flex items-center gap-1"><MapPin size={11} /> {s.district}{s.district && s.region ? ', ' : ''}{s.region}</span>}
                        {s.price_range && <span className="font-medium text-gray-600">{s.price_range}</span>}
                      </div>
                      {s.contact_phone && (
                        <a href={`tel:${s.contact_phone}`}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-farm-50 text-farm-700 rounded-xl text-xs font-medium hover:bg-farm-100 transition-colors border border-farm-200">
                          <Phone size={12} /> {t('callNow')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )})()}

        {/* Map — filtered by selected category */}
        {region && (
          <div className="dashboard-section-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm overflow-hidden mt-4" style={{ animationDelay: '300ms' }}>
            <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">{region?.i18n?.[lang] || region?.name}{typeFilter ? ` - ${TYPE_CONFIG[typeFilter]?.label || typeFilter}` : ''}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-farm-700" /> {t('youOnMap')}</span>
              </div>
            </div>
            <MapView center={{ lat: region.lat, lng: region.lng }}
              places={typeFilter ? nearbyPlaces.filter(p => p.type === typeFilter) : nearbyPlaces}
              waterSources={waterSources} height="350px" />
          </div>
        )}
      </div>
    </div>
  )
}
