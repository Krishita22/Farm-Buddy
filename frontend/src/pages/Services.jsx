import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Wrench, Tractor, Droplets, Users, Truck, Bug, FlaskConical, Wheat, Package, Phone, MapPin, Star } from 'lucide-react'

export default function Services() {
  const { t } = useLanguage()
  const { region } = useUser()
  const [services, setServices] = useState([])
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
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('service_type', typeFilter)
    fetch(`/api/services?${params}&limit=50`)
      .then(r => r.json()).then(setServices).catch(() => {})
      .finally(() => setLoading(false))
  }, [typeFilter])

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench size={22} /> {t('servicesTitle')}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('servicesDesc')}</p>
      </div>

      {/* Irrigation & Canal Info Card */}
      {region && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={16} className="text-blue-600" />
            <h3 className="font-semibold text-blue-900 text-sm">{t('nearbyIrrigation')} — {region.name}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/70 rounded-xl p-3">
              <p className="font-medium text-blue-800 mb-1">{t('nearbyCanals')}</p>
              <ul className="space-y-1 text-blue-700">
                {region.code?.startsWith('india_gujarat') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Narmada Canal (12 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Sabarmati Branch Canal (8 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Mahi Right Bank Canal (18 km)</li>
                </>}
                {region.code?.startsWith('india_up') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Upper Ganga Canal (5 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Sharda Canal (15 km)</li>
                </>}
                {region.code?.startsWith('india_maharashtra') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Krishna Left Bank Canal (10 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Jayakwadi Canal (20 km)</li>
                </>}
                {region.code?.startsWith('kenya') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Yatta Canal (7 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Athi River Diversion (14 km)</li>
                </>}
                {region.code?.startsWith('bangladesh') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Ganges-Kobadak Canal (6 km)</li>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Teesta Barrage Canal (22 km)</li>
                </>}
                {region.code?.startsWith('nigeria') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Ogun-Osun River Basin (9 km)</li>
                </>}
                {region.code?.startsWith('senegal') && <>
                  <li className="flex items-center gap-1.5"><MapPin size={10} /> Casamance River Canal (11 km)</li>
                </>}
              </ul>
            </div>
            <div className="bg-white/70 rounded-xl p-3">
              <p className="font-medium text-blue-800 mb-1">{t('nearbyIrrigation')}</p>
              <ul className="space-y-1 text-blue-700">
                <li className="flex items-center gap-1.5"><Droplets size={10} /> {t('irrBorehole')} — 3 {t('navServices').toLowerCase()}</li>
                <li className="flex items-center gap-1.5"><Droplets size={10} /> {t('irrDrip')} — 5 {t('navServices').toLowerCase()}</li>
                <li className="flex items-center gap-1.5"><Droplets size={10} /> {t('irrSprinkler')} — 2 {t('navServices').toLowerCase()}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Service type filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${!typeFilter ? 'bg-farm-600 text-white border-farm-600' : 'bg-white text-gray-500 border-gray-200'}`}>
          {t('all')}
        </button>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${typeFilter === type ? cfg.color : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
            <cfg.icon size={12} /> {cfg.label}
          </button>
        ))}
      </div>

      {/* Services list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('loading')}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noServices')}</div>
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
