import { useLanguage } from '../../lib/LanguageContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { DISEASE_COLORS } from '../../lib/constants'

export default function DiseaseChart({ topDiseases }) {
  const { t } = useLanguage()

  const data = topDiseases.map(d => ({
    name: d.disease_name.replace(/_/g, ' '),
    count: d.count,
    fill: DISEASE_COLORS[d.disease_name] || '#94a3b8',
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-4">{t('topDiseases')}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">{t('noData')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} formatter={(v) => [`${v} reports`, 'Count']} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
