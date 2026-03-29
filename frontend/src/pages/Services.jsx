import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { Wrench, Tractor, Droplets, Users, Truck, Bug, FlaskConical, Wheat, Package, Phone, MapPin, Star } from 'lucide-react'

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

export default function Services() {
  const { t } = useLanguage()
  const [services, setServices] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('service_type', typeFilter)
    fetch(`/api/services?${params}&limit=50`)
      .then(r => r.json()).then(setServices).catch(() => {})
      .finally(() => setLoading(false))
  }, [typeFilter])

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
          <button onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${!typeFilter ? 'bg-farm-600 text-white border-farm-600' : 'bg-white text-gray-500 border-gray-200'}`}>
            All
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
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No services found</div>
        ) : (
          <div className="space-y-3">
            {services.map((s, index) => {
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
