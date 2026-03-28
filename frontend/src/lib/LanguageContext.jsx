import { createContext, useContext, useState, useCallback } from 'react'
import { t as translate, getLanguages } from './i18n'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('farmagent_lang') || 'en')

  const setLanguage = useCallback((code) => {
    setLang(code)
    localStorage.setItem('farmagent_lang', code)
    document.documentElement.lang = code
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const t = useCallback((key) => translate(key, lang), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, languages: getLanguages() }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
