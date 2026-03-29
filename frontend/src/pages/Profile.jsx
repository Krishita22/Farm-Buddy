/**
 * Profile page — user info, language/region, farm details, and password management.
 * Uses shared UI components (Button, Card, Alert) for consistent styling.
 */

import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { useUser } from '../lib/UserContext'
import { Button, Card, Alert } from '../components/ui'
import { User, Mail, Phone, Ruler, Lock, Save, Check } from 'lucide-react'

export default function Profile() {
  const { lang, setLanguage, t, languages } = useLanguage()
  const { user, updateUser, logout, regions } = useUser()
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
          soil_type: soilType || null, irrigation_type: irrigation || null,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setMsg(t('saved'))
        setLanguage(selectedLang)
        updateUser({ ...data.user, language: selectedLang, region: selectedRegion })
        setTimeout(() => setMsg(''), 2000)
      }
    } catch { setMsg('Save failed') }
    setSaving(false)
  }

  const handleChangePw = async () => {
    if (!oldPw || !newPw) { setPwMsg(t('obFillFields')); return }
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
        <User size={20} /> {t('profileTitle')}
      </h1>

      {/* Save confirmation */}
      <Alert message={msg === t('saved') ? msg : msg ? msg : null} type={msg === t('saved') ? 'success' : 'error'} />

      <Card variant="solid" className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">{t('personalInfo')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('obName')}</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('obEmail')}</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" value={user?.email || ''} disabled
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('obPhone')}</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
        </div>
      </Card>

      <Card variant="solid" className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">{t('langRegion')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('obChooseLang')}</label>
            <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('obChooseRegion')}</label>
            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              {regions.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card variant="solid" className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">{t('farmDetails')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('farmSize')} ({t('acres')})</label>
            <div className="relative">
              <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="number" value={farmSize} onChange={e => setFarmSize(e.target.value)} placeholder="2.0"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('soilType')}</label>
            <select value={soilType} onChange={e => setSoilType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              <option value="">{t('selectOption')}</option>
              <option value="loam">{t('soilLoam')}</option>
              <option value="clay">{t('soilClay')}</option>
              <option value="sandy">{t('soilSandy')}</option>
              <option value="black_cotton">{t('soilBlackCotton')}</option>
              <option value="laterite">{t('soilLaterite')}</option>
              <option value="sandy_loam">{t('soilSandyLoam')}</option>
              <option value="clay_loam">{t('soilClayLoam')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{t('irrigationType')}</label>
            <select value={irrigation} onChange={e => setIrrigation(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none">
              <option value="">{t('selectOption')}</option>
              <option value="rainfed">{t('irrRainfed')}</option>
              <option value="drip">{t('irrDrip')}</option>
              <option value="sprinkler">{t('irrSprinkler')}</option>
              <option value="canal">{t('irrCanal')}</option>
              <option value="borehole">{t('irrBorehole')}</option>
            </select>
          </div>
        </div>
      </Card>

      <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} className="mb-4">
        {msg === t('saved') ? <><Check size={16} /> {t('saved')}</> : saving ? '...' : <><Save size={16} /> {t('saveChanges')}</>}
      </Button>

      <Card variant="solid" className="p-4 mb-4">
        <button onClick={() => setShowPwSection(!showPwSection)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 w-full">
          <Lock size={14} /> {t('changePassword')}
        </button>
        {showPwSection && (
          <div className="mt-3 space-y-2.5">
            <input type="password" placeholder={t('currentPassword')} value={oldPw} onChange={e => setOldPw(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            <input type="password" placeholder={t('newPasswordLabel')} value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-farm-500 focus:outline-none" />
            <Alert message={pwMsg} type={pwMsg?.includes('success') ? 'success' : 'error'} />
            <Button variant="secondary" size="lg" onClick={handleChangePw} className="bg-gray-800 text-white hover:bg-gray-900 border-0">
              {t('updatePassword')}
            </Button>
          </div>
        )}
      </Card>

      <Button variant="secondary" size="lg" onClick={logout} className="border-2 border-red-200 text-red-600 hover:bg-red-50">
        {t('logout')}
      </Button>
    </div>
  )
}
