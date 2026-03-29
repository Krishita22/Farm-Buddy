import { useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Globe, MapPin, User, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function Onboarding() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { login, regions } = useUser()
  const [step, setStep] = useState(1)
  const [region, setRegion] = useState('india_gujarat')
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) { setError('Fill all fields'); return }
    if (mode === 'signup' && !name.trim()) { setError('Enter your name'); return }
    setLoading(true); setError('')
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const body = mode === 'signup'
        ? { username, password, name, language: lang, region }
        : { username, password }
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        if (data.user.language) setLanguage(data.user.language)
        login(data.user)
      } else {
        setError(data.message || 'Something went wrong')
      }
    } catch {
      setError('Connection failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-farm-800 to-farm-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-5xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('appName')}</h1>
          <p className="text-sm text-white/60 mt-1">{t('appTagline')}</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${step >= s ? 'bg-white scale-110' : 'bg-white/20'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Step 1: Language */}
          {step === 1 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={20} className="text-farm-600" />
                <h2 className="text-lg font-bold text-gray-900">{t('obChooseLang')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">{t('obLangDesc')}</p>
              <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                {languages.map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 transition-all text-left ${
                      lang === l.code ? 'border-farm-500 bg-farm-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <span className="text-xl">{l.flag}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{l.nativeName}</p>
                      <p className="text-xs text-gray-400">{l.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)}
                className="w-full mt-4 py-3 bg-farm-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 transition-colors">
                {t('obNext')} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Region */}
          {step === 2 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={20} className="text-farm-600" />
                <h2 className="text-lg font-bold text-gray-900">{t('obChooseRegion')}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-3">{t('obRegionDesc')}</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {regions.map(r => (
                  <button key={r.code} onClick={() => setRegion(r.code)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      region === r.code ? 'border-farm-500 bg-farm-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <span className="text-xl">{r.flag}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.currency} · {r.languages.join(', ')}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(1)} className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm">{t('obBack')}</button>
                <button onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-farm-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700">
                  {t('obNext')} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Auth */}
          {step === 3 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={20} className="text-farm-600" />
                <h2 className="text-lg font-bold text-gray-900">{mode === 'signup' ? t('obCreateAccount') : t('obWelcomeBack')}</h2>
              </div>

              <div className="flex bg-gray-100 rounded-xl p-0.5 mb-4">
                <button onClick={() => { setMode('signup'); setError('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {t('obSignup')}
                </button>
                <button onClick={() => { setMode('login'); setError('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  {t('obLogin')}
                </button>
              </div>

              <div className="space-y-3">
                {mode === 'signup' && (
                  <input type="text" placeholder={t('obName')} value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                )}
                <input type="text" placeholder={t('obUsername')} value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder={t('obPassword')} value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50 pr-10" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(2)} className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm">{t('obBack')}</button>
                <button onClick={handleAuth} disabled={loading}
                  className="flex-1 py-3 bg-farm-600 text-white rounded-2xl font-semibold hover:bg-farm-700 disabled:opacity-50 transition-colors">
                  {loading ? '...' : mode === 'signup' ? t('obCreateAccount') : t('obLogin')}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">{t('obOfflineNote')}</p>
      </div>
    </div>
  )
}
