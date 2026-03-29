import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useLanguage } from './lib/LanguageContext'
import { useUser } from './lib/UserContext'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import Onboarding from './pages/Onboarding'
import FarmerChat from './pages/FarmerChat'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Profile from './pages/Profile'
import { MessageSquare, LayoutDashboard, Wrench, ChevronDown, Download } from 'lucide-react'

const PRODUCE_EMOJIS = ['🍅', '🥕', '🍎', '🍓', '🍆', '🥒', '🌽', '🍉', '🍇', '🥬', '🫑', '🍊']

const LANG_TO_REGION = {
  gu: 'india_gujarat', hi: 'india_up', sw: 'kenya_machakos',
  bn: 'bangladesh_dhaka', yo: 'nigeria_oyo', fr: 'senegal_thies',
}

function LanguagePicker() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { updateUser } = useUser()
  const [open, setOpen] = useState(false)
  const current = languages.find(l => l.code === lang)

  const handleSelect = (code) => {
    setLanguage(code)
    if (LANG_TO_REGION[code]) updateUser({ region: LANG_TO_REGION[code] })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex flex-col items-start px-3 py-1 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-sm">
        <span className="text-[9px] uppercase tracking-wider text-white/40">Language</span>
        <span className="flex items-center gap-1">
          <span className="hidden sm:inline">{current?.nativeName}</span>
          <ChevronDown size={12} className="opacity-60" />
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-60 max-h-80 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Language</p>
            </div>
            {languages.map(l => (
              <button key={l.code} onClick={() => handleSelect(l.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-farm-50 transition-colors ${l.code === lang ? 'bg-farm-50 font-semibold text-farm-800' : 'text-gray-700'}`}>
                <div className="text-left">
                  <p className="font-medium">{l.nativeName}</p>
                  <p className="text-xs text-gray-400">{l.name}</p>
                </div>
                {l.code === lang && <span className="ml-auto text-farm-600 text-xs">Active</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RegionPicker() {
  const { user, updateUser, regions, region } = useUser()
  const { lang, t } = useLanguage()
  const [open, setOpen] = useState(false)

  if (!user) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex flex-col items-start px-3 py-1 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-sm">
        <span className="text-[9px] uppercase tracking-wider text-white/40">Region</span>
        <span className="flex items-center gap-1">
          <span className="hidden sm:inline">{region?.i18n?.[lang] || region?.name || 'Region'}</span>
          <ChevronDown size={12} className="opacity-60" />
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-56 max-h-80 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Region</p>
            </div>
            {regions.map(r => (
              <button key={r.code} onClick={() => { updateUser({ region: r.code }); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-farm-50 transition-colors ${r.code === user?.region ? 'bg-farm-50 font-semibold text-farm-800' : 'text-gray-700'}`}>
                <div className="text-left">
                  <p className="font-medium">{r.i18n?.[lang] || r.name}</p>
                  <p className="text-xs text-gray-400">{r.currency}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InstallButton() {
  const [prompt, setPrompt] = useState(null)
  const { t } = useLanguage()
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  if (!prompt) return null
  return (
    <button onClick={() => { prompt.prompt(); setPrompt(null) }}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-sm">
      <Download size={16} />
      <span className="hidden sm:inline">{t('installApp')}</span>
    </button>
  )
}

function Nav() {
  const location = useLocation()
  const { t } = useLanguage()
  const { user } = useUser()
  const isOnline = useOnlineStatus()
  const path = location.pathname

  const tabs = [
    { to: '/chat', icon: MessageSquare, label: t('navChat'), match: ['/', '/chat'] },
    { to: '/dashboard', icon: LayoutDashboard, label: t('navDashboard'), match: ['/dashboard'] },
    { to: '/services', icon: Wrench, label: t('navServices') || 'Services', match: ['/services'] },
  ]

  return (
    <nav className="bg-gradient-to-r from-farm-800 to-farm-900 text-white shadow-lg safe-top">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-4 relative">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/Logo.JPG" alt="Farm Buddy" className="w-14 h-14 rounded-full object-cover" />
          <span className="hidden md:inline font-extrabold text-xl tracking-tight">{t('appName')}</span>
        </Link>

        {/* Center — Tabs */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/10 rounded-2xl p-1">
          {tabs.map(tab => {
            const active = tab.match.includes(path)
            return (
              <Link key={tab.to} to={tab.to}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-medium whitespace-nowrap transition-all duration-300 ease-out ${
                  active ? 'bg-white text-farm-800 shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}>
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right — Status, Language, Region, Profile */}
        <div className="flex items-center gap-2">
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-2xl ${isOnline ? 'bg-green-400/15' : 'bg-red-400/15'}`}>
            <span className="text-[9px] uppercase tracking-wider text-white/40">Status</span>
            <span className={`text-sm font-medium ${isOnline ? 'text-green-300' : 'text-red-300'}`}>
              {isOnline ? t('online') : t('offline')}
            </span>
          </div>
          <InstallButton />
          <LanguagePicker />
          <RegionPicker />
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold hover:bg-white/25 transition-colors ml-1">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </Link>
        </div>
      </div>
    </nav>
  )
}

function ProduceBurstLayer() {
  const [bursts, setBursts] = useState([])
  useEffect(() => {
    let nextId = 0
    const spawnProduce = (event) => {
      const x = event.clientX ?? window.innerWidth / 2
      const y = event.clientY ?? window.innerHeight / 2
      const emoji = PRODUCE_EMOJIS[Math.floor(Math.random() * PRODUCE_EMOJIS.length)]
      const drift = Math.round((Math.random() - 0.5) * 90)
      const rotate = Math.round((Math.random() - 0.5) * 80)
      const id = nextId++
      setBursts(c => [...c, { id, emoji, x, y, drift, rotate }])
      setTimeout(() => setBursts(c => c.filter(b => b.id !== id)), 900)
    }
    window.addEventListener('pointerdown', spawnProduce)
    return () => window.removeEventListener('pointerdown', spawnProduce)
  }, [])

  return (
    <div className="produce-burst-layer" aria-hidden="true">
      {bursts.map(b => (
        <span key={b.id} className="produce-burst"
          style={{ left: b.x, top: b.y, '--produce-drift': `${b.drift}px`, '--produce-rotate': `${b.rotate}deg` }}>
          {b.emoji}
        </span>
      ))}
    </div>
  )
}

export default function App() {
  const { isLoggedIn } = useUser()
  if (!isLoggedIn) return <Onboarding />
  return (
    <BrowserRouter>
      <div className="min-h-screen min-h-dvh flex flex-col bg-gray-50">
        <ProduceBurstLayer />
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<FarmerChat />} />
            <Route path="/chat" element={<FarmerChat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services" element={<Services />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
