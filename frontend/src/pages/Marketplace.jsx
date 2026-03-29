import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { ShoppingCart, Tag, Search, Plus, MapPin, Phone, ArrowUpDown, Wheat, Package, Sprout } from 'lucide-react'

const CATEGORY_ICONS = { crop: Wheat, seed: Sprout, tool: Package, supply: Package, fertilizer: Package }
const CATEGORY_COLORS = { crop: 'bg-green-50 text-green-600 border-green-200', seed: 'bg-amber-50 text-amber-600 border-amber-200', tool: 'bg-blue-50 text-blue-600 border-blue-200', supply: 'bg-purple-50 text-purple-600 border-purple-200', fertilizer: 'bg-orange-50 text-orange-600 border-orange-200' }

export default function Marketplace() {
  const { t } = useLanguage()
  const [listings, setListings] = useState([])
  const [filter, setFilter] = useState('all') // all, sell, buy
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('listing_type', filter)
    if (category) params.set('category', category)
    fetch(`/api/marketplace/listings?${params}&limit=50`)
      .then(r => r.json()).then(setListings).catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, category])

  const filtered = listings.filter(l =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.farmer_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-crop-bg min-h-[calc(100dvh-64px)]">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={22} /> Marketplace
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Buy & sell crops, seeds, tools, supplies</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-farm-600 text-white rounded-2xl text-sm font-medium hover:bg-farm-700 transition-colors shadow-sm">
            <Plus size={16} /> List Item
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {[['all', 'All'], ['sell', 'For Sale'], ['buy', 'Wanted']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === val ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {['crop', 'seed', 'tool', 'supply', 'fertilizer'].map(cat => (
              <button key={cat} onClick={() => setCategory(category === cat ? '' : cat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${category === cat ? CATEGORY_COLORS[cat] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-farm-500 focus:outline-none" />
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="market-card-skeleton bg-white/88 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="market-shimmer h-9 w-9 rounded-xl" />
                    <div className="space-y-2">
                      <div className="market-shimmer h-3.5 w-32 rounded-full" />
                      <div className="market-shimmer h-2.5 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="market-shimmer h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className="market-shimmer h-5 w-36 rounded-full" />
                  <div className="market-shimmer h-3 w-48 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="market-shimmer h-3 w-40 rounded-full" />
                  <div className="market-shimmer h-3 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No listings found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 motion-safe:scroll-smooth">
            {filtered.map((l, index) => {
              const Icon = CATEGORY_ICONS[l.category] || Package
              const colorClass = CATEGORY_COLORS[l.category] || 'bg-gray-50 text-gray-600 border-gray-200'
              return (
                <div
                  key={l.id}
                  className="market-card-enter bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${Math.min(index * 55, 330)}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorClass}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{l.title}</h3>
                        <p className="text-xs text-gray-400">{l.category}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.listing_type === 'sell' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {l.listing_type === 'sell' ? 'For Sale' : 'Wanted'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-lg font-bold text-gray-900">{l.currency} {l.price}</span>
                    <span className="text-xs text-gray-400">/{l.unit}</span>
                    {l.quantity && <span className="text-xs text-gray-400 ml-2">• {l.quantity} {l.unit} available</span>}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {l.village || l.region}</span>
                    {l.farmer_name && <span>{l.farmer_name}</span>}
                  </div>

                  {l.contact_phone && (
                    <a href={`tel:${l.contact_phone}`} className="mt-2 flex items-center gap-1 text-xs text-farm-600 hover:text-farm-700">
                      <Phone size={11} /> {l.contact_phone}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
