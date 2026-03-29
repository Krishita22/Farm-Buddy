import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const UserContext = createContext()

const REGIONS = [
  { code: 'india_gujarat', name: 'Gujarat, India', flag: '🇮🇳', lat: 22.31, lng: 72.13, currency: 'INR', languages: ['gu', 'hi'] },
  { code: 'india_up', name: 'Uttar Pradesh, India', flag: '🇮🇳', lat: 26.85, lng: 80.91, currency: 'INR', languages: ['hi'] },
  { code: 'india_maharashtra', name: 'Maharashtra, India', flag: '🇮🇳', lat: 19.08, lng: 75.71, currency: 'INR', languages: ['hi'] },
  { code: 'kenya_machakos', name: 'Kenya (Machakos)', flag: '🇰🇪', lat: -1.52, lng: 37.26, currency: 'KES', languages: ['sw', 'en'] },
  { code: 'bangladesh_dhaka', name: 'Bangladesh (Dhaka)', flag: '🇧🇩', lat: 23.81, lng: 90.41, currency: 'BDT', languages: ['bn'] },
  { code: 'nigeria_oyo', name: 'Nigeria (Oyo)', flag: '🇳🇬', lat: 7.85, lng: 3.93, currency: 'NGN', languages: ['yo', 'en'] },
  { code: 'senegal_thies', name: 'Senegal (Thiès)', flag: '🇸🇳', lat: 14.79, lng: -16.93, currency: 'XOF', languages: ['fr'] },
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

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, region, regions: REGIONS, isLoggedIn: !!user }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
