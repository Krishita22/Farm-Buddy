import { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { DISEASE_COLORS } from '../../lib/constants'

const CHART_COLORS = ['#16a34a', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg px-4 py-3">
      <p className="font-semibold text-gray-900 text-sm capitalize">{d.payload.name}</p>
      <p className="text-farm-600 font-bold text-lg">{d.value} reports</p>
    </div>
  )
}

export default function DiseaseChart({ topDiseases }) {
  const { t } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(null)

  const data = topDiseases.map((d, i) => ({
    name: d.disease_name.replace(/_/g, ' '),
    count: d.count,
    fill: DISEASE_COLORS[d.disease_name] || CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div className="bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-4">{t('topDiseases')}</h3>
      {data.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm mb-1">{t('noData')}</p>
          <p className="text-gray-300 text-xs">Disease reports from conversations and manual reports will appear here</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3af' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: '#374151', textTransform: 'capitalize' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(22,163,74,0.06)', radius: 8 }} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={28}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                  style={{ transition: 'fill-opacity 0.3s ease', cursor: 'pointer' }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
