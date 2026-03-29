import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { api } from '../lib/api'
import MapView from '../components/MapView'
import { Wrench, Tractor, Droplets, Users, Truck, Bug, FlaskConical, Wheat, Package, Phone, MapPin, Star, ShoppingBag, Stethoscope, Hammer, Wifi, WifiOff, Navigation } from 'lucide-react'

export default function Services() {
  const { lang, t } = useLanguage()
  const { region } = useUser()
  const isOnline = useOnlineStatus()
  const [services, setServices] = useState([])
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [waterSources, setWaterSources] = useState([])
  const [nearbySource, setNearbySource] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingNearby, setLoadingNearby] = useState(true)

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

  // Load registered services
  useEffect(() => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('service_type', typeFilter)
    fetch(`/api/services?${params}&limit=50`)
      .then(r => r.json()).then(setServices).catch(() => {})
      .finally(() => setLoading(false))
  }, [typeFilter])

  // Load REAL nearby places from OpenStreetMap
  useEffect(() => {
    if (region?.lat && region?.lng) {
      setLoadingNearby(true)
      Promise.allSettled([
        api.getNearbyPlaces(region.lat, region.lng),
        api.getWaterSources(region.lat, region.lng),
      ]).then(([placesRes, waterRes]) => {
        if (placesRes.status === 'fulfilled' && placesRes.value.places) {
          setNearbyPlaces(placesRes.value.places)
          setNearbySource(placesRes.value.source)
        }
        if (waterRes.status === 'fulfilled' && waterRes.value.water_sources) {
          setWaterSources(waterRes.value.water_sources)
        }
      }).finally(() => setLoadingNearby(false))
    }
  }, [region])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench size={22} /> {t('servicesTitle')}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('servicesDesc')}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isOnline ? t('liveData') : t('offline')}
        </div>
      </div>

      {/* Interactive Map */}
      {region && (nearbyPlaces.length > 0 || waterSources.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <MapView
            center={{ lat: region.lat, lng: region.lng }}
            places={nearbyPlaces}
            waterSources={waterSources}
            height="300px"
          />
          <div className="px-3 py-2 flex flex-wrap gap-3 text-xs text-gray-400 border-t border-gray-100">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {t('svcSeeds')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t('navMarket')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('nearbyIrrigation')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Veterinary</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-700 ring-2 ring-green-300" /> {t('farmDetails')}</span>
          </div>
        </div>
      )}

      {/* Real Nearby Places from OpenStreetMap */}
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-green-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">{t('servicesDesc')} — {region?.i18n?.[lang] || region?.name}</h3>
          </div>
          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">
            {nearbySource === 'openstreetmap' ? 'OpenStreetMap' : nearbySource === 'cache' ? t('offline') : '...'}
          </span>
        </div>
        {loadingNearby ? (
          <div className="p-4 text-center text-gray-400 text-sm">{t('loading')}</div>
        ) : nearbyPlaces.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">{t('noServices')}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {nearbyPlaces.slice(0, 15).map((p, i) => {
              const cfg = TYPE_CONFIG[p.type] || { icon: MapPin, color: 'bg-gray-50 text-gray-500 border-gray-200', label: p.type }
              const Icon = cfg.icon
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${cfg.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-0.5"><Navigation size={9} /> {p.distance_km} km</span>
                      {p.opening_hours && <span>{p.opening_hours}</span>}
                      {p.address && <span className="truncate">{p.address}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="text-farm-600 hover:text-farm-700">
                        <Phone size={14} />
                      </a>
                    )}
                    <a href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600">
                      <MapPin size={14} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Real Water Sources */}
      {waterSources.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={16} className="text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">{t('nearbyIrrigation')}</h3>
            <span className="text-xs text-blue-500">OpenStreetMap</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {waterSources.slice(0, 8).map((w, i) => (
              <div key={i} className="bg-white/70 rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">{w.name}</p>
                  <p className="text-xs text-blue-500">{w.type.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-xs text-blue-600 font-medium">{w.distance_km} km</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service type filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${!typeFilter ? 'bg-farm-600 text-white border-farm-600' : 'bg-white text-gray-500 border-gray-200'}`}>
          {t('all')}
        </button>
        {Object.entries(TYPE_CONFIG).slice(0, 10).map(([type, cfg]) => (
          <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${typeFilter === type ? cfg.color : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
            <cfg.icon size={12} /> {cfg.label}
          </button>
        ))}
      </div>

      {/* Registered services list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('loading')}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-4 text-gray-300 text-xs">{t('noServices')}</div>
      ) : (
        <div className="space-y-3">
          {services.map(s => {
            const cfg = TYPE_CONFIG[s.service_type] || { icon: Wrench, color: 'bg-gray-50 text-gray-600 border-gray-200', label: s.service_type }
            const Icon = cfg.icon
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
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
      )}
    </div>
  )
}
