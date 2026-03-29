const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Chat (text)
  chat: (data) => request('/chat', { method: 'POST', body: JSON.stringify(data) }),

  // Chat (voice) — sends audio blob to local Whisper + Ollama pipeline
  voiceChat: async (audioBlob, farmerId, language) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('farmer_id', farmerId)
    formData.append('language', language)
    const res = await fetch(`${API_BASE}/chat/voice`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  // Voice (standalone)
  transcribe: async (audioBlob, languageHint) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    const params = languageHint ? `?language_hint=${languageHint}` : ''
    const res = await fetch(`${API_BASE}/voice/transcribe${params}`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  // Farmers
  getFarmers: (limit = 50) => request(`/farmers?limit=${limit}`),
  getFarmer: (id) => request(`/farmers/${id}`),
  getFarmerMemory: (id) => request(`/farmers/${id}/memory`),

  // Dashboard
  getStats: () => request('/dashboard/stats'),
  getOutbreaks: () => request('/dashboard/outbreaks'),
  getFarms: () => request('/dashboard/farms'),
  getDiseaseTimeline: () => request('/dashboard/disease-timeline'),
  getAlerts: () => request('/dashboard/alerts'),

  // Market
  getPrices: (crop, region) => {
    const params = new URLSearchParams()
    if (crop) params.set('crop', crop)
    if (region) params.set('region', region)
    return request(`/market/prices?${params}`)
  },
  checkPrice: (crop, price, region) => {
    const params = new URLSearchParams({ crop, price })
    if (region) params.set('region', region)
    return request(`/market/price-check?${params}`)
  },

  // Weather (Tomorrow.io when online → Open-Meteo → offline historical)
  getWeatherForecast: (days = 7, lat, lng) => {
    const params = new URLSearchParams({ days })
    if (lat != null) params.set('lat', lat)
    if (lng != null) params.set('lng', lng)
    return request(`/weather/forecast?${params}`)
  },
  getCurrentWeather: (lat, lng) => {
    const params = new URLSearchParams()
    if (lat != null) params.set('lat', lat)
    if (lng != null) params.set('lng', lng)
    return request(`/weather/current?${params}`)
  },
  getPlantingAdvisory: (crop, lat, lng) => {
    const params = new URLSearchParams({ crop })
    if (lat != null) params.set('lat', lat)
    if (lng != null) params.set('lng', lng)
    return request(`/weather/planting-advisory?${params}`)
  },

  // Real-time data (live from government APIs)
  getLivePrices: (state) => request(`/realtime/prices${state ? `?state=${state}` : ''}`),
  getLiveAlerts: (region) => request(`/realtime/alerts?region=${region || 'india'}`),

  // Real nearby places (OpenStreetMap — cached for offline)
  getNearbyPlaces: (lat, lng, radius = 25) => request(`/services/nearby?lat=${lat}&lng=${lng}&radius_km=${radius}`),
  getWaterSources: (lat, lng, radius = 15) => request(`/services/water-sources?lat=${lat}&lng=${lng}&radius_km=${radius}`),

  // Health (shows offline service status)
  getHealth: () => request('/health'),
}
