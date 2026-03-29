import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'

// Maps DB region → the local language code for that region
const REGION_LANG = {
  'Gujarat': 'gu',
  'Uttar Pradesh': 'hi',
  'Maharashtra': 'hi',
  'Machakos': 'sw',
  'Dhaka Division': 'bn',
  'Oyo State': 'yo',
  'Thiès': 'fr',
}
import { ShoppingCart, Search, Plus, MapPin, Phone, Wheat, Package, Sprout, FlaskConical, Wrench } from 'lucide-react'

const CATEGORY_ICONS = { crop: Wheat, seed: Sprout, tool: Wrench, supply: Package, fertilizer: FlaskConical }
const CATEGORY_COLORS = {
  crop: 'bg-green-50 text-green-600 border-green-200',
  seed: 'bg-amber-50 text-amber-600 border-amber-200',
  tool: 'bg-blue-50 text-blue-600 border-blue-200',
  supply: 'bg-purple-50 text-purple-600 border-purple-200',
  fertilizer: 'bg-orange-50 text-orange-600 border-orange-200',
}

// Map region codes to the DB region strings
const REGION_DB_MAP = {
  india_gujarat: 'Gujarat',
  india_up: 'Uttar Pradesh',
  india_maharashtra: 'Maharashtra',
  kenya_machakos: 'Machakos',
  bangladesh_dhaka: 'Dhaka Division',
  nigeria_oyo: 'Oyo State',
  senegal_thies: 'Thiès',
}

export default function Marketplace() {
  const { t, lang } = useLanguage()
  const { region } = useUser()
  const [listings, setListings] = useState([])
  const [filter, setFilter] = useState('all') // all, sell, buy
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const dbRegion = REGION_DB_MAP[region?.code] || null

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('listing_type', filter)
    if (category) params.set('category', category)
    if (dbRegion) params.set('region', dbRegion)
    params.set('limit', '50')
    fetch(`/api/marketplace/listings?${params}`)
      .then(r => r.json()).then(setListings).catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, category, dbRegion])

  const categories = [
    { key: 'crop', label: t('marketCatCrop') },
    { key: 'seed', label: t('marketCatSeed') },
    { key: 'tool', label: t('marketCatTool') },
    { key: 'supply', label: t('marketCatSupply') },
    { key: 'fertilizer', label: t('marketCatFertilizer') },
  ]

  const filtered = listings.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.title?.toLowerCase().includes(q) ||
           l.title_local?.toLowerCase().includes(q) ||
           l.farmer_name?.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={22} /> {t('marketTitle')}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {region?.flag} {region?.name} · {region?.currency} · {t('marketSubtitle')}
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-farm-600 text-white rounded-2xl text-sm font-medium hover:bg-farm-700 transition-colors shadow-sm">
          <Plus size={16} /> {t('marketListItem')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {[
            ['all', t('marketAll')],
            ['sell', t('marketForSale')],
            ['buy', t('marketWanted')],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === val ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(({ key, label }) => (
            <button key={key} onClick={() => setCategory(category === key ? '' : key)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${category === key ? CATEGORY_COLORS[key] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('marketSearch')}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-farm-500 focus:outline-none" />
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('marketLoading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('marketNoListings')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(l => {
            const Icon = CATEGORY_ICONS[l.category] || Package
            const colorClass = CATEGORY_COLORS[l.category] || 'bg-gray-50 text-gray-600 border-gray-200'
            const catLabel = categories.find(c => c.key === l.category)?.label || l.category
            const useLocal = REGION_LANG[l.region] === lang
            const displayTitle = useLocal && l.title_local ? l.title_local : l.title
            const displayDesc = useLocal && l.description_local ? l.description_local : l.description
            return (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${colorClass}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{displayTitle}</h3>
                      <p className="text-xs text-gray-400">{catLabel}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${l.listing_type === 'sell' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {l.listing_type === 'sell' ? t('marketForSale') : t('marketWanted')}
                  </span>
                </div>

                {displayDesc && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{displayDesc}</p>
                )}

                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-gray-900">{l.currency} {Number(l.price).toLocaleString()}</span>
                  <span className="text-xs text-gray-400">/{l.unit}</span>
                  {l.quantity && (
                    <span className="text-xs text-gray-400 ml-1">
                      · {Number(l.quantity).toLocaleString()} {l.unit} {t('marketAvailable')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {l.village || l.region}</span>
                  {l.farmer_name && <span className="text-gray-500">{l.farmer_name}</span>}
                </div>

                {l.contact_phone && (
                  <a href={`tel:${l.contact_phone}`} className="flex items-center gap-1.5 text-xs text-farm-600 hover:text-farm-700 font-medium">
                    <Phone size={11} /> {l.contact_phone}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
