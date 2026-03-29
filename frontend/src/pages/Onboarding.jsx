/**
 * Onboarding page — multi-step flow for language, country, region selection
 * and user authentication (signup / login / password reset).
 * Uses shared Button, Input, and Alert components from ../components/ui.
 */
import { useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Button, Input, Alert } from '../components/ui'
import { Globe, MapPin, Map, User, ArrowRight, Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft, Phone } from 'lucide-react'

export default function Onboarding() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { login, countries, getRegionsByCountry } = useUser()
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
      if (data.code) { setCode(data.code); setInfo(data.message) }
      else { setInfo(t('obCheckEmail').replace('{email}', email)) }
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
    } else { setError(data.message) }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError(t('obFillFields')); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/login', { email, password })
    setLoading(false)
    if (data.status === 'ok') {
      const userData = { ...data.user }
      // Apply the region/language selected during onboarding
      if (region) userData.region = region
      if (lang) { userData.language = lang; setLanguage(lang) }
      else if (userData.language) { setLanguage(userData.language) }
      login(userData)
      // Persist region/language selection to backend
      if (region || lang) {
        fetch(`/api/auth/profile/${userData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region: region || undefined, language: lang || undefined })
        }).catch(() => {})
      }
    } else { setError(data.message) }
  }

  const handleDirectReset = async () => {
    if (!email.trim() || !newPassword.trim()) { setError(t('obFillFields')); return }
    if (newPassword.length < 4) { setError('Password must be at least 4 characters'); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/direct-reset', { email, new_password: newPassword })
    setLoading(false)
    if (data.status === 'ok') {
      setInfo(data.message); setPassword(''); setNewPassword('')
      setStep(4); setMode('login'); setError('')
    } else { setError(data.message) }
  }

  const progressStep = step <= 4 ? step : 4


  return (
    <div className="min-h-dvh flex flex-col items-center justify-start pt-6 pb-4 px-4 ob-bg overflow-hidden relative">
      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-4 flex flex-col items-center">
          <div style={{width:360,height:360}} className="-mb-6">
            <img src="/Logo.png" alt="Farm Buddy" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="ob-title">{t('appName')}</h1>
          <p className="text-sm text-white/50 mt-1 font-light">{t('appTagline')}</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-4">
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${
              progressStep >= s ? 'bg-white w-8' : 'bg-white/15 w-2'
            }`} />
          ))}
        </div>

        {/* Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 ob-card">

          {/* Step 1: Language */}
          {step === 1 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <Globe size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('obChooseLang')}</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">{t('obLangDesc')}</p>
              <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {languages.map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                      lang === l.code ? 'border-farm-500 bg-farm-50 shadow-sm' : 'border-gray-100 hover:border-farm-200 hover:bg-gray-50'
                    }`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{l.nativeName}</p>
                      <p className="text-xs text-gray-400">{l.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button size="lg" onClick={() => setStep(2)} className="mt-4">
                {t('obNext')} <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 2: Country */}
          {step === 2 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <Map size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('obChooseCountry')}</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">{t('obCountryDesc')}</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {countries.map(c => (
                  <button key={c.code} onClick={() => handleCountrySelect(c.code)}
                    className={`w-full flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                      country === c.code ? 'border-farm-500 bg-farm-50 shadow-sm' : 'border-gray-100 hover:border-farm-200 hover:bg-gray-50'
                    }`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.i18n?.[lang] || c.name}</p>
                      <p className="text-xs text-gray-400">{c.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => setStep(1)}>{t('obBack')}</Button>
                <Button size="lg" onClick={handleCountryNext} disabled={!country} className="flex-1">
                  {t('obNext')} <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Region */}
          {step === 3 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <MapPin size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('obChooseRegion')}</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">{t('obRegionDesc')}</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {getRegionsByCountry(country).map(r => (
                  <button key={r.code} onClick={() => setRegion(r.code)}
                    className={`w-full flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all duration-200 ${
                      region === r.code ? 'border-farm-500 bg-farm-50 shadow-sm' : 'border-gray-100 hover:border-farm-200 hover:bg-gray-50'
                    }`}>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.i18n?.[lang] || r.name}</p>
                      <p className="text-xs text-gray-400">{r.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => setStep(2)}>{t('obBack')}</Button>
                <Button size="lg" onClick={() => { if (region) setStep(4) }} disabled={!region} className="flex-1">
                  {t('obNext')} <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Login / Signup */}
          {step === 4 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <User size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{mode === 'signup' ? t('obCreateAccount') : t('obWelcomeBack')}</h2>
              </div>
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button onClick={() => { setMode('signup'); setError('') }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>{t('obSignup')}</button>
                <button onClick={() => { setMode('login'); setError('') }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>{t('obLogin')}</button>
              </div>
              <div className="space-y-3">
                {mode === 'signup' && (
                  <>
                    <Input icon={User} type="text" placeholder={t('obName')} value={name} onChange={e => setName(e.target.value)} />
                    <Input icon={Phone} type="tel" placeholder={t('obPhone')} value={phone} onChange={e => setPhone(e.target.value)} />
                  </>
                )}
                <Input icon={Mail} type="email" placeholder={t('obEmail')} value={email} onChange={e => setEmail(e.target.value)} />
                <div className="relative">
                  <Input icon={Lock} type={showPw ? 'text' : 'password'} placeholder={t('obPassword')} value={password}
                    onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignup() : handleLogin())}
                    className="pr-10" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <Alert message={error} />
              <Alert message={info} type="success" />
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" onClick={() => {
                  const countryRegions = getRegionsByCountry(country)
                  setStep(countryRegions.length > 1 ? 3 : 2)
                }}>{t('obBack')}</Button>
                <Button size="lg" onClick={mode === 'signup' ? handleSignup : handleLogin} disabled={loading} className="flex-1">
                  {loading ? '...' : mode === 'signup' ? t('obCreateAccount') : t('obLogin')}
                </Button>
              </div>
              {mode === 'login' && (
                <Button variant="ghost" size="sm" onClick={() => { setStep(6); setError(''); setInfo('') }} className="w-full mt-3">
                  {t('obForgotPassword')}
                </Button>
              )}
            </div>
          )}

          {/* Step 5: Verify Code */}
          {step === 5 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <KeyRound size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('obVerifyEmail')}</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">{t('obVerifyDesc').replace('{email}', email)}</p>
              <Alert message={info} type="success" />
              <input type="text" placeholder="000000" value={code} onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()} maxLength={6}
                className="w-full px-4 py-4 border border-gray-200 rounded-2xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50/50" />
              <Alert message={error} />
              <Button size="lg" onClick={handleVerify} disabled={loading} className="mt-4">
                {loading ? '...' : t('obVerifyBtn')}
              </Button>
              <button onClick={() => { setStep(4); setError(''); setInfo('') }} className="w-full mt-3 text-xs text-gray-400 flex items-center justify-center gap-1 hover:text-gray-600 transition-colors">
                <ArrowLeft size={12} /> {t('obBack')}
              </button>
            </div>
          )}

          {/* Step 6: Reset Password */}
          {step === 6 && (
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-farm-100 flex items-center justify-center">
                  <KeyRound size={16} className="text-farm-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t('obResetPassword')}</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">Enter your email and a new password.</p>
              <Alert message={info} type="success" />
              <div className="space-y-3">
                <Input icon={Mail} type="email" placeholder={t('obEmail')} value={email} onChange={e => setEmail(e.target.value)} />
                <Input icon={Lock} type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDirectReset()} />
              </div>
              <Alert message={error} />
              <Button size="lg" onClick={handleDirectReset} disabled={loading} className="mt-4">
                {loading ? '...' : t('obResetPassword')}
              </Button>
              <button onClick={() => { setStep(4); setMode('login'); setError(''); setInfo('') }} className="w-full mt-3 text-xs text-gray-400 flex items-center justify-center gap-1 hover:text-gray-600 transition-colors">
                <ArrowLeft size={12} /> {t('obBackToLogin')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
