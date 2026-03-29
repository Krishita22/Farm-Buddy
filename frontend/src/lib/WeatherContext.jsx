/**
 * Weather context — fetches and caches current conditions and 7-day forecast,
 * refreshing on region change and every 10 minutes.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUser } from './UserContext'
import { api } from './api'

const WeatherContext = createContext()

export function WeatherProvider({ children }) {
  const { region } = useUser()
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!region?.lat || !region?.lng) return
    setLoading(true)
    try {
      const [cur, fc] = await Promise.allSettled([
        api.getCurrentWeather(region.lat, region.lng),
        api.getWeatherForecast(7, region.lat, region.lng),
      ])
      if (cur.status === 'fulfilled') setCurrent(cur.value)
      if (fc.status === 'fulfilled') setForecast(fc.value)
    } catch {}
    setLoading(false)
  }, [region?.lat, region?.lng])

  // Fetch once on region change, then every 10 minutes
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <WeatherContext.Provider value={{ current, forecast, loading, refresh }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeather() {
  const ctx = useContext(WeatherContext)
  if (!ctx) throw new Error('useWeather must be used within WeatherProvider')
  return ctx
}
