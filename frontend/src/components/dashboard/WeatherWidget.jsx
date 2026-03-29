import { useLanguage } from '../../lib/LanguageContext'
import { useWeather } from '../../lib/WeatherContext'
import { CloudRain, Sun, Cloud, CloudDrizzle, CloudLightning, CloudFog, Snowflake, Droplets, Wind } from 'lucide-react'

const ICONS = { sunny: Sun, partly_cloudy: Cloud, overcast: Cloud, fog: CloudFog, light_rain: CloudDrizzle, rain: CloudRain, heavy_rain: CloudLightning, thunderstorm: CloudLightning, snow: Snowflake }
const COLORS = { sunny: 'text-yellow-500', partly_cloudy: 'text-gray-400', overcast: 'text-gray-500', fog: 'text-gray-400', light_rain: 'text-blue-400', rain: 'text-blue-500', heavy_rain: 'text-blue-700', thunderstorm: 'text-purple-600', snow: 'text-blue-300' }

export default function WeatherWidget() {
  const { t } = useLanguage()
  const { forecast, loading } = useWeather()

  if (loading) return <div className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-40" />
  const today = forecast[0]
  const source = today?.source || 'offline'
  const isLive = source === 'tomorrow.io' || source === 'accuweather' || source === 'openweather' || source === 'open-meteo'

  return (
    <div className="bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('weatherTitle')}</h3>
        {today && (
          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
            isLive ? 'bg-green-50 text-green-600 border border-green-200'
            : source === 'cache' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
            : 'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>
            {isLive ? 'Live' : source === 'cache' ? t('weatherCached') : t('weatherHistorical')}
          </span>
        )}
      </div>

      {/* Today - centered */}
      {today && (
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50/80 to-sky-50/80">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs text-gray-400 mb-1">{t('today')}</p>
            <p className="text-5xl font-bold text-gray-900 mb-1">{today.temp_high_c}°C</p>
            <p className="text-sm text-gray-500 mb-3 capitalize">{t('weather_' + today.condition) !== 'weather_' + today.condition ? t('weather_' + today.condition) : today.condition.replace(/_/g, ' ')}</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Droplets size={12} /> {today.humidity_pct}%</span>
              <span className="flex items-center gap-1"><Wind size={12} /> {today.wind_kph} km/h</span>
              <span className="flex items-center gap-1"><CloudRain size={12} /> {today.rainfall_mm}mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast - centered */}
      <div className="px-4 py-3 grid grid-cols-7 gap-1">
        {forecast.slice(0, 7).map((day, i) => {
          const Icon = ICONS[day.condition] || Cloud
          return (
            <div key={i} className="flex flex-col items-center text-center py-2">
              <p className="text-xs text-gray-400 mb-1">{day.day_name.slice(0, 3)}</p>
              <Icon size={18} className={`${COLORS[day.condition] || 'text-gray-400'} mb-1`} />
              <p className="text-xs font-semibold">{day.temp_high_c}°</p>
              <p className="text-xs text-gray-300">{day.temp_low_c}°</p>
              {day.rainfall_mm > 0 && <p className="text-xs text-blue-500 mt-0.5">{day.rainfall_mm}mm</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
