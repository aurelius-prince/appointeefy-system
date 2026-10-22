import { useState, useRef, useEffect, useCallback } from 'react'
import { Save, Upload, X, Plus, Palette, Globe, Image, AlignLeft, Star, Phone,
  ChevronLeft, ChevronRight, User, Download, Scissors, Clock, PhilippinePeso,
  Trash2, Copy, Check, ArrowRight, Monitor, Smartphone, ExternalLink, PawPrint } from 'lucide-react'
import BookingFooter from '../../components/common/BookingFooter'
import { useService } from '../../context/ServiceContext'
import AdminServices from './AdminServices'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import EasyCrop from 'react-easy-crop'

const ls = (key, fb) => { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fb } catch { return fb } }
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

const THEMES = [
  { name: 'Ocean',     primary: '#2563eb', secondary: '#eff6ff', text: '#1e3a5f' },
  { name: 'Forest',   primary: '#16a34a', secondary: '#f0fdf4', text: '#14532d' },
  { name: 'Rose',     primary: '#e11d48', secondary: '#fff1f2', text: '#881337' },
  { name: 'Violet',   primary: '#7c3aed', secondary: '#f5f3ff', text: '#3b0764' },
  { name: 'Amber',    primary: '#d97706', secondary: '#fffbeb', text: '#78350f' },
  { name: 'Slate',    primary: '#475569', secondary: '#f8fafc', text: '#0f172a' },
  { name: 'Teal',     primary: '#0d9488', secondary: '#f0fdfa', text: '#134e4a' },
  { name: 'Indigo',   primary: '#4338ca', secondary: '#eef2ff', text: '#1e1b4b' },
  { name: 'Pink',     primary: '#db2777', secondary: '#fdf2f8', text: '#831843' },
  { name: 'Cyan',     primary: '#0891b2', secondary: '#ecfeff', text: '#164e63' },
  { name: 'Lime',     primary: '#65a30d', secondary: '#f7fee7', text: '#365314' },
  { name: 'Orange',   primary: '#ea580c', secondary: '#fff7ed', text: '#7c2d12' },
  { name: 'Fuchsia',  primary: '#a21caf', secondary: '#fdf4ff', text: '#4a044e' },
  { name: 'Sky',      primary: '#0284c7', secondary: '#f0f9ff', text: '#0c4a6e' },
  { name: 'Emerald',  primary: '#059669', secondary: '#ecfdf5', text: '#064e3b' },
  { name: 'Red',      primary: '#dc2626', secondary: '#fef2f2', text: '#7f1d1d' },
  { name: 'Warm Gray',primary: '#78716c', secondary: '#fafaf9', text: '#1c1917' },
  { name: 'Brown',    primary: '#92400e', secondary: '#fef3c7', text: '#451a03' },
  { name: 'Navy',     primary: '#1e3a8a', secondary: '#eff6ff', text: '#0f172a' },
  { name: 'Midnight', primary: '#1e1b4b', secondary: '#f5f3ff', text: '#0f0a2e' },
  { name: 'Gold',     primary: '#b45309', secondary: '#fefce8', text: '#713f12' },
  { name: 'Champagne',primary: '#9f7c4a', secondary: '#fdf8f0', text: '#4a3520' },
  { name: 'Sage',     primary: '#4d7c5f', secondary: '#f0f7f2', text: '#1a3326' },
  { name: 'Mauve',    primary: '#9b6b8a', secondary: '#fdf4fb', text: '#4a1f40' },
  { name: 'Onyx',     primary: '#1f2937', secondary: '#f9fafb', text: '#111827' },
  { name: 'Blush',    primary: '#c2607a', secondary: '#fff5f7', text: '#6b1f35' },
  { name: 'Cobalt',   primary: '#1a4fa0', secondary: '#eef3fc', text: '#0d2657' },
  { name: 'Copper',   primary: '#b55a30', secondary: '#fdf3ee', text: '#5c2510' },
  { name: 'Plum',     primary: '#6b2d6b', secondary: '#fdf4fd', text: '#3b0f3b' },
  { name: 'Charcoal', primary: '#374151', secondary: '#f3f4f6', text: '#111827' },
]

// Tab id maps to preview section id for scroll/highlight
const TABS = [
  { id: 'details',       label: 'Details',        previewId: null },
  { id: 'theme',         label: 'Theme',          previewId: null },
  { id: 'availability',  label: 'Availability',   previewId: null },
  { id: 'services',      label: 'Services',       previewId: null },
]

const AVAIL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DEFAULT_HOURS = { Monday:true, Tuesday:true, Wednesday:true, Thursday:true, Friday:true, Saturday:true, Sunday:false }

const fmtDuration = (s) => s?.pricingType === 'per_day'
  ? `${s.duration} day${s.duration > 1 ? 's' : ''}`
  : `${s?.duration ?? s} hr${(s?.duration ?? s) > 1 ? 's' : ''}`

const fmtBlockDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

const compressImage = (file, maxWidth = 1200, quality = 0.8) => new Promise(res => {
  const img = new window.Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    URL.revokeObjectURL(url)
    const scale = Math.min(1, maxWidth / img.width)
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    canvas.toBlob(blob => res(blob), 'image/jpeg', quality)
  }
  img.src = url
})

const uploadToStorage = async (file, accountId) => {
  const blob = await compressImage(file)
  const ext = 'jpg'
  const path = `${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('appointeefy-assets').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('appointeefy-assets').getPublicUrl(path)
  return data.publicUrl
}

const removeFromStorage = async (url) => {
  if (!url || !url.includes('appointeefy-assets')) return
  try {
    const path = url.split('/appointeefy-assets/')[1]
    if (path) await supabase.storage.from('appointeefy-assets').remove([decodeURIComponent(path)])
  } catch {}
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
    {children}
  </div>
)

// ── CopyLinkButton ──────────────────────────────────────────────────────────
function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0
        ${copied ? 'border-green-400 text-green-600 bg-green-50' : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'}`}>
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy Link</>}
    </button>
  )
}

// ── SaveButton ──────────────────────────────────────────────────────────────
function SaveButton({ dirty, onSave }) {
  const [state, setState] = useState('idle') // idle | saving | saved
  const handleClick = async () => {
    if (!dirty || state === 'saving') return
    setState('saving')
    await new Promise(r => setTimeout(r, 600))
    onSave()
    setState('saved')
    setTimeout(() => setState('idle'), 2000)
  }
  return (
    <button onClick={handleClick} disabled={!dirty && state === 'idle'}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${state === 'saved' ? 'bg-green-500 text-white' :
          dirty ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' :
          'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
      {dirty && state === 'idle' && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full border-2 border-white" />}
      <Save size={14} />
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : 'Save Changes'}
    </button>
  )
}

// ── ImageUpload ─────────────────────────────────────────────────────────────
const createCroppedBlob = async (imageSrc, croppedAreaPixels) => {
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  await new Promise(res => { img.onload = res; img.src = imageSrc })
  const canvas = document.createElement('canvas')
  canvas.width = croppedAreaPixels.width
  canvas.height = croppedAreaPixels.height
  canvas.getContext('2d').drawImage(img,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, croppedAreaPixels.width, croppedAreaPixels.height
  )
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85))
}

function ImageUpload({ label, value, onChange, accountId, aspect = 1 }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const openCrop = (file, url) => {
    setCrop({ x: 0, y: 0 }); setZoom(1)
    if (url) { setCropSrc(url); return }
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.readAsDataURL(file)
  }

  const handleCropDone = async () => {
    if (!croppedAreaPixels) return
    setUploading(true); setCropSrc(null)
    try {
      const blob = await createCroppedBlob(cropSrc, croppedAreaPixels)
      const path = `${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const { error } = await supabase.storage.from('appointeefy-assets').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('appointeefy-assets').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch { alert('Upload failed. Please try again.') }
    finally { setUploading(false) }
  }

  const onDrop = (e) => { e.preventDefault(); setDragging(false); openCrop(e.dataTransfer.files[0], null) }

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
      <div
        onClick={() => !value && !uploading && ref.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative w-32 h-32 border-2 border-dashed rounded-xl overflow-hidden transition-colors
          ${value ? 'border-gray-200 cursor-default' : dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-blue-400'}`}>
        {uploading
          ? <div className="flex flex-col items-center justify-center h-full gap-1">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Uploading...</span>
            </div>
          : value
          ? <img src={value} alt="" className="w-full h-full object-cover" />
          : <div className="flex flex-col items-center justify-center h-full gap-1">
              <Upload size={16} className="text-gray-400" />
              <span className="text-xs text-gray-400">Upload</span>
            </div>
        }
      </div>
      {value && !uploading && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => ref.current.click()}
            className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors">Replace</button>
          <button onClick={() => openCrop(null, value)}
            className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-medium transition-colors">Crop</button>
          <button onClick={async () => { await removeFromStorage(value); onChange(null) }}
            className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg font-medium transition-colors">Remove</button>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => openCrop(e.target.files[0])} />
      <p className="text-xs text-gray-400 mt-1">Max 5MB. Auto-compressed.</p>

      {/* Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Crop Image</p>
              <button onClick={() => setCropSrc(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="relative w-full bg-black" style={{ height: 300 }}>
              <EasyCrop
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, px) => setCroppedAreaPixels(px)}
              />
            </div>
            <div className="px-5 py-3">
              <label className="text-xs text-gray-500 mb-1 block">Zoom</label>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))}
                className="w-full accent-blue-600" />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setCropSrc(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCropDone}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Apply & Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MultiImageUpload ────────────────────────────────────────────────────────
function MultiImageUpload({ label, values, onChange, max = 5, accountId }) {
  const ref = useRef()
  const [uploading, setUploading] = useState(false)
  const handleFile = async (e) => {
    const files = Array.from(e.target.files).slice(0, max - values.length)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadToStorage(f, accountId)))
      onChange([...values, ...urls].slice(0, max))
    } catch { alert('Upload failed. Please try again.') }
    finally { setUploading(false); e.target.value = '' }
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label} <span className="text-xs text-gray-400">({values.length}/{max})</span></p>
      <p className="text-xs text-gray-400 mb-2">Max 5MB per photo. Auto-compressed.</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
            <img src={v} alt="" className="w-full h-full object-cover" />
            <button onClick={async () => { await removeFromStorage(v); onChange(values.filter((_, idx) => idx !== i)) }}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <div onClick={() => !uploading && ref.current.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 bg-gray-50 transition-colors">
            {uploading
              ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              : <><Plus size={16} className="text-gray-400" /><span className="text-xs text-gray-400 mt-0.5">Add</span></>
            }
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── SettingsTabs ────────────────────────────────────────────────────────────
function SettingsTabs({ active, onChange }) {
  const tabsRef = useRef()
  const [showFade, setShowFade] = useState(false)
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    const check = () => setShowFade(el.scrollWidth > el.clientWidth && el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [])

  return (
    <div className="relative border-b border-gray-200 bg-white shrink-0">
      {/* Narrow screen: select dropdown */}
      <select
        value={active}
        onChange={e => onChange(e.target.value)}
        className="sm:hidden w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-0 focus:outline-none focus:ring-0">
        {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      {/* Wide screen: scrollable tab bar */}
      <div ref={tabsRef} role="tablist" className="hidden sm:flex overflow-x-auto scrollbar-none px-1 pt-1"
        style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)}
            onKeyDown={e => {
              const idx = TABS.findIndex(x => x.id === t.id)
              if (e.key === 'ArrowRight') onChange(TABS[(idx + 1) % TABS.length].id)
              if (e.key === 'ArrowLeft') onChange(TABS[(idx - 1 + TABS.length) % TABS.length].id)
            }}
            className={`shrink-0 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              ${active === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, white)' }} />
      )}
    </div>
  )
}

// ── PreviewSection (click-to-edit wrapper) ──────────────────────────────────
function PreviewSection({ id, tabId, activeTab, onSelect, children }) {
  const [hovered, setHovered] = useState(false)
  const isActive = activeTab === tabId
  return (
    <div
      id={id}
      onClick={() => onSelect(tabId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer transition-all"
      style={{ outline: isActive ? '2px solid #3b82f6' : hovered ? '2px solid #93c5fd' : '2px solid transparent',
               outlineOffset: '-2px' }}>
      {(hovered || isActive) && (
        <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded pointer-events-none">
          {isActive ? 'Editing' : 'Edit'}
        </div>
      )}
      {children}
    </div>
  )
}

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function MiniCalendar({ primaryColor, selectedStart, selectedEnd, onSelect, hours }) {
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const firstDay = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  const prev = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const next = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  const toStr = (d) => `${view.year}-${String(view.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const monthLabel = new Date(view.year, view.month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const isStart = (d) => toStr(d) === selectedStart
  const isEnd = (d) => toStr(d) === selectedEnd
  const inRange = (d) => { const s = toStr(d); return selectedStart && selectedEnd && s > selectedStart && s < selectedEnd }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <button type="button" aria-label="Previous month" onClick={prev} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ChevronLeft size={18} /></button>
        <span className="font-semibold text-gray-700 text-xs">{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={next} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-gray-400 font-medium py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const s = toStr(d)
          const start = isStart(d), end = isEnd(d), range = inRange(d)
          const dayName = DAY_NAMES[new Date(view.year, view.month, d).getDay()]
          const closed = hours && hours[dayName] === false
          return (
            <button key={i} onClick={() => !closed && onSelect(s)} disabled={closed}
              className={`h-11 w-full rounded text-sm text-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500
                ${closed ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : start || end ? 'text-white font-bold' : range ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              style={!closed && (start || end) ? { background: primaryColor } : !closed && range ? { background: primaryColor + '55' } : {}}>
              {d}
            </button>
          )
        })}
      </div>
      <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5">
        {[['#ef4444','Already booked'],['#f97316','Pending confirmation'],['#22c55e','Available']].map(([color, label]) => (
          <div key={color} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-gray-500" style={{ fontSize: '10px' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewBookingForm({ primaryColor, booking, fbPage, logo, businessName, services, hours, petTypes = [], isMobile = false }) {
  const [step, setStep] = useState(1)
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:00')
  const [form, setForm] = useState({ name: '', contact: '', email: '', address: '', facebook: '', notes: '' })
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set())
  const totalPets = selectedServices.reduce((sum, x) => sum + x.count, 0)
  const toggleServiceId = (id) => setSelectedServiceIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) { next.delete(id); setSelectedServices(p => p.filter(x => x.serviceId !== id)) } else next.add(id)
    return next
  })
  const [errors, setErrors] = useState({})
  const [txn, setTxn] = useState(null)

  const handleSelect = (dateStr) => {
    if (!start || (start && end)) { setStart(dateStr); setEnd(null) }
    else if (dateStr < start) { setStart(dateStr) }
    else { setEnd(dateStr) }
  }

  const fmt = (dateStr) => {
    if (!dateStr) return null
    const [y, m, d] = dateStr.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const days = start && end ? Math.max(1, Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))) : 0
  const totalHours = (() => {
    if (!start || !end) return 0
    const [si] = (startTime || '10:00').split(':').map(Number)
    const [ei] = (endTime || '10:00').split(':').map(Number)
    const startMs = new Date(`${start}T${String(si).padStart(2,'0')}:00:00`).getTime()
    const endMs = new Date(`${end}T${String(ei).padStart(2,'0')}:00:00`).getTime()
    return Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60)))
  })()

  const uniqueServiceIds = [...new Set(selectedServices.map(x => x.serviceId))]
  const totalPrice = uniqueServiceIds.reduce((sum, id) => {
    const svc = services.find(s => s.id === id)
    if (!svc) return sum
    if (svc.pricingType === 'per_hour') return sum + svc.price * Math.max(1, Math.ceil(totalHours / (svc.duration || 1)))
    return sum + svc.price * (days || 1)
  }, 0).toFixed(0)
  const servicesText = selectedServices.filter(s => s.count > 0).map(s => `${s.type} x${s.count} (${s.name})`).join(', ')

  const handleSubmit = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.contact.trim()) e.contact = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (!totalPets) e.services = 'Select at least one pet'
    if (Object.keys(e).length) { setErrors(e); return }
    setTxn('TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase())
  }

  const handleReset = () => {
    setTxn(null); setStart(null); setEnd(null)
    setForm({ name: '', contact: '', email: '', address: '', facebook: '', notes: '' })
    setSelectedServices([]); setErrors({})
  }

  const handleDownload = () => {
    const canvas = document.createElement('canvas')
    const W = 640, pad = 40
    const rows = [['Transaction ID', txn], ['Name', form.name], ['Services', servicesText],
      ['Days', `${days} day${days > 1 ? 's' : ''}`], ['Est. Total', `₱${totalPrice}`],
      ['Contact', form.contact], ['Email', form.email],
      ['Address', form.address],
      ['Check-in', `${fmt(start)} ${startTime}`], ['Check-out', `${fmt(end)} ${endTime}`],
      ...(form.facebook ? [['Facebook', form.facebook]] : []),
      ...(form.notes ? [['Notes', form.notes]] : []),
    ]
    const rowH = 36, headerH = 150, footerH = 60
    const H = headerH + rows.length * rowH + footerH
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = primaryColor; ctx.fillRect(0, 0, W, 8)
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(businessName, W / 2, 35)
    ctx.beginPath(); ctx.arc(W / 2, 80, 28, 0, Math.PI * 2)
    ctx.fillStyle = primaryColor + '22'; ctx.fill()
    ctx.strokeStyle = primaryColor; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(W/2-10, 80); ctx.lineTo(W/2-2, 88); ctx.lineTo(W/2+12, 70); ctx.stroke()
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Booking Submitted!', W / 2, 128)
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, headerH - 10); ctx.lineTo(W - pad, headerH - 10); ctx.stroke()
    rows.forEach(([label, value], i) => {
      const y = headerH + i * rowH + 22
      ctx.textAlign = 'left'; ctx.fillStyle = '#9ca3af'; ctx.font = '13px sans-serif'; ctx.fillText(label, pad, y)
      ctx.fillStyle = i === 0 ? primaryColor : '#1f2937'
      ctx.font = i === 0 ? 'bold 14px sans-serif' : '13px sans-serif'
      ctx.fillText(value, pad + 130, y)
      ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad, y + 10); ctx.lineTo(W - pad, y + 10); ctx.stroke()
    })
    ctx.fillStyle = '#d1d5db'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Save and send this photo to our Facebook page to confirm.', W / 2, H - 20)
    const link = document.createElement('a')
    link.download = `booking-${txn}.png`; link.href = canvas.toDataURL('image/png'); link.click()
  }

  const fbMessage = txn ? encodeURIComponent(
    `Hi! I'd like to confirm my booking.\n\nTransaction ID: ${txn}\nName: ${form.name}\nServices: ${servicesText}\nDays: ${days} day${days > 1 ? 's' : ''}\nEst. Total: ₱${totalPrice}\nCheck-in: ${fmt(start)} ${startTime}\nCheck-out: ${fmt(end)} ${endTime}\nContact: ${form.contact}\n${form.notes ? `Notes: ${form.notes}` : ''}`
  ) : ''
  const fbLink = fbPage
    ? `https://m.me/${fbPage.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '')}?text=${fbMessage}`
    : 'https://www.facebook.com/messages'

  const timeInp = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 bg-gray-50'
  const fieldInp = (key) => `w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 bg-white ${errors[key] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-400'}`

  return (
    <div className="space-y-4">
      {/* Success modal */}
      {txn && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3" style={{ background: primaryColor }}>{businessName?.[0]}</div>
          <p className="font-bold text-gray-800 mb-1">Booking Submitted!</p>
          <p className="text-xs text-gray-400 mb-3">Transaction ID:</p>
          <p className="text-base font-bold tracking-widest mb-4" style={{ color: primaryColor }}>{txn}</p>
          <button onClick={handleReset} className="w-full py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50">Book Again</button>
        </div>
      )}
      {!txn && (
        <div className="flex items-center gap-2 mb-2">
          {[['1','Dates'],['2','Pets & Services'],['3','Your Info']].map(([num, label], i) => {
            const active = step === i+1
            const done = step > i+1
            return (
              <div key={num} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done ? 'text-white' : active ? 'text-white' : 'bg-gray-100 text-gray-400'
                }`} style={active || done ? { background: primaryColor } : {}}>
                  <PawPrint size={15} strokeWidth={2.5} />
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${active ? 'font-bold' : 'text-gray-400'}`}
                  style={active ? { color: primaryColor } : {}}>{label}</span>
                {i < 2 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
              </div>
            )
          })}
        </div>
      )}

      {/* Step 1: Dates */}
      {!txn && step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <label className="text-sm font-semibold text-gray-700 block">Check-in / Check-out</label>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3 items-start`}>
            <MiniCalendar primaryColor={primaryColor} selectedStart={start} selectedEnd={end} onSelect={handleSelect} hours={hours} />
            <div className="space-y-3">
              {[['Check-in', start, startTime, setStartTime], ['Check-out', end, endTime, setEndTime]].map(([label, date, time, setTime]) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5">
                  <p className="text-xs font-semibold mb-2" style={{ color: primaryColor }}>{label}</p>
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
                    {fmt(date) ?? <span className="text-gray-300">Select date</span>}
                  </div>
                  <label className="text-xs text-gray-400 block mt-1">Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 bg-gray-50"
                    style={{ accentColor: primaryColor }} />
                </div>
              ))}
            </div>
          </div>
          <button disabled={!start || !end} onClick={() => setStep(2)}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: primaryColor }}>
            Next: Pets & Services →
          </button>
        </div>
      )}

      {/* Step 2: Pets & Services */}
      {!txn && step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <label className="text-sm font-semibold text-gray-700 block">Services & Pets</label>
          <div className="space-y-2">{services.length === 0 && <p className="text-xs text-gray-300">No services added yet.</p>}
            {services.map(s => {
              const isSelected = selectedServiceIds.has(s.id)
              const max = s.max || 10
              const totalForService = selectedServices.filter(x => x.serviceId === s.id).reduce((sum, x) => sum + x.count, 0)
              return (
                <div key={s.id} className={`border rounded-xl overflow-hidden ${isSelected ? 'border-blue-400' : 'border-gray-200'}`}>
                  <button type="button" onClick={() => toggleServiceId(s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-700">{s.name}</p>
                      <p className="text-xs text-gray-400">₱{s.price?.toLocaleString()}{s.pricingType === 'per_day' ? '/day' : '/hr'}</p>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </button>
                  {isSelected && (
                    <div className="px-3 pb-2.5 pt-2 border-t border-blue-100 space-y-1.5">
                      {(petTypes.length > 0 ? petTypes : ['Dog','Cat']).map(type => {
                        const key = `${s.id}-${type}`
                        const count = selectedServices.find(x => x.key === key)?.count || 0
                        const selectedType = selectedServices.find(x => x.serviceId === s.id)?.type
                        const blocked = !s.mixedTypes && selectedType && selectedType !== type && totalForService > 0
                        const setCount = (val) => {
                          if (blocked) return
                          const next = Math.max(0, Math.min(max - (totalForService - count), val))
                          setSelectedServices(p => {
                            const exists = p.find(x => x.key === key)
                            if (next === 0) return p.filter(x => x.key !== key)
                            if (exists) return p.map(x => x.key === key ? { ...x, count: next } : x)
                            return [...p, { key, serviceId: s.id, name: s.name, price: s.price, type, count: next }]
                          })
                          setErrors(p => ({ ...p, services: '' }))
                        }
                        return (
                          <div key={key} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${blocked ? 'bg-gray-100 opacity-40' : count > 0 ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-gray-100'}`}>
                            <span className="text-xs text-gray-700">{type}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setCount(count-1)} disabled={blocked} className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm font-bold ${count>0&&!blocked?'border-blue-400 text-blue-500':'border-gray-200 text-gray-300 cursor-not-allowed'}`}>−</button>
                              <span className="w-4 text-center text-xs font-semibold">{count}</span>
                              <button onClick={() => setCount(count+1)} disabled={blocked||totalForService>=max} className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm font-bold ${blocked||totalForService>=max?'border-gray-200 text-gray-300 cursor-not-allowed':'border-blue-400 text-blue-500'}`}>+</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {errors.services && <p className="text-xs text-red-400">{errors.services}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">← Back</button>
            <button onClick={() => { if (!totalPets) { setErrors(p=>({...p,services:'Select at least one pet'})); return } setStep(3) }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: primaryColor }}>Next: Your Info →</button>
          </div>
        </div>
      )}

      {/* Step 3: Your Info */}
      {!txn && step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <label className="text-sm font-semibold text-gray-700 block">Your Information</label>
          {[['name','Full Name'],['contact','Contact Number'],['email','Email'],['address','Address']].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
              <input value={form[key]} onChange={e => { setForm(p=>({...p,[key]:e.target.value})); setErrors(p=>({...p,[key]:''})) }}
                className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 bg-white ${errors[key]?'border-red-400 focus:ring-red-400':'border-gray-200 focus:ring-blue-400'}`} />
              {errors[key] && <p className="text-xs text-red-400 mt-0.5">{errors[key]}</p>}
            </div>
          ))}
          {(booking.fields?.facebook?.show ?? booking.showFacebook) && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Facebook Name / Link</label>
              <input value={form.facebook} onChange={e => setForm(p=>({...p,facebook:e.target.value}))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 bg-white" />
            </div>
          )}
          {(booking.fields?.notes?.show ?? booking.showNotes) && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 bg-white resize-none" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">← Back</button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: primaryColor }}>Submit Booking</button>
          </div>
        </div>
      )}

    </div>
  )
}

// Simple preview wrapper that renders the booking page content
function BookingPagePreview({ general, hero, booking, testimony, footer, theme, petSitter, services, petTypes, hours, isMobile, onSectionClick }) {
  const primary   = theme?.primary   || '#2563eb'
  const secondary = theme?.secondary || '#eff6ff'
  const textColor = theme?.text      || '#1e3a5f'
  const heroTint = secondary
  const [heroIdx, setHeroIdx] = useState(0)
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!hero.images || hero.images.length < 2) return
    const t = setInterval(() => setHeroIdx(c => (c + 1) % hero.images.length), 3000)
    return () => clearInterval(t)
  }, [hero.images?.length])

  const Section = ({ id, tab, children, style = {}, className = '' }) => (
    <div
      id={id}
      onClick={() => onSectionClick?.(tab)}
      className={`relative cursor-pointer transition-all duration-150 group ${className}`}
      style={style}
    >
      {/* Hover outline */}
      <div className="absolute inset-0 ring-2 ring-blue-400 ring-offset-0 opacity-0 group-hover:opacity-100 rounded pointer-events-none z-10 transition-opacity" />
      <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 z-20 transition-opacity">Edit</span>
      {children}
    </div>
  )

  const desktopMode = containerWidth >= 640  // responsive to actual container width
  const maxW = 'max-w-[1100px] mx-auto'
  const px = desktopMode ? 'px-10' : 'px-5'
  const py = desktopMode ? 'py-16' : 'py-10'

  return (
    <div ref={containerRef} className={desktopMode ? 'booking-preview-public' : 'booking-preview-public booking-preview-mobile'} style={{ background: '#fff', color: textColor, fontFamily: 'system-ui, sans-serif', minHeight: '100%', display: 'flex', flexDirection: 'column', '--booking-primary': primary, '--booking-text': textColor, '--booking-tint': secondary }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <Section id="prev-navbar" tab="branding">
        <nav className="booking-public-nav bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className={`${maxW} ${px} py-4 flex items-center justify-between`}>
            {/* Logo + name */}
            <div className="flex items-center gap-2.5">
              {general.logo
                ? <img src={general.logo} alt="" className={`h-9 w-9 object-cover ${general.logoShape === 'circle' ? 'rounded-full' : general.logoShape === 'square' ? 'rounded-xl' : 'rounded-md'}`} />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }}>{general.businessName?.[0] || 'A'}</div>
              }
              <span className="font-bold text-base" style={{ color: textColor }}>{general.businessName || 'Your Business'}</span>
            </div>
            {/* Nav links — hide on mobile */}
            {desktopMode && (
              <div className="flex items-center gap-8 text-sm font-medium" style={{ color: textColor }}>
                <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">Home</a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">Testimonials</a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">Book Now</a>
              </div>
            )}
            {/* CTA */}
            <button className="booking-public-nav-cta text-sm font-semibold px-5 py-2 rounded-lg text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: primary }}>
              Book Now
            </button>
          </div>
        </nav>
      </Section>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <Section id="prev-hero" tab="hero" className="booking-public-hero" style={{ background: heroTint }}>
        {/* Dot pattern — desktop only */}
        {desktopMode && <div style={{
          position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${primary}33 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} />}

        {/* Mobile keeps the photo separate from readable headline text. */}
        {!desktopMode && (
          <div className="booking-public-hero-inner relative w-full">
            {/* Background image */}
            <div className="booking-public-hero-image relative h-56 overflow-hidden">
              {hero.images?.[0]
                ? <img src={hero.images[heroIdx]} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primary}, ${primary}88)` }} />
              }
            </div>
            <div className="booking-public-hero-copy relative z-10 flex flex-col items-center px-6 py-8 text-center">
              <span className="booking-public-eyebrow"><PawPrint size={16} aria-hidden="true" /> Loving pet care</span>
              <h1 className="booking-public-hero-title font-extrabold leading-tight mb-3 text-3xl" style={{ color: textColor }}>
                {hero.headline || 'Give Your Pet the Best Care'}
              </h1>
              <p className="booking-public-hero-description text-sm mb-5 text-gray-600 leading-relaxed">
                {hero.subheadline || 'Safe, comfortable, and loving pet service.'}
              </p>
              <button className="booking-public-hero-cta text-sm font-semibold px-6 py-3 rounded-xl text-white shadow-lg"
                style={{ background: primary }}>Book Now</button>
            </div>
            {/* Carousel dots */}
            {hero.images?.length > 1 && (
              <div className="booking-public-hero-dots absolute top-44 left-0 right-0 flex justify-center gap-1.5 z-20">
                {hero.images.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setHeroIdx(i) }}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DESKTOP: split layout ── */}
        {desktopMode && (
          <div className={`relative ${maxW} ${px} ${py}`}>
            <div className="flex flex-row items-center gap-8">
              {/* Text */}
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold mb-4" style={{ color: primary }}><PawPrint size={18} aria-hidden="true" /> Pet sitting</span>
                <h1 className="font-extrabold leading-tight mb-4 text-3xl" style={{ color: textColor }}>
                  {hero.headline || 'Give Your Pet the Best Care'}
                </h1>
                <p className="text-sm mb-4 opacity-70 leading-relaxed" style={{ color: textColor }}>
                  {hero.subheadline || 'Safe, comfortable, and loving pet service.'}
                </p>
                <button className="text-sm font-semibold px-4 py-2.5 rounded-lg text-white shadow-md"
                  style={{ background: primary }}>Book Now</button>
              </div>
              {/* Image */}
              <div className={`${
                  hero.imageShape === 'landscape' ? 'w-[45%] aspect-video' :
                  hero.imageShape === 'portrait'  ? 'w-[35%] aspect-[3/4]' :
                  'w-[40%] aspect-square'
                } rounded-2xl overflow-hidden shrink-0 shadow-lg relative`}
                style={{ background: `${primary}22` }}>
                {hero.images?.length > 0
                  ? <>
                      <img src={hero.images[heroIdx]} alt="" className="w-full h-full object-cover transition-all duration-700" />
                      {hero.images.length > 1 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {hero.images.map((_, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); setHeroIdx(i) }}
                              className="w-2 h-2 rounded-full transition-all"
                              style={{ background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                          ))}
                        </div>
                      )}
                    </>
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: primary }}>
                        {general.businessName?.[0] || 'P'}
                      </div>
                      <p className="text-xs opacity-40" style={{ color: textColor }}>Add a hero image</p>
                    </div>
                }
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <Section id="prev-testimony" tab="testimonials" className="booking-public-reviews" style={{ background: '#fff' }}>
        <div className={`${maxW} ${px} ${py}`}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-50" style={{ color: textColor }}>Reviews</p>
          <h2 className={`font-bold mb-8 ${desktopMode ? 'text-2xl' : 'text-xl'}`} style={{ color: textColor }}>{testimony.title || 'What Our Clients Say'}</h2>
          <div className={`grid ${desktopMode ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
            {(testimony.items?.length > 0 ? testimony.items : [
              { name: 'Maria S.', text: 'Amazing service! My dog loved it.', image: null },
              { name: 'Jose R.', text: 'Very professional and caring staff.', image: null },
              { name: 'Ana C.', text: 'Will definitely come back again!', image: null },
            ]).slice(0, 3).map((t, i) => (
              <div key={i} className="booking-public-review-card rounded-2xl p-5 border border-gray-100 shadow-sm bg-white relative overflow-hidden">
                {/* Quote icon */}
                <div className="absolute top-4 right-4 text-3xl font-serif leading-none opacity-10 select-none"
                  style={{ color: primary }}>"</div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, s) => <span key={s} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-sm leading-relaxed text-gray-600 mb-5 line-clamp-3">{t.text}</p>
                <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                  {t.image
                    ? <img src={t.image} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-offset-1" style={{ ringColor: primary }} />
                    : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                        style={{ background: primary }}>{t.name?.[0]}</div>
                  }
                  <div>
                    <p className="text-sm font-semibold" style={{ color: textColor }}>{t.name}</p>
                    <p className="text-xs text-gray-400">Verified Client</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── About / Pet Sitter ─────────────────────────────────────────── */}
      <Section id="prev-profile" tab="about">
        <div className={`${maxW} ${px} ${py}`}>
          <div className={`flex ${desktopMode ? 'flex-row items-center gap-10' : 'flex-col gap-6'}`}>
            {petSitter.photo
              ? <img src={petSitter.photo} alt="" className={`${desktopMode ? 'w-40 h-40' : 'w-28 h-28'} object-cover shrink-0 ${
                  petSitter.photoShape === 'circle' ? 'rounded-full' :
                  petSitter.photoShape === 'rectangle' ? 'rounded-2xl' : 'rounded-none'
                }`} style={petSitter.photoShape === 'rectangle' ? { width: desktopMode ? '160px' : '112px', height: desktopMode ? '220px' : '154px' } : {}} />
              : <div className={`${desktopMode ? 'w-40 h-40' : 'w-28 h-28'} rounded-2xl flex items-center justify-center text-white font-bold text-3xl shrink-0`} style={{ background: primary }}>
                  {petSitter.name?.[0] || 'P'}
                </div>
            }
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-50" style={{ color: textColor }}>About Us</p>
              <h2 className={`font-bold mb-3 ${desktopMode ? 'text-2xl' : 'text-xl'}`} style={{ color: textColor }}>{petSitter.name || 'Your Name'}</h2>
              <p className="text-base leading-relaxed opacity-70" style={{ color: textColor }}>{petSitter.description || 'Tell clients about yourself and your experience.'}</p>
            </div>
          </div>
          {/* Stats below about */}
          <div className={`grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-gray-100`}>
            {(petSitter.stats?.length > 0 ? petSitter.stats : [
              { value: '500+', label: 'Happy Pets Served' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '5 yrs', label: 'Experience' },
            ]).map(({ value, label }, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: primary }}>{value}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Booking Form ───────────────────────────────────────────────── */}

      {/* ── Booking Form ───────────────────────────────────────────────── */}
      <Section id="prev-booking" tab="booking" style={{ background: heroTint }}>
        <div className={`${maxW} ${px} ${py}`}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-50" style={{ color: textColor }}>Reserve a Spot</p>
          <h2 className={`font-bold mb-2 ${desktopMode ? 'text-2xl' : 'text-xl'}`} style={{ color: textColor }}>{booking.title || 'Book Now'}</h2>
          <p className="text-sm mb-6 opacity-60" style={{ color: textColor }}>{booking.subtitle}</p>
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <PreviewBookingForm
                isMobile={!desktopMode}
                primaryColor={primary}
                booking={booking}
                fbPage={footer.facebook}
                logo={general.logo}
                businessName={general.businessName}
                services={services}
                hours={hours}
                petTypes={petTypes}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Section id="prev-footer" tab="footer" style={{ background: primary }} className="mt-auto">
        <BookingFooter general={general} footer={footer} primary={primary} />
      </Section>

    </div>
  )
}

export default function AdminBookingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const accountId = user?.account_id
  const [tab, setTab] = useState('details')
  const [dirty, setDirty] = useState(false)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [mobileEditorView, setMobileEditorView] = useState('settings')
  const previewRef = useRef()
  const editorRef = useRef()
  const [activeSection, setActiveSection] = useState(null)

  const [general, setGeneralRaw] = useState(() => ls('bp_general', { businessName: "Juan's Pet Care", tagline: 'Trusted pet boarding in your area', logo: null, logoShape: 'circle' }))
  const [hero, setHeroRaw] = useState(() => ls('bp_hero', { headline: 'Give Your Pet the Best Care', subheadline: 'Safe, comfortable, and loving pet boarding service.', images: [], imageShape: 'square' }))
  const [booking, setBookingRaw] = useState(() => ls('bp_booking', {
    title: 'Book Now', subtitle: 'Fill in the form below to reserve a spot for your pet.',
    fields: { name: { show: true, required: true }, contact: { show: true, required: true }, email: { show: true, required: false }, facebook: { show: true, required: false }, notes: { show: true, required: false } }
  }))
  const [testimony, setTestimonyRaw] = useState(() => ls('bp_testimony', {
    title: 'What Our Clients Say', bg: null,
    items: [{ name: 'Maria S.', text: 'Amazing service! My dog loved it.', image: null }, { name: 'Jose R.', text: 'Very professional and caring staff.', image: null }, { name: 'Ana C.', text: 'Will definitely come back again!', image: null }]
  }))
  const [footer, setFooterRaw] = useState(() => ls('bp_footer', { phone: '09171234567', email: 'juan@email.com', address: '123 Mabini St, Quezon City', facebook: 'facebook.com/juanspetcare' }))
  const [theme, setThemeRaw] = useState(() => ls('bp_theme', THEMES[0]))
  const [petSitter, setPetSitterRaw] = useState(() => ls('bp_petSitter', { 
    photo: null, photoShape: 'circle', name: 'Juan dela Cruz', 
    description: 'Passionate pet sitter with 5+ years of experience.',
    stats: [
      { value: '500+', label: 'Happy Pets Served' },
      { value: '4.9★', label: 'Average Rating' },
      { value: '5 yrs', label: 'Experience' },
    ]
  }))
  const [hours, setHours] = useState(() => ls('bp_hours', DEFAULT_HOURS))
  const [allowOverlap, setAllowOverlap] = useState(() => ls('bp_allow_overlap', false))
  const [showOverlapInfo, setShowOverlapInfo] = useState(false)
  const [overlapLang, setOverlapLang] = useState('en')
  const [blocked, setBlocked] = useState([{ id: 1, date: '2024-06-25', reason: 'Holiday' }, { id: 2, date: '2024-07-04', reason: 'Personal leave' }])
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })
  const [availSaved, setAvailSaved] = useState(false)

  const { services, petTypes, setPetTypes, updateService } = useService()
  const [showSvcModal, setShowSvcModal] = useState(false)
  const [svcForm, setSvcForm] = useState({ name: '', price: '', duration: '', desc: '', max: '10', mixedTypes: true, pricingType: 'per_hour' })
  const [svcErrors, setSvcErrors] = useState({})
  const [newPetType, setNewPetType] = useState('')
  const [petTypeError, setPetTypeError] = useState('')

  const petSittingService = services.find(s => s.name === 'Pet Sitting')

  const mk = (setter, key) => (v) => {
    const next = typeof v === 'function' ? v(getter(key)) : v
    setter(next); save(key, next); setDirty(true)
  }
  const getter = (key) => ({ bp_general: general, bp_hero: hero, bp_booking: booking, bp_testimony: testimony, bp_footer: footer, bp_theme: theme, bp_petSitter: petSitter })[key]

  const setGeneral  = (v) => { const n = typeof v === 'function' ? v(general)  : v; setGeneralRaw(n);  save('bp_general',  n); setDirty(true) }
  const setHero     = (v) => { const n = typeof v === 'function' ? v(hero)     : v; setHeroRaw(n);     save('bp_hero',     n); setDirty(true) }
  const setBooking  = (v) => { const n = typeof v === 'function' ? v(booking)  : v; setBookingRaw(n);  save('bp_booking',  n); setDirty(true) }
  const setTestimony= (v) => { const n = typeof v === 'function' ? v(testimony): v; setTestimonyRaw(n);save('bp_testimony',n); setDirty(true) }
  const setFooter   = (v) => { const n = typeof v === 'function' ? v(footer)   : v; setFooterRaw(n);   save('bp_footer',   n); setDirty(true) }
  const setTheme    = (v) => { setThemeRaw(v); save('bp_theme', v); setDirty(true) }
  const setPetSitter= (v) => { const n = typeof v === 'function' ? v(petSitter): v; setPetSitterRaw(n);save('bp_petSitter',n); setDirty(true) }

  const updateTestimony = (i, field, val) =>
    setTestimony(prev => ({ ...prev, items: prev.items.map((t, idx) => idx === i ? { ...t, [field]: val } : t) }))

  const openEditSvc = (s) => {
    setSvcForm({ name: s.name, price: String(s.price), duration: String(s.duration), desc: s.desc, max: String(s.max || 10), mixedTypes: s.mixedTypes ?? true, pricingType: s.pricingType || 'per_hour' })
    setSvcErrors({}); setShowSvcModal(true)
  }
  const handleSaveSvc = () => {
    const e = {}
    if (!svcForm.price || isNaN(svcForm.price) || Number(svcForm.price) <= 0) e.price = 'Enter valid price'
    if (!svcForm.duration || isNaN(svcForm.duration) || Number(svcForm.duration) <= 0) e.duration = 'Enter valid duration'
    if (Object.keys(e).length) { setSvcErrors(e); return }
    updateService(petSittingService.id, svcForm); setShowSvcModal(false)
  }
  const addPetType = () => {
    const t = newPetType.trim()
    if (!t) return
    if (petTypes.map(p => p.toLowerCase()).includes(t.toLowerCase())) { setPetTypeError('Already exists'); return }
    setPetTypes(prev => [...prev, t]); setNewPetType(''); setPetTypeError('')
  }
  const toggleDay = (day) => { setHours(h => ({ ...h, [day]: !h[day] })); setDirty(true) }
  const handleAvailSave = () => { save('bp_hours', hours); save('bp_allow_overlap', allowOverlap); setAvailSaved(true); setTimeout(() => setAvailSaved(false), 2000) }
  const addBlock = () => {
    if (!newBlock.date) return
    setBlocked(prev => [...prev, { id: Date.now(), ...newBlock }]); setNewBlock({ date: '', reason: '' })
  }

  const bookingUrl = (() => {
    const slug = general.businessName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'my-page'
    return `${window.location.origin}/book/${slug}`
  })()

  // Switch tab and scroll preview to section
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    }, 600)
  }

  const handleTabChange = (id) => {
    setTab(id)
  }

  const renderEditor = () => {
    switch (tab) {
      case 'theme': return (
        <div className="space-y-5">
          <div className="admin-page-heading mb-5">
            <h2 className="text-2xl font-bold text-gray-800">Theme</h2>
            <p className="text-sm text-gray-500 mt-0.5">Choose the look and colors of your booking page</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Color palette</p>
            <p className="text-xs text-gray-400 mt-1">Choose a palette for your public booking page.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(palette => (
              <button key={palette.name} type="button" onClick={() => setTheme(palette)}
                className={`text-left rounded-xl border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${theme.name === palette.name ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full border border-white shadow-sm" style={{ background: palette.primary }} />
                  <span className="w-7 h-7 rounded-full border border-gray-100" style={{ background: palette.secondary }} />
                  <span className="w-7 h-7 rounded-full border border-gray-100" style={{ background: palette.text }} />
                </div>
                <p className="text-xs font-semibold text-gray-700">{palette.name}</p>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <p className="text-sm font-semibold text-gray-800">Custom colors</p>
            {[['Primary color','primary'],['Secondary color','secondary'],['Text color','text']].map(([label, key]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-3">
                  <input type="color" value={theme[key]} onChange={e => setTheme(p => ({ ...p, name: 'Custom', [key]: e.target.value }))} className="w-10 h-10 p-0.5 rounded-lg border border-gray-200 bg-white cursor-pointer" />
                  <input value={theme[key]} onChange={e => setTheme(p => ({ ...p, name: 'Custom', [key]: e.target.value }))} className={inp} />
                </div>
              </Field>
            ))}
          </div>
        </div>
      )
      case 'details': return (
        <div className="space-y-0">
          <div className="admin-page-heading mb-5">
            <h2 className="text-2xl font-bold text-gray-800">Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage your business information and booking page details</p>
          </div>
          {/* Header */}
          <div id="editor-header" className="-mx-5 px-5 py-2 mb-4 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">Header</p>
          </div>
          <div className={`space-y-5 pb-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-header' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}` }>
            <ImageUpload label="Logo" value={general.logo} onChange={v => setGeneral(p => ({ ...p, logo: v }))} accountId={accountId} />
            <Field label="Logo Shape">
              <div className="flex gap-2">
                {[['circle','Circle'],['square','Square'],['rectangle','Rectangle']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setGeneral(p => ({ ...p, logoShape: val }))}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      ${general.logoShape === val ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Business Name">
              <input
                value={general.businessName}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30)
                  setGeneral(p => ({ ...p, businessName: val }))
                }}
                maxLength={30}
                placeholder="e.g. Juan Pet Care"
                className={inp}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">Letters, numbers, spaces only</p>
                <p className="text-xs text-gray-400">{general.businessName.length}/30</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">URL: <span className="font-medium text-blue-500">{window.location.origin}/book/{general.businessName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'your-business'}</span></p>
            </Field>
            <Field label="Tagline">
              <input
                value={general.tagline}
                onChange={e => setGeneral(p => ({ ...p, tagline: e.target.value.slice(0, 60) }))}
                maxLength={60}
                placeholder="e.g. Trusted pet boarding in your area"
                className={inp}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{general.tagline.length}/60</p>
            </Field>
          </div>

          <div id="editor-hero" className="-mx-5 px-5 py-2 mt-2 mb-0 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">Hero</p>
          </div>
          {/* Hero */}
          <div className={`space-y-5 py-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-hero' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}`}>
            <Field label="Headline">
              <input value={hero.headline} onChange={e => setHero(p => ({ ...p, headline: e.target.value }))} maxLength={60} className={inp} />
              <p className="text-xs text-gray-400 mt-1 text-right">{hero.headline.length}/60</p>
            </Field>
            <Field label="Sub-headline">
              <textarea value={hero.subheadline} onChange={e => setHero(p => ({ ...p, subheadline: e.target.value }))} maxLength={120} rows={2} className={`${inp} resize-none`} />
              <p className="text-xs text-gray-400 mt-1 text-right">{hero.subheadline.length}/120</p>
            </Field>
            <MultiImageUpload label="Hero Images (up to 5)" values={hero.images} onChange={v => setHero(p => ({ ...p, images: v }))} max={5} accountId={accountId} />
            <Field label="Image Shape">
              <div className="flex gap-2">
                {[['square','Square'],['landscape','Landscape'],['portrait','Portrait']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setHero(p => ({ ...p, imageShape: val }))}
                    className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors
                      ${(hero.imageShape || 'square') === val ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div id="editor-testimonials" className="-mx-5 px-5 py-2 mt-2 mb-0 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">Testimonials</p>
          </div>
          {/* Testimonials */}
          <div className={`space-y-5 py-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-testimonials' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}`}>
            <Field label="Section Title">
              <input value={testimony.title} onChange={e => setTestimony(p => ({ ...p, title: e.target.value.slice(0, 50) }))} maxLength={50} className={inp} />
              <p className="text-xs text-gray-400 mt-1 text-right">{testimony.title.length}/50</p>
            </Field>
            {testimony.items.map((t, i) => (
              <div key={i} className="booking-testimonial-editor-card bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500">Testimonial {i + 1}</p>
                <div className="booking-testimonial-editor-fields flex items-start gap-3">
                  <ImageUpload value={t.image} onChange={v => updateTestimony(i, 'image', v)} accountId={accountId} />
                  <div className="flex-1 space-y-2">
                    <input value={t.name} onChange={e => updateTestimony(i, 'name', e.target.value)} maxLength={40} placeholder="Client name" className={inp} />
                    <textarea value={t.text} onChange={e => updateTestimony(i, 'text', e.target.value)} maxLength={200} placeholder="Testimonial…" rows={2} className={`${inp} resize-none`} />
                    <p className="text-xs text-gray-400 text-right">{t.text.length}/200</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div id="editor-about" className="-mx-5 px-5 py-2 mt-2 mb-0 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">About</p>
          </div>
          {/* About */}
          <div className={`space-y-5 py-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-about' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}`}>
            <ImageUpload label="Profile Photo" value={petSitter.photo} onChange={v => setPetSitter(p => ({ ...p, photo: v }))} accountId={accountId} />
            <Field label="Photo Shape">
              <div className="flex gap-2">
                {[['circle','Circle'],['square','Square'],['rectangle','Rectangle']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setPetSitter(p => ({ ...p, photoShape: val }))}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      ${petSitter.photoShape === val ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Name">
              <input value={petSitter.name} onChange={e => setPetSitter(p => ({ ...p, name: e.target.value }))} maxLength={60} className={inp} />
              <p className="text-xs text-gray-400 mt-1 text-right">{petSitter.name.length}/60</p>
            </Field>
            <Field label="Description">
              <textarea value={petSitter.description} onChange={e => setPetSitter(p => ({ ...p, description: e.target.value }))} maxLength={200} rows={4} className={`${inp} resize-none`} />
              <p className="text-xs text-gray-400 mt-1 text-right">{petSitter.description.length}/200</p>
            </Field>
            {(() => {
              const DEFAULT_STATS = [
                { value: '500+', label: 'Happy Pets Served' },
                { value: '4.9★', label: 'Average Rating' },
                { value: '5 yrs', label: 'Experience' },
              ]
              const stats = petSitter.stats?.length > 0 ? petSitter.stats : DEFAULT_STATS
              const updateStat = (i, field, val) =>
                setPetSitter(p => ({ ...p, stats: (p.stats?.length > 0 ? p.stats : DEFAULT_STATS).map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))
              return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Stats</label>
                  <div className="space-y-3">
                    {stats.map((stat, i) => (
                      <div key={i} className="flex gap-2 items-end">
                        <div className="flex flex-col gap-1 w-24 shrink-0">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Value</span>
                            <span className="text-xs text-gray-400">{stat.value.length}/10</span>
                          </div>
                          <input value={stat.value} onChange={e => updateStat(i, 'value', e.target.value.slice(0, 10))}
                            placeholder="500+" className={`${inp} text-center`} />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Label</span>
                            <span className="text-xs text-gray-400">{stat.label.length}/30</span>
                          </div>
                          <input value={stat.label} onChange={e => updateStat(i, 'label', e.target.value.slice(0, 30))}
                            placeholder="Happy Pets Served" className={inp} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          <div id="editor-booking" className="-mx-5 px-5 py-2 mt-2 mb-0 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">Booking Form</p>
          </div>
          {/* Booking Form */}
          <div className={`space-y-5 py-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-booking' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}`}>
            <Field label="Section Title">
              <input value={booking.title} onChange={e => setBooking(p => ({ ...p, title: e.target.value.slice(0, 50) }))} maxLength={50} className={inp} />
              <p className="text-xs text-gray-400 mt-1 text-right">{booking.title.length}/50</p>
            </Field>
            <Field label="Section Subtitle">
              <textarea value={booking.subtitle} onChange={e => setBooking(p => ({ ...p, subtitle: e.target.value.slice(0, 120) }))} maxLength={120} rows={2} className={`${inp} resize-none`} />
              <p className="text-xs text-gray-400 mt-1 text-right">{booking.subtitle.length}/120</p>
            </Field>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Form Fields</p>
              {[['name','Full Name'],['contact','Contact Number'],['email','Email'],['facebook','Facebook Name / Link'],['notes','Notes / Special Requests']].map(([key, label]) => {
                const f = booking.fields?.[key] || { show: true, required: false }
                const isCore = ['name','contact'].includes(key)
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2">
                    <div className="flex items-center gap-1.5">
                      {f.required && <span className="text-red-500 text-xs font-bold">*</span>}
                      <span className={`text-sm ${f.show ? 'text-gray-700' : 'text-gray-300'}`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.show && (
                        <button disabled={isCore}
                          onClick={() => !isCore && setBooking(p => ({ ...p, fields: { ...p.fields, [key]: { ...f, required: !f.required } } }))}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors focus:outline-none
                            ${f.required ? 'bg-red-50 border-red-300 text-red-500' : 'bg-gray-100 border-gray-200 text-gray-400'}
                            ${isCore ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                          {f.required ? 'Required' : 'Optional'}
                        </button>
                      )}
                      <button disabled={isCore}
                        onClick={() => !isCore && setBooking(p => ({ ...p, fields: { ...p.fields, [key]: { ...f, show: !f.show, required: !f.show ? f.required : false } } }))}
                        className={`form-field-toggle w-9 h-5 rounded-full transition-colors relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                          ${isCore ? 'bg-blue-300 cursor-not-allowed' : f.show ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${f.show ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div id="editor-footer" className="-mx-5 px-5 py-2 mt-2 mb-0 bg-blue-600">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">Footer</p>
          </div>
          {/* Footer */}
          <div className={`space-y-5 py-6 rounded-xl transition-all duration-300 ${activeSection === 'editor-footer' ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100 px-3' : ''}`}>
            {[['Phone','phone','09171234567'],['Email','email','you@email.com'],['Address','address','123 Street, City'],['Facebook Page Link','facebook','https://facebook.com/yourpage']].map(([label, key, ph]) => (
              <Field key={key} label={label}>
                <input value={footer[key]} onChange={e => setFooter(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} className={inp} />
              </Field>
            ))}
          </div>
        </div>
      )
      case 'services': return (
        <AdminServices />
      )
      case 'availability': return (
        <div className="space-y-5">
          <div className="admin-page-heading mb-5">
            <h2 className="text-2xl font-bold text-gray-800">Availability</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage working hours and blocked dates</p>
          </div>
          {/* Working Hours */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Working Days</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                <div key={day} className="flex items-center gap-3 px-4 py-3">
                  <div onClick={() => toggleDay(day)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${hours[day] ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hours[day] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className={`text-sm font-medium w-24 shrink-0 ${hours[day] ? 'text-gray-700' : 'text-gray-400'}`}>{day}</span>
                  {!hours[day] && <span className="text-xs text-gray-400 italic">Closed</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Overlap toggle */}
          <>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-700">Allow Back-to-Back Bookings</p>
                    <button onClick={() => setShowOverlapInfo(true)}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-blue-100 text-gray-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center transition-colors">
                      ?
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">New check-in allowed if after existing check-out, even same day</p>
                </div>
              </div>
              <div role="button" tabIndex={0} aria-pressed={allowOverlap}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAllowOverlap(v => !v) } }}
                onClick={() => setAllowOverlap(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${allowOverlap ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowOverlap ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </>

          {/* Blocked Dates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Blocked Dates</p>
            <div className="flex gap-2 mb-3">
              <input type="date" value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addBlock}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Plus size={14} />
              </button>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {blocked.length === 0
                ? <p className="px-4 py-4 text-sm text-gray-400 text-center">No blocked dates</p>
                : blocked.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-gray-700">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
                    <button onClick={() => setBlocked(prev => prev.filter(x => x.id !== b.id))}
                      className="p-1 text-gray-400 hover:text-red-500 rounded">
                      <X size={14} />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>

          <button onClick={handleAvailSave}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              availSaved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {availSaved ? 'Saved!' : 'Save Availability'}
          </button>
        </div>
      )
      default: return null
    }
  }

  // ── Main JSX ─────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (    <div className="booking-editor flex h-full overflow-hidden bg-gray-100" style={{ marginLeft: 0 }}>

      <div className="booking-mobile-switch" aria-label="Booking page workspace">
        <button type="button" className={mobileEditorView === 'settings' ? 'is-active' : ''} onClick={() => setMobileEditorView('settings')}>Edit page</button>
        <button type="button" className={mobileEditorView === 'preview' ? 'is-active' : ''} onClick={() => { setMobileEditorView('preview'); setPreviewMode('mobile') }}>Preview</button>
      </div>

      {/* ── Preview Panel ─────────────────────────────────────────────── */}
      <div className={`booking-preview-panel flex-1 flex flex-col overflow-hidden ${mobileEditorView !== 'preview' ? 'mobile-hidden' : ''}`}>
        {/* Preview toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <span className="text-xs text-gray-400 truncate max-w-xs min-w-0">{bookingUrl}</span>
          <button onClick={copyLink}
            className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors shrink-0">
            {copied ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy Link</>}
          </button>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" aria-label="Preview booking page in a new tab"
            className="preview-link flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors shrink-0">
            <ExternalLink size={13} /> Preview
          </a>
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[['desktop', Monitor], ['mobile', Smartphone]].map(([m, Icon]) => (
              <button key={m} onClick={() => setPreviewMode(m)}
                className={`preview-mode p-1.5 rounded-md transition-colors ${previewMode === m ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview frame */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-gray-100">
          <div ref={previewRef}
            className={`bg-white shadow-xl overflow-visible transition-all duration-300 ${previewMode === 'mobile' ? 'w-[390px]' : 'w-full max-w-4xl'}`}
            style={{ minHeight: 'max-content' }}>
            <BookingPagePreview
              general={general} hero={hero} booking={booking} testimony={testimony}
              footer={footer} theme={theme} petSitter={petSitter}
              services={services} petTypes={petTypes} hours={hours}
              isMobile={previewMode === 'mobile'}
              onSectionClick={(sectionTab) => {
                const map = {
                  branding: 'editor-header',
                  hero: 'editor-hero',
                  testimonials: 'editor-testimonials',
                  about: 'editor-about',
                  booking: 'editor-booking',
                  footer: 'editor-footer',
                }
                setTab('details')
                setMobileEditorView('settings')
                const editorId = map[sectionTab]
                setActiveSection(editorId || null)
                if (editorId && editorRef.current) {
                  setTimeout(() => {
                    const el = editorRef.current.querySelector(`#${editorId}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }
                setTimeout(() => setActiveSection(null), 2000)
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Settings Panel ────────────────────────────────────────────── */}
      <div className={`booking-settings-panel w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0 ${mobileEditorView !== 'settings' ? 'mobile-hidden' : ''}`}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Booking Page</h2>
            {dirty && <span className="text-xs text-orange-500 font-medium">● Unsaved changes</span>}
          </div>
          <button onClick={handleSave} disabled={!dirty || saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              dirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            {saving ? 'Saving…' : saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
          </button>
        </div>

        {/* Horizontal tab bar */}
        <div className="relative shrink-0 border-b border-gray-100">
          <div className="flex overflow-x-auto scrollbar-hide px-2 pt-1 gap-0.5" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  tab === t.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div ref={editorRef} className="flex-1 overflow-y-auto p-5">
          {renderEditor()}
        </div>
      </div>

      {/* Same-Day Check-in Info Modal */}
      {showOverlapInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowOverlapInfo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-bold text-gray-800">Back-to-Back Bookings</p>
              <button onClick={() => setShowOverlapInfo(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            {/* Visual sample: each overlapping booking keeps its own calendar row. */}
            <div className="mx-5 mb-3 rounded-xl border border-blue-100 bg-blue-50/40 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-2">Sample calendar</p>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-[10px]">
                <div className="grid grid-cols-4">
                  {['21', '22', '23', '24'].map(day => <div key={day} className="border-r border-b border-gray-200 px-2 py-1.5 text-center font-bold text-gray-600 last:border-r-0">{day}</div>)}
                </div>
                <div className="grid grid-cols-4">
                  <div className="col-span-2 border-r border-b border-gray-200 bg-blue-100 px-2 py-1.5 font-semibold text-blue-700">Nala</div>
                  <div className="col-span-2 border-b border-gray-200 bg-blue-100/70 px-2 py-1.5 text-transparent">&nbsp;</div>
                </div>
                <div className="grid grid-cols-4">
                  <div className="border-r border-b border-gray-200 px-2 py-1.5 text-transparent">&nbsp;</div>
                  <div className="col-span-2 border-r border-b border-gray-200 bg-blue-100 px-2 py-1.5 font-semibold text-blue-700">Oreo</div>
                  <div className="border-b border-gray-200 px-2 py-1.5 text-transparent">&nbsp;</div>
                </div>
                <div className="grid grid-cols-4">
                  <div className="col-span-2 border-r border-gray-200 px-2 py-1.5 text-transparent">&nbsp;</div>
                  <div className="col-span-2 bg-yellow-100 px-2 py-1.5 font-semibold text-yellow-700">Poppy</div>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">Each booking has its own straight line. The next check-in starts after the previous check-out time.</p>
            </div>
            {/* Language toggle */}
            <div className="flex mx-5 mb-3 rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              <button onClick={() => setOverlapLang('en')} className={`flex-1 py-1.5 transition-colors ${overlapLang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>🇺🇸 English</button>
              <button onClick={() => setOverlapLang('fil')} className={`flex-1 py-1.5 transition-colors ${overlapLang === 'fil' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>🇵🇭 Filipino</button>
            </div>
            <div className="px-5 pb-5 space-y-3 text-sm">
              {overlapLang === 'fil' ? (
                <>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="font-semibold text-green-700 mb-1">✅ ON</p>
                    <p className="text-gray-600 text-xs leading-relaxed">Pwedeng mag-book ang bagong kliyente kahit same day, <strong>basta ang check-in nila ay pagkatapos ng check-out</strong> ng nakaraang booking.</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="font-semibold text-red-600 mb-1">❌ OFF</p>
                    <p className="text-gray-600 text-xs leading-relaxed">Kapag naka-OFF, ang <strong>buong araw ng check-out</strong> ay bawal para sa bagong booking — kahit anong oras, kahit anong serbisyo. Halimbawa, kung nag-check-out ang kliyente ng Oct 7, hindi na pwede mag-book ng Oct 7 kahit 11:59pm pa.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="font-semibold text-green-700 mb-1">✅ ON</p>
                    <p className="text-gray-600 text-xs leading-relaxed">A new booking is allowed on the same day, <strong>as long as the check-in is after the existing check-out time</strong>.</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="font-semibold text-red-600 mb-1">❌ OFF</p>
                    <p className="text-gray-600 text-xs leading-relaxed">When OFF, the <strong>entire check-out day is blocked</strong> — no new booking is allowed on that day regardless of time or service type. For example, if a client checks out on Oct 7, no one can book Oct 7 even at 11:59pm.</p>
                  </div>
                </>
              )}
              <button onClick={() => setShowOverlapInfo(false)}
                className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
