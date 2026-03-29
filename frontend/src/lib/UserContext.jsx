import { createContext, useContext, useState, useCallback } from 'react'

const UserContext = createContext()

const COUNTRIES = [
  { code: 'IN', name: 'India', localName: 'भारत', currency: 'INR', languages: ['hi', 'gu'] },
  { code: 'KE', name: 'Kenya', localName: 'Kenya', currency: 'KES', languages: ['sw', 'en'] },
  { code: 'BD', name: 'Bangladesh', localName: 'বাংলাদেশ', currency: 'BDT', languages: ['bn'] },
  { code: 'NG', name: 'Nigeria', localName: 'Nigeria', currency: 'NGN', languages: ['yo', 'en'] },
  { code: 'SN', name: 'Senegal', localName: 'Sénégal', currency: 'XOF', languages: ['fr'] },
  { code: 'ES', name: 'Spain', localName: 'España', currency: 'EUR', languages: ['es'] },
  { code: 'BR', name: 'Brazil', localName: 'Brasil', currency: 'BRL', languages: ['pt'] },
  { code: 'SA', name: 'Saudi Arabia', localName: 'السعودية', currency: 'SAR', languages: ['ar'] },
]

const REGIONS = [
  { code: 'india_gujarat', name: 'Gujarat', country: 'IN', lat: 22.31, lng: 72.13, currency: 'INR', languages: ['gu', 'hi'], accent: 'gujarati_rural' },
  { code: 'india_up', name: 'Uttar Pradesh', country: 'IN', lat: 26.85, lng: 80.91, currency: 'INR', languages: ['hi'], accent: 'hindi_awadhi' },
  { code: 'india_maharashtra', name: 'Maharashtra', country: 'IN', lat: 19.08, lng: 75.71, currency: 'INR', languages: ['hi'], accent: 'hindi_maharashtrian' },
  { code: 'kenya_machakos', name: 'Machakos County', country: 'KE', lat: -1.52, lng: 37.26, currency: 'KES', languages: ['sw', 'en'], accent: 'swahili_kenyan' },
  { code: 'bangladesh_dhaka', name: 'Dhaka Division', country: 'BD', lat: 23.81, lng: 90.41, currency: 'BDT', languages: ['bn'], accent: 'bengali_dhaka' },
  { code: 'nigeria_oyo', name: 'Oyo State', country: 'NG', lat: 7.85, lng: 3.93, currency: 'NGN', languages: ['yo', 'en'], accent: 'yoruba_standard' },
  { code: 'senegal_thies', name: 'Thiès Region', country: 'SN', lat: 14.79, lng: -16.93, currency: 'XOF', languages: ['fr'], accent: 'french_west_african' },
  { code: 'spain_andalusia', name: 'Andalucía', country: 'ES', lat: 37.39, lng: -5.99, currency: 'EUR', languages: ['es'], accent: 'spanish_andalusian' },
  { code: 'brazil_minas', name: 'Minas Gerais', country: 'BR', lat: -19.92, lng: -43.94, currency: 'BRL', languages: ['pt'], accent: 'portuguese_mineiro' },
  { code: 'saudi_riyadh', name: 'Riyadh Province', country: 'SA', lat: 24.71, lng: 46.67, currency: 'SAR', languages: ['ar'], accent: 'arabic_najdi' },
]

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('farmbuddy_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const login = useCallback((userData) => {
    setUser(userData)
    localStorage.setItem('farmbuddy_user', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('farmbuddy_user')
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('farmbuddy_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const region = REGIONS.find(r => r.code === user?.region) || REGIONS[0]
  const getRegionsByCountry = useCallback((countryCode) => REGIONS.filter(r => r.country === countryCode), [])

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, region, regions: REGIONS, countries: COUNTRIES, getRegionsByCountry, isLoggedIn: !!user }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
