import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useLanguage } from './lib/LanguageContext'
import FarmerChat from './pages/FarmerChat'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import Services from './pages/Services'
import { MessageSquare, LayoutDashboard, ShoppingCart, Wrench, ChevronDown, Download } from 'lucide-react'

const PRODUCE_EMOJIS = ['🍅', '🥕', '🍎', '🍓', '🍆', '🥒', '🌽', '🍉', '🍇', '🥬', '🫑', '🍊']

function LanguagePicker() {
  const { lang, setLanguage, languages } = useLanguage()
  const [open, setOpen] = useState(false)
  const current = languages.find(l => l.code === lang)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-base"
      >
        <span className="text-lg">{current?.flag}</span>
        <span className="hidden sm:inline">{current?.nativeName}</span>
        <ChevronDown size={18} className="opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-16 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-64 max-w-[calc(100vw-1rem)] py-1 max-h-[min(20rem,calc(100vh-6rem))] overflow-y-auto">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-farm-50 transition-colors ${l.code === lang ? 'bg-farm-50 font-semibold text-farm-800' : 'text-gray-700'}`}
              >
                <span className="text-lg">{l.flag}</span>
                <div className="min-w-0 text-left">
                  <p className="font-medium">{l.nativeName}</p>
                  <p className="text-xs text-gray-400">{l.name}</p>
                </div>
                {l.code === lang && <span className="ml-auto shrink-0 text-farm-600 text-xs">Active</span>}
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
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-base"
    >
      <Download size={18} />
      <span className="hidden sm:inline">{t('installApp')}</span>
    </button>
  )
}

function Nav() {
  const location = useLocation()
  const { t } = useLanguage()
  const path = location.pathname

  const tabs = [
    { to: '/chat', icon: MessageSquare, label: t('navChat'), match: ['/', '/chat'] },
    { to: '/dashboard', icon: LayoutDashboard, label: t('navDashboard'), match: ['/dashboard'] },
    { to: '/marketplace', icon: ShoppingCart, label: t('navMarket') || 'Market', match: ['/marketplace'] },
    { to: '/services', icon: Wrench, label: t('navServices') || 'Services', match: ['/services'] },
  ]

  return (
    <nav className="bg-gradient-to-r from-farm-800 to-farm-900 text-white shadow-lg safe-top">
      <div className="w-full px-3 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 justify-start">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl shrink-0 text-left">
            <span className="text-3xl">🌾</span>
            <span className="hidden md:inline">{t('appName')}</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1 bg-white/10 rounded-3xl p-1 overflow-x-auto max-w-full">
          {tabs.map(tab => {
            const active = tab.match.includes(path)
            return (
              <Link key={tab.to} to={tab.to}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-5 py-2 rounded-2xl text-sm sm:text-base font-medium transition-all whitespace-nowrap min-w-[44px] ${
                  active ? 'bg-white text-farm-800 shadow-sm' : 'text-white/70 hover:text-white'
                }`}>
                <tab.icon size={18} />
                <span className="hidden lg:inline">{tab.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <InstallButton />
            <LanguagePicker />
          </div>
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

      setBursts((current) => [...current, { id, emoji, x, y, drift, rotate }])
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id))
      }, 900)
    }

    window.addEventListener('pointerdown', spawnProduce)
    return () => window.removeEventListener('pointerdown', spawnProduce)
  }, [])

  return (
    <div className="produce-burst-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="produce-burst"
          style={{
            left: burst.x,
            top: burst.y,
            '--produce-drift': `${burst.drift}px`,
            '--produce-rotate': `${burst.rotate}deg`,
          }}
        >
          {burst.emoji}
        </span>
      ))}
    </div>
  )
}

export default function App() {
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
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/services" element={<Services />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
