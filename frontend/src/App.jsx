import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useLanguage } from './lib/LanguageContext'
import { useUser } from './lib/UserContext'
import Onboarding from './pages/Onboarding'
import FarmerChat from './pages/FarmerChat'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Services from './pages/Services'
import Profile from './pages/Profile'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { MessageSquare, LayoutDashboard, ShoppingCart, Wrench, User, ChevronDown, Download, LogOut, Wifi, WifiOff } from 'lucide-react'

function LanguagePicker() {
  const { lang, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const current = languages.find(l => l.code === lang)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm"
      >
        <span className="hidden sm:inline">{current?.nativeName}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-56 py-1 max-h-80 overflow-y-auto">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-farm-50 transition-colors ${l.code === lang ? 'bg-farm-50 font-semibold text-farm-800' : 'text-gray-700'}`}
              >
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
  const { lang } = useLanguage()
  const [open, setOpen] = useState(false)

  if (!user) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm">
        <span className="hidden sm:inline">{region?.i18n?.[lang] || region?.name || 'Region'}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-56 py-1 max-h-80 overflow-y-auto">
            {regions.map(r => (
              <button key={r.code}
                onClick={() => { updateUser({ region: r.code }); setOpen(false) }}
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
    <button
      onClick={() => { prompt.prompt(); setPrompt(null) }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm"
    >
      <Download size={14} />
      <span className="hidden sm:inline">{t('installApp')}</span>
    </button>
  )
}

function Nav() {
  const location = useLocation()
  const { t } = useLanguage()
  const isOnline = useOnlineStatus()
  const path = location.pathname

  const tabs = [
    { to: '/chat', icon: MessageSquare, label: t('navChat'), match: ['/', '/chat'] },
    { to: '/dashboard', icon: LayoutDashboard, label: t('navDashboard'), match: ['/dashboard'] },
    { to: '/marketplace', icon: ShoppingCart, label: t('navMarket') || 'Market', match: ['/marketplace'] },
    { to: '/services', icon: Wrench, label: t('navServices') || 'Services', match: ['/services'] },
    { to: '/profile', icon: User, label: t('navProfile') || 'Profile', match: ['/profile'] },
  ]

  return (
    <nav className="bg-gradient-to-r from-farm-800 to-farm-900 text-white shadow-lg safe-top">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="text-2xl">🌾</span>
          <span className="hidden md:inline">{t('appName')}</span>
        </Link>

        <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-0.5 overflow-x-auto">
          {tabs.map(tab => {
            const active = tab.match.includes(path)
            return (
              <Link key={tab.to} to={tab.to}
                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  active ? 'bg-white text-farm-800 shadow-sm' : 'text-white/70 hover:text-white'
                }`}>
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span className="hidden sm:inline">{isOnline ? t('online') : t('offline')}</span>
          </div>
          <InstallButton />
          <LanguagePicker />
          <RegionPicker />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}

function UserMenu() {
  const { user, logout, region } = useUser()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  if (!user) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm">
        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <span className="hidden sm:inline text-white/80">{user.name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 bg-white rounded-xl shadow-2xl border z-50 w-52 py-2">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="font-medium text-gray-900 text-sm">{user.name}</p>
              <p className="text-xs text-gray-400">{region.flag} {region.name}</p>
            </div>
            <button onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={14} /> {t('navLogout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const { isLoggedIn } = useUser()

  // Show onboarding if not logged in
  if (!isLoggedIn) return <Onboarding />
  return (
    <BrowserRouter>
      <div className="min-h-screen min-h-dvh flex flex-col bg-gray-50">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<FarmerChat />} />
            <Route path="/chat" element={<FarmerChat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/services" element={<Services />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
