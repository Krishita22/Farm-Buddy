import { useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Globe, MapPin, Map, User, ArrowRight, Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft, Phone } from 'lucide-react'

export default function Onboarding() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { login, countries, getRegionsByCountry } = useUser()
  // 1=lang, 2=country, 3=region, 4=auth, 5=verify, 6=forgot, 7=reset
  const [step, setStep] = useState(1)
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json()
  }

  const handleCountrySelect = (code) => {
    setCountry(code)
    const countryRegions = getRegionsByCountry(code)
    // Auto-select if only one region in country
    if (countryRegions.length === 1) {
      setRegion(countryRegions[0].code)
    } else {
      setRegion('')
    }
  }

  const handleCountryNext = () => {
    if (!country) return
    const countryRegions = getRegionsByCountry(country)
    if (countryRegions.length === 1) {
      // Skip region step — only 1 region
      setRegion(countryRegions[0].code)
      setStep(4)
    } else {
      setStep(3)
    }
  }

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) { setError(t('obFillFields')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/signup', { email, password, name, phone, language: lang, region })
    setLoading(false)
    if (data.status === 'verify') {
      if (data.code) {
        setCode(data.code)
        setInfo(data.message)
      } else {
        setInfo(t('obCheckEmail').replace('{email}', email))
      }
      setStep(5)
    } else if (data.status === 'error') {
      setError(data.message)
    }
  }

  const handleVerify = async () => {
    if (!code.trim()) { setError(t('obEnterCode')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/verify', { email, code })
    setLoading(false)
    if (data.status === 'ok') {
      if (data.user.language) setLanguage(data.user.language)
      login(data.user)
    } else {
      setError(data.message)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError(t('obFillFields')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/login', { email, password })
    setLoading(false)
    if (data.status === 'ok') {
      if (data.user.language) setLanguage(data.user.language)
      login(data.user)
    } else {
      setError(data.message)
    }
  }

  const handleForgot = async () => {
    if (!email.trim()) { setError(t('obEnterEmailFirst')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/forgot-password', { email })
    setLoading(false)
    if (data.status === 'reset_code_sent') {
      if (data.code) {
        setCode(data.code)
        setInfo(data.message)
      } else {
        setInfo(t('obCheckEmail').replace('{email}', email))
      }
      setStep(7)
    } else {
      setError(data.message)
    }
  }

  const handleReset = async () => {
    if (!code.trim() || !newPassword.trim()) { setError(t('obFillFields')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/reset-password', { email, code, new_password: newPassword })
    setLoading(false)
    if (data.status === 'ok') {
      setInfo(data.message)
      setStep(4); setMode('login'); setError(''); setPassword('')
    } else {
      setError(data.message)
    }
  }

  // Progress: 4 steps (lang, country, region/auto, auth)
  const progressStep = step <= 4 ? step : 4

  return (
    <div className="min-h-dvh bg-gradient-to-b from-farm-800 to-farm-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="w-18 h-18 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-lg" style={{width:72,height:72}}>
            <span className="text-4xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('appName')}</h1>
          <p className="text-sm text-white/60 mt-1">{t('appTagline')}</p>
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {[1,2,3,4].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${progressStep >= s ? 'bg-white scale-110' : 'bg-white/20'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Step 1: Language */}
          {step === 1 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obChooseLang')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obLangDesc')}</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-[45vh] overflow-y-auto">
                {languages.map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${lang === l.code ? 'border-farm-500 bg-farm-50' : 'border-gray-100'}`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{l.nativeName}</p>
                      <p className="text-xs text-gray-400">{l.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 text-sm">
                {t('obNext')} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Country */}
          {step === 2 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Map size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obChooseCountry')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obCountryDesc')}</p>
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                {countries.map(c => (
                  <button key={c.code} onClick={() => handleCountrySelect(c.code)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${country === c.code ? 'border-farm-500 bg-farm-50' : 'border-gray-100'}`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{c.localName}</p>
                      <p className="text-xs text-gray-400">{c.name} · {c.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setStep(1)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs">{t('obBack')}</button>
                <button onClick={handleCountryNext} disabled={!country}
                  className="flex-1 py-2.5 bg-farm-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 disabled:opacity-40 text-sm">
                  {t('obNext')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Region (only if country has multiple regions) */}
          {step === 3 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obChooseRegion')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obRegionDesc')}</p>
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                {getRegionsByCountry(country).map(r => (
                  <button key={r.code} onClick={() => setRegion(r.code)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${region === r.code ? 'border-farm-500 bg-farm-50' : 'border-gray-100'}`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setStep(2)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs">{t('obBack')}</button>
                <button onClick={() => { if (region) setStep(4) }} disabled={!region}
                  className="flex-1 py-2.5 bg-farm-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 disabled:opacity-40 text-sm">
                  {t('obNext')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Login / Signup */}
          {step === 4 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{mode === 'signup' ? t('obCreateAccount') : t('obWelcomeBack')}</h2>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
                <button onClick={() => { setMode('signup'); setError('') }} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t('obSignup')}</button>
                <button onClick={() => { setMode('login'); setError('') }} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t('obLogin')}</button>
              </div>
              <div className="space-y-2.5">
                {mode === 'signup' && (
                  <>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="text" placeholder={t('obName')} value={name} onChange={e => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                    </div>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="tel" placeholder={t('obPhone')} value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                    </div>
                  </>
                )}
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="email" placeholder={t('obEmail')} value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type={showPw ? 'text' : 'password'} placeholder={t('obPassword')} value={password}
                    onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignup() : handleLogin())}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              {info && <p className="text-green-600 text-xs mt-2">{info}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => {
                  const countryRegions = getRegionsByCountry(country)
                  setStep(countryRegions.length > 1 ? 3 : 2)
                }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs">{t('obBack')}</button>
                <button onClick={mode === 'signup' ? handleSignup : handleLogin} disabled={loading}
                  className="flex-1 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                  {loading ? '...' : mode === 'signup' ? t('obCreateAccount') : t('obLogin')}
                </button>
              </div>
              {mode === 'login' && (
                <button onClick={() => { setStep(6); setError(''); setInfo('') }} className="w-full mt-2 text-xs text-farm-600 hover:text-farm-700">
                  {t('obForgotPassword')}
                </button>
              )}
            </div>
          )}

          {/* Step 5: Verify Code */}
          {step === 5 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obVerifyEmail')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obVerifyDesc').replace('{email}', email)}</p>
              {info && <p className="text-green-600 text-xs mb-2 bg-green-50 p-2 rounded-lg">{info}</p>}
              <input type="text" placeholder="000000" value={code} onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()} maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleVerify} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : t('obVerifyBtn')}
              </button>
              <button onClick={() => { setStep(4); setError(''); setInfo('') }} className="w-full mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> {t('obBack')}
              </button>
            </div>
          )}

          {/* Step 6: Forgot Password */}
          {step === 6 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obResetPassword')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obResetDesc')}</p>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="email" placeholder={t('obEmail')} value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleForgot} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : t('obSendResetCode')}
              </button>
              <button onClick={() => { setStep(4); setMode('login'); setError('') }} className="w-full mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> {t('obBackToLogin')}
              </button>
            </div>
          )}

          {/* Step 7: Enter Reset Code + New Password */}
          {step === 7 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obNewPassword')}</h2>
              </div>
              {info && <p className="text-green-600 text-xs mb-2 bg-green-50 p-2 rounded-lg">{info}</p>}
              <div className="space-y-2.5">
                <input type="text" placeholder={t('obResetCode')} value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg tracking-[0.3em] font-mono focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                <input type="password" placeholder={t('obNewPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleReset} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : t('obResetPassword')}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-3">{t('obOfflineNote')}</p>
      </div>
    </div>
  )
}
