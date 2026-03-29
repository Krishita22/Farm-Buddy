import { useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Globe, MapPin, User, ArrowRight, Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft, Phone } from 'lucide-react'

export default function Onboarding() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { login, regions } = useUser()
  const [step, setStep] = useState(1) // 1=lang, 2=region, 3=auth, 4=verify, 5=forgot, 6=reset
  const [region, setRegion] = useState('india_gujarat')
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

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) { setError('Fill all fields'); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/signup', { email, password, name, phone, language: lang, region })
    setLoading(false)
    if (data.status === 'verify') {
      // Auto-fill code if email wasn't sent (demo mode)
      if (data.code) {
        setCode(data.code)
        setInfo(data.message)
      } else {
        setInfo(`Check your email (${email}) for the verification code`)
      }
      setStep(4)
    } else if (data.status === 'error') {
      setError(data.message)
    }
  }

  const handleVerify = async () => {
    if (!code.trim()) { setError('Enter the verification code'); return }
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
    if (!email.trim() || !password.trim()) { setError('Fill all fields'); return }
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
    if (!email.trim()) { setError('Enter your email first'); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/forgot-password', { email })
    setLoading(false)
    if (data.status === 'reset_code_sent') {
      if (data.code) {
        setCode(data.code)
        setInfo(data.message)
      } else {
        setInfo(`Check your email (${email}) for the reset code`)
      }
      setStep(6)
    } else {
      setError(data.message)
    }
  }

  const handleReset = async () => {
    if (!code.trim() || !newPassword.trim()) { setError('Fill all fields'); return }
    setLoading(true); setError('')
    const data = await post('/api/auth/reset-password', { email, code, new_password: newPassword })
    setLoading(false)
    if (data.status === 'ok') {
      setInfo(data.message)
      setStep(3); setMode('login'); setError(''); setPassword('')
    } else {
      setError(data.message)
    }
  }

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
          {[1,2,3].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${step >= s ? 'bg-white scale-110' : 'bg-white/20'}`} />
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
                    <span className="text-lg">{l.flag}</span>
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

          {/* Step 2: Region */}
          {step === 2 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">{t('obChooseRegion')}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t('obRegionDesc')}</p>
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                {regions.map(r => (
                  <button key={r.code} onClick={() => setRegion(r.code)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${region === r.code ? 'border-farm-500 bg-farm-50' : 'border-gray-100'}`}>
                    <span className="text-lg">{r.flag}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setStep(1)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs">{t('obBack')}</button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 bg-farm-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 text-sm">
                  {t('obNext')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Login / Signup */}
          {step === 3 && (
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
                      <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                    </div>
                  </>
                )}
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
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
                <button onClick={() => setStep(2)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs">{t('obBack')}</button>
                <button onClick={mode === 'signup' ? handleSignup : handleLogin} disabled={loading}
                  className="flex-1 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                  {loading ? '...' : mode === 'signup' ? t('obCreateAccount') : t('obLogin')}
                </button>
              </div>
              {mode === 'login' && (
                <button onClick={() => { setStep(5); setError(''); setInfo('') }} className="w-full mt-2 text-xs text-farm-600 hover:text-farm-700">
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {/* Step 4: Verify Code */}
          {step === 4 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">Verify Your Email</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">Enter the 6-digit code sent to <strong>{email}</strong></p>
              {info && <p className="text-green-600 text-xs mb-2 bg-green-50 p-2 rounded-lg">{info}</p>}
              <input type="text" placeholder="000000" value={code} onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()} maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleVerify} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : 'Verify & Create Account'}
              </button>
              <button onClick={() => { setStep(3); setError(''); setInfo('') }} className="w-full mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> Back
              </button>
            </div>
          )}

          {/* Step 5: Forgot Password */}
          {step === 5 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">Reset Password</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">Enter your email and we'll send a reset code</p>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleForgot} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : 'Send Reset Code'}
              </button>
              <button onClick={() => { setStep(3); setMode('login'); setError('') }} className="w-full mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> Back to login
              </button>
            </div>
          )}

          {/* Step 6: Enter Reset Code + New Password */}
          {step === 6 && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={18} className="text-farm-600" />
                <h2 className="text-base font-bold text-gray-900">New Password</h2>
              </div>
              {info && <p className="text-green-600 text-xs mb-2 bg-green-50 p-2 rounded-lg">{info}</p>}
              <div className="space-y-2.5">
                <input type="text" placeholder="Reset code" value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg tracking-[0.3em] font-mono focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
                <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-farm-500 focus:outline-none bg-gray-50" />
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button onClick={handleReset} disabled={loading}
                className="w-full mt-3 py-2.5 bg-farm-600 text-white rounded-xl font-semibold hover:bg-farm-700 disabled:opacity-50 text-sm">
                {loading ? '...' : 'Reset Password'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-3">{t('obOfflineNote')}</p>
      </div>
    </div>
  )
}
