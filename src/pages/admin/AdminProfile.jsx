import { useState, useEffect } from 'react'
import { Save, Camera, CheckCircle, User, Phone, MapPin, FileText, Mail, Building2, Hash, CalendarCheck, PawPrint } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function AdminProfile() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isSetup = searchParams.get('setup') === '1'

  const [form, setForm] = useState({ name: '', phone: '', address: '', bio: '', logo: null })
  const [theme, setTheme] = useState('pink')
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.account_id) return
    supabase.from('accounts').select('*').eq('id', user.account_id).single()
      .then(({ data }) => {
        if (data) {
          setAccount(data)
          setForm({ name: data.name || '', phone: data.phone || '', address: data.address || '', bio: data.bio || '', logo: data.logo_url || null })
        }
        const savedTheme = localStorage.getItem(`appointeefy-theme-${user.account_id}`)
        if (savedTheme) setTheme(savedTheme)
        setLoading(false)
      })
  }, [user])

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, logo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('accounts').update({
      name: form.name, phone: form.phone,
      address: form.address || null, bio: form.bio || null, logo_url: form.logo || null,
    }).eq('id', user.account_id)
    setSaving(false)
    localStorage.setItem(`appointeefy-theme-${user.account_id}`, theme)
    window.dispatchEvent(new CustomEvent('appointeefy-theme-change', { detail: theme }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const initials = form.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'P'
  const accountStatus = (account?.status || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  const expiration = account?.status === 'trial' ? account?.trial_ends : account?.subscribed_until
  const expirationLabel = expiration
    ? new Date(String(expiration).includes('T') ? expiration : `${expiration}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No expiration set'

  return (
    <div className="profile-page h-full max-w-4xl mx-auto space-y-3 overflow-y-auto overflow-x-hidden pb-8" style={{ zoom: 0.86 }}>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Account settings</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Business Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Keep your public business details accurate for customers.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 shadow-sm">
          <CheckCircle size={14} className="text-green-500" /> Profile settings
        </div>
      </div>

      {/* Setup Banner */}
      {isSetup && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <CalendarCheck size={22} className="shrink-0" />
            <div>
              <p className="font-semibold">Welcome to Appointeefy! 🎉</p>
              <p className="text-blue-100 text-sm">Complete your profile, then set up your booking page.</p>
            </div>
          </div>
          <button onClick={() => navigate('/booking-page')}
            className="shrink-0 bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-blue-50">
            Next: Booking Page →
          </button>
        </div>
      )}

      {/* Cover + Avatar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="profile-cover h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <PawPrint size={54} strokeWidth={1.5} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/25 rotate-12" />
          <PawPrint size={24} strokeWidth={1.8} className="absolute right-24 top-4 text-white/20 -rotate-12" />
          <PawPrint size={18} strokeWidth={1.8} className="absolute right-3 bottom-3 text-white/20 rotate-45" />
          <span className="absolute right-40 top-5 h-2 w-2 rounded-full bg-white/20" />
          <span className="absolute right-44 bottom-5 h-1.5 w-1.5 rounded-full bg-white/20" />
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-2">
            <div className="relative">
              {form.logo
                ? <img src={form.logo} alt="logo" className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
                : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white shadow-md flex items-center justify-center text-white font-bold text-2xl">
                    {initials}
                  </div>
              }
              <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-md border-2 border-white">
                <Camera size={13} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>
            </div>
            <div className="relative z-10 flex translate-y-12 flex-col items-end gap-1 pb-1">
              <span className={`text-sm font-semibold px-4 py-2 rounded-full ${
                account?.status === 'active' ? 'bg-green-100 text-green-700' :
                account?.status === 'trial' ? 'bg-purple-100 text-purple-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{accountStatus}</span>
              <span className="text-[11px] text-gray-400">Expires {expirationLabel}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{form.name || 'Your Business'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{account?.business_type} · {account?.account_code}</p>
          {form.bio && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{form.bio}</p>}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <User size={18} className="text-blue-600" /> Business Information
            </h3>
            <p className="text-xs text-gray-400 mt-1">These details appear on your booking page and customer communications.</p>
          </div>
          <span className="hidden sm:inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">Public details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Building2 size={14} className="text-gray-400" /> Business Name
            </label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Juan's Pet Care"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Mail size={14} className="text-gray-400" /> Email Address
            </label>
            <input value={form.email || account?.email || ''} disabled
              className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-gray-400" /> Phone Number
            </label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="09171234567"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" /> Address <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="e.g. Quezon City, Metro Manila"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-gray-400" /> Bio <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={2} placeholder="Tell clients about your business and experience..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" />
          </div>

        </div>

        {/* Read-only info */}
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Hash, label: 'Account Code', value: account?.account_code },
            { icon: Building2, label: 'Service Type', value: account?.business_type },
            { icon: CalendarCheck, label: 'Booking Slug', value: account?.slug ? `/book/${account.slug}` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Icon size={12} />
                <span className="text-xs">{label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 truncate">{value || '—'}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Dashboard Theme</p>
          <p className="text-xs text-gray-400 mt-1">Choose the accent color used across your workspace.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['ocean', 'Ocean', '#2563eb'], ['violet', 'Violet', '#7c3aed'], ['emerald', 'Emerald', '#059669'], ['pink', 'Pink', '#ec4899'], ['amber', 'Amber', '#d97706'],
            ].map(([id, label, color]) => (
              <button key={id} type="button" onClick={() => setTheme(id)} className={`relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${theme === id ? 'border-gray-800 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-400'}`}>
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />{label}
                {theme === id && <CheckCircle size={14} className="text-gray-800" aria-label="Selected theme" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm shadow-blue-200">
            {saved
              ? <><CheckCircle size={16} /> Saved!</>
              : saving
              ? 'Saving...'
              : <><Save size={16} /> Save Changes</>
            }
          </button>
        </div>
      </div>

    </div>
  )
}
