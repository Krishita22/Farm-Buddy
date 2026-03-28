import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { Search } from 'lucide-react'

export default function FarmList({ farms }) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = farms.filter(f => {
    const matchesSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.village?.toLowerCase().includes(search.toLowerCase()) || f.active_crops?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'issues' && f.recent_issues > 0) || (filter === 'healthy' && f.recent_issues === 0)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">{t('farmDirectory')}</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchFarms')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50">
            <option value="all">{t('all')} ({farms.length})</option>
            <option value="issues">{t('issues')} ({farms.filter(f => f.recent_issues > 0).length})</option>
            <option value="healthy">{t('healthy')} ({farms.filter(f => f.recent_issues === 0).length})</option>
          </select>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">{t('selectFarmer')}</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">{t('crops')}</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-400">{t('issues')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.slice(0, 50).map(farm => (
              <tr key={farm.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-800 text-xs">{farm.name}</p>
                  <p className="text-gray-300 text-xs">{farm.village}</p>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{farm.active_crops || '—'}</td>
                <td className="px-4 py-2 text-right">
                  {farm.recent_issues > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />{farm.recent_issues}
                    </span>
                  ) : <span className="text-xs text-green-500">{t('healthy')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
