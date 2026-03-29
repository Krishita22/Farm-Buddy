import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { User, Mail, Phone, MapPin, Ruler, Mountain, Droplets, Lock, Save, ArrowLeft, Check } from 'lucide-react'

export default function Profile() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { user, updateUser, logout, regions, region } = useUser()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [selectedRegion, setSelectedRegion] = useState(user?.region || 'india_gujarat')
  const [selectedLang, setSelectedLang] = useState(lang)
  const [farmSize, setFarmSize] = useState('')
  const [soilType, setSoilType] = useState('')
  const [irrigation, setIrrigation] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [showPwSection, setShowPwSection] = useState(false)

  // Load profile
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/auth/profile/${user.id}`).then(r => r.json()).then(data => {
        if (data.status === 'ok') {
          setName(data.user.name || '')
          setSelectedRegion(data.user.region || 'india_gujarat')
          setSelectedLang(data.user.language || 'en')
          if (data.farm) {
            setFarmSize(data.farm.size_acres?.toString() || '')
            setSoilType(data.farm.soil_type || '')
            setIrrigation(data.farm.irrigation_type || '')
            setPhone(data.farm.phone || '')
          }
        }
      }).catch(() => {})
    }
  }, [user?.id])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const res = await fetch(`/api/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, language: selectedLang, region: selectedRegion,
          farm_size_acres: farmSize ? parseFloat(farmSize) : null,
          soil_type: soilType || null,
          irrigation_type: irrigation || null,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setMsg('Saved!')
        setLanguage(selectedLang)
        updateUser({ ...data.user, language: selectedLang, region: selectedRegion })
        setTimeout(() => setMsg(''), 2000)
      }
    } catch { setMsg('Save failed') }
    setSaving(false)
  }

  const handleChangePw = async () => {
    if (!oldPw || !newPw) { setPwMsg('Fill both fields'); return }
    setPwMsg('')
    const res = await fetch(`/api/auth/change-password/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
    })
    const data = await res.json()
    setPwMsg(data.message)
    if (data.status === 'ok') { setOldPw(''); setNewPw(''); setShowPwSection(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <User size={20} /> Profile
      </h1>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Personal Info</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" value={user?.email || ''} disabled
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Language & Region</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Language</label>
            <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Region</label>
            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Farm Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Farm Details</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Farm Size (acres)</label>
            <div className="relative">
              <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="number" value={farmSize} onChange={e => setFarmSize(e.target.value)} placeholder="2.0"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Soil Type</label>
            <select value={soilType} onChange={e => setSoilType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              <option value="">Select...</option>
              <option value="loam">Loam</option>
              <option value="clay">Clay</option>
              <option value="sandy">Sandy</option>
              <option value="black_cotton">Black Cotton</option>
              <option value="laterite">Laterite</option>
              <option value="sandy_loam">Sandy Loam</option>
              <option value="clay_loam">Clay Loam</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Irrigation</label>
            <select value={irrigation} onChange={e => setIrrigation(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              <option value="">Select...</option>
              <option value="rainfed">Rainfed</option>
              <option value="drip">Drip</option>
              <option value="sprinkler">Sprinkler</option>
              <option value="canal">Canal</option>
              <option value="borehole">Borehole</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-farm-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-farm-700 disabled:opacity-50 mb-4 shadow-sm text-sm">
        {msg === 'Saved!' ? <><Check size={16} /> Saved!</> : saving ? '...' : <><Save size={16} /> Save Changes</>}
      </button>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
        <button onClick={() => setShowPwSection(!showPwSection)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 w-full">
          <Lock size={14} /> Change Password
        </button>
        {showPwSection && (
          <div className="mt-3 space-y-2.5">
            <input type="password" placeholder="Current password" value={oldPw} onChange={e => setOldPw(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            <input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            {pwMsg && <p className={`text-xs ${pwMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
            <button onClick={handleChangePw}
              className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-900">
              Update Password
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={logout}
        className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50">
        Log Out
      </button>
    </div>
  )
}
