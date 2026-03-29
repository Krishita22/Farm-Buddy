import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { useUser } from '../../lib/UserContext'
import { api } from '../../lib/api'
import { CloudRain, Sun, Cloud, CloudDrizzle, CloudLightning, CloudFog, Snowflake, Droplets, Wind, Wifi, WifiOff } from 'lucide-react'

const ICONS = { sunny: Sun, partly_cloudy: Cloud, overcast: Cloud, fog: CloudFog, light_rain: CloudDrizzle, rain: CloudRain, heavy_rain: CloudLightning, thunderstorm: CloudLightning, snow: Snowflake }
const COLORS = { sunny: 'text-yellow-500', partly_cloudy: 'text-gray-400', overcast: 'text-gray-500', fog: 'text-gray-400', light_rain: 'text-blue-400', rain: 'text-blue-500', heavy_rain: 'text-blue-700', thunderstorm: 'text-purple-600', snow: 'text-blue-300' }

export default function WeatherWidget() {
  const { t } = useLanguage()
  const { region } = useUser()
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getWeatherForecast(7, region?.lat, region?.lng)
      .then(setForecast)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [region])

  if (loading) return <div className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse h-40" />
  const today = forecast[0]
  const source = today?.source || 'offline'
  const isLive = source === 'tomorrow.io' || source === 'accuweather' || source === 'open-meteo'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t('weatherTitle')}</h3>
        {today && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            isLive ? 'bg-green-50 text-green-600 border border-green-200'
            : source === 'cache' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
            : 'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>
            {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isLive ? `${t('weatherLive')}` : source === 'cache' ? t('weatherCached') : t('weatherHistorical')}
          </span>
        )}
      </div>
      {today && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-sky-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">{t('today')}</p>
              <p className="text-3xl font-bold text-gray-900">{today.temp_high_c}°C</p>
              <p className="text-xs text-gray-500">{t('weather_' + today.condition) !== 'weather_' + today.condition ? t('weather_' + today.condition) : today.condition.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Droplets size={12} /> {today.humidity_pct}%</span>
              <span className="flex items-center gap-1"><Wind size={12} /> {today.wind_kph} km/h</span>
              <span className="flex items-center gap-1"><CloudRain size={12} /> {today.rainfall_mm}mm</span>
            </div>
          </div>
        </div>
      )}
      <div className="px-2 sm:px-4 py-2 grid grid-cols-7 gap-0.5 sm:gap-1">
        {forecast.slice(0, 7).map((day, i) => {
          const Icon = ICONS[day.condition] || Cloud
          return (
            <div key={i} className="text-center py-2">
              <p className="text-xs text-gray-400 mb-1">{day.day_name.slice(0, 3)}</p>
              <Icon size={16} className={`mx-auto ${COLORS[day.condition] || 'text-gray-400'}`} />
              <p className="text-xs font-semibold mt-1">{day.temp_high_c}°</p>
              <p className="text-xs text-gray-300">{day.temp_low_c}°</p>
              {day.rainfall_mm > 0 && <p className="text-xs text-blue-500">{day.rainfall_mm}mm</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
