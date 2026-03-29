import { createContext, useContext, useState, useCallback } from 'react'

const UserContext = createContext()

const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', languages: ['hi', 'gu'],
    i18n: { en: 'India', hi: 'भारत', gu: 'ભારત', bn: 'ভারত', sw: 'India', fr: 'Inde', es: 'India', pt: 'Índia', yo: 'India', ar: 'الهند' } },
  { code: 'KE', name: 'Kenya', currency: 'KES', languages: ['sw', 'en'],
    i18n: { en: 'Kenya', hi: 'केन्या', gu: 'કેન્યા', bn: 'কেনিয়া', sw: 'Kenya', fr: 'Kenya', es: 'Kenia', pt: 'Quênia', yo: 'Kenya', ar: 'كينيا' } },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', languages: ['bn'],
    i18n: { en: 'Bangladesh', hi: 'बांग्लादेश', gu: 'બાંગ્લાદેશ', bn: 'বাংলাদেশ', sw: 'Bangladesh', fr: 'Bangladesh', es: 'Bangladés', pt: 'Bangladesh', yo: 'Bangladesh', ar: 'بنغلاديش' } },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', languages: ['yo', 'en'],
    i18n: { en: 'Nigeria', hi: 'नाइजीरिया', gu: 'નાઇજીરિયા', bn: 'নাইজেরিয়া', sw: 'Nigeria', fr: 'Nigéria', es: 'Nigeria', pt: 'Nigéria', yo: 'Nàìjíríà', ar: 'نيجيريا' } },
  { code: 'SN', name: 'Senegal', currency: 'XOF', languages: ['fr'],
    i18n: { en: 'Senegal', hi: 'सेनेगल', gu: 'સેનેગલ', bn: 'সেনেগাল', sw: 'Senegali', fr: 'Sénégal', es: 'Senegal', pt: 'Senegal', yo: 'Sẹ̀nẹ̀gà', ar: 'السنغال' } },
  { code: 'ES', name: 'Spain', currency: 'EUR', languages: ['es'],
    i18n: { en: 'Spain', hi: 'स्पेन', gu: 'સ્પેન', bn: 'স্পেন', sw: 'Uhispania', fr: 'Espagne', es: 'España', pt: 'Espanha', yo: 'Sípéènì', ar: 'إسبانيا' } },
  { code: 'BR', name: 'Brazil', currency: 'BRL', languages: ['pt'],
    i18n: { en: 'Brazil', hi: 'ब्राज़ील', gu: 'બ્રાઝિલ', bn: 'ব্রাজিল', sw: 'Brazili', fr: 'Brésil', es: 'Brasil', pt: 'Brasil', yo: 'Bràsíl', ar: 'البرازيل' } },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', languages: ['ar'],
    i18n: { en: 'Saudi Arabia', hi: 'सऊदी अरब', gu: 'સાઉદી અરેબિયા', bn: 'সৌদি আরব', sw: 'Saudi Arabia', fr: 'Arabie Saoudite', es: 'Arabia Saudí', pt: 'Arábia Saudita', yo: 'Saudi Arabia', ar: 'السعودية' } },
]

const REGIONS = [
  { code: 'india_gujarat', name: 'Gujarat', country: 'IN', lat: 22.31, lng: 72.13, currency: 'INR', languages: ['gu', 'hi'], accent: 'gujarati_rural',
    i18n: { en: 'Gujarat', hi: 'गुजरात', gu: 'ગુજરાત', bn: 'গুজরাট' } },
  { code: 'india_up', name: 'Uttar Pradesh', country: 'IN', lat: 26.85, lng: 80.91, currency: 'INR', languages: ['hi'], accent: 'hindi_awadhi',
    i18n: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', gu: 'ઉત્તર પ્રદેશ', bn: 'উত্তর প্রদেশ' } },
  { code: 'india_maharashtra', name: 'Maharashtra', country: 'IN', lat: 19.08, lng: 75.71, currency: 'INR', languages: ['hi'], accent: 'hindi_maharashtrian',
    i18n: { en: 'Maharashtra', hi: 'महाराष्ट्र', gu: 'મહારાષ્ટ્ર', bn: 'মহারাষ্ট্র' } },
  { code: 'kenya_machakos', name: 'Machakos County', country: 'KE', lat: -1.52, lng: 37.26, currency: 'KES', languages: ['sw', 'en'], accent: 'swahili_kenyan',
    i18n: { en: 'Machakos County', sw: 'Kaunti ya Machakos' } },
  { code: 'bangladesh_dhaka', name: 'Dhaka Division', country: 'BD', lat: 23.81, lng: 90.41, currency: 'BDT', languages: ['bn'], accent: 'bengali_dhaka',
    i18n: { en: 'Dhaka Division', bn: 'ঢাকা বিভাগ', hi: 'ढाका डिवीजन' } },
  { code: 'nigeria_oyo', name: 'Oyo State', country: 'NG', lat: 7.85, lng: 3.93, currency: 'NGN', languages: ['yo', 'en'], accent: 'yoruba_standard',
    i18n: { en: 'Oyo State', yo: 'Ìpínlẹ̀ Ọ̀yọ́' } },
  { code: 'senegal_thies', name: 'Thiès Region', country: 'SN', lat: 14.79, lng: -16.93, currency: 'XOF', languages: ['fr'], accent: 'french_west_african',
    i18n: { en: 'Thiès Region', fr: 'Région de Thiès' } },
  { code: 'spain_andalusia', name: 'Andalucía', country: 'ES', lat: 37.39, lng: -5.99, currency: 'EUR', languages: ['es'], accent: 'spanish_andalusian',
    i18n: { en: 'Andalusia', es: 'Andalucía' } },
  { code: 'brazil_minas', name: 'Minas Gerais', country: 'BR', lat: -19.92, lng: -43.94, currency: 'BRL', languages: ['pt'], accent: 'portuguese_mineiro',
    i18n: { en: 'Minas Gerais', pt: 'Minas Gerais' } },
  { code: 'saudi_riyadh', name: 'Riyadh Province', country: 'SA', lat: 24.71, lng: 46.67, currency: 'SAR', languages: ['ar'], accent: 'arabic_najdi',
    i18n: { en: 'Riyadh Province', ar: 'منطقة الرياض' } },
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
