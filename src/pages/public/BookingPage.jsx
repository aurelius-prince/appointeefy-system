import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, PawPrint } from 'lucide-react'
import BookingFooter from '../../components/common/BookingFooter'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ls = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
}

const uniqueBy = (items = [], keyOf) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const receiptPrefix = (name) => {
  const words = String(name || 'Business').trim().split(/\s+/).filter(Boolean)
  const prefix = words.length > 1
    ? words.map((word) => word[0]).join('')
    : words[0].length >= 3 ? words[0].slice(0, 2) + words[0].slice(-1) : words[0]
  return prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(3, 'X')
}

const shortAccountCode = (accountId) => {
  let hash = 0
  for (const char of String(accountId || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash).toString(36).toUpperCase().padStart(2, '0').slice(-2)
}

const receiptNumber = (businessName, accountId, id) => {
  let hash = 0
  for (const char of String(id || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  const sequence = String(Math.abs(hash) % 100000).padStart(5, '0')
  return `${receiptPrefix(businessName)}-${shortAccountCode(accountId)}-${sequence}`
}

function MiniCalendar({ primaryColor, selectedStart, selectedEnd, onSelect, hours, existingBookings = [], allowOverlap = false }) {
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const firstDay = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  const prev = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const next = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  const toStr = (d) => `${view.year}-${String(view.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const monthLabel = new Date(view.year, view.month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isStart = (d) => toStr(d) === selectedStart
  const isEnd = (d) => toStr(d) === selectedEnd
  const inRange = (d) => { const s = toStr(d); return selectedStart && selectedEnd && s > selectedStart && s < selectedEnd }

  const bookingStatusForDay = (d) => {
    const s = toStr(d)
    const matches = existingBookings.filter(b => b.check_in && b.check_out && s >= b.check_in && s <= b.check_out)
    if (matches.some(b => b.status !== 'pending')) return 'approved'
    if (matches.some(b => b.status === 'pending')) return 'pending'
    return null
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <button type="button" aria-label="Previous month" onClick={prev} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg focus-visible:outline focus-visible:outline-2" style={{ outlineColor: primaryColor }}><ChevronLeft size={18} /></button>
        <span className="font-semibold text-gray-800 text-sm">{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={next} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg focus-visible:outline focus-visible:outline-2" style={{ outlineColor: primaryColor }}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-gray-400 font-medium py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const s = toStr(d)
          const start = isStart(d), end = isEnd(d), range = inRange(d)
          const dayName = DAY_NAMES[new Date(view.year, view.month, d).getDay()]
          // Treat today as closed once the current booking day has passed; users can only choose future dates.
          const closed = (hours && hours[dayName] === false) || s <= todayStr
          const bookingStatus = bookingStatusForDay(d)
          const approved = bookingStatus === 'approved'
          const pending = bookingStatus === 'pending'
          const approvedHasCheckout = approved && existingBookings.some(b =>
            b.status !== 'pending' && b.check_out === s &&
            !existingBookings.some(next => next.status !== 'pending' && next.check_in === s)
          )
          const approvedBlocked = approved && (!allowOverlap || !approvedHasCheckout)
          return (
            <button key={i} type="button" aria-label={`${new Date(view.year, view.month, d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}${closed ? ', unavailable' : approvedBlocked ? ', booked and unavailable' : approvedHasCheckout ? ', booked, back-to-back available after checkout' : pending ? ', pending booking' : ''}`} aria-pressed={start || end}
            onClick={() => !closed && (!approved || (allowOverlap && approvedHasCheckout)) && onSelect(s)} disabled={closed || approvedBlocked}
              className={`h-10 w-full rounded-lg text-center text-sm transition-colors relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${closed ? 'text-gray-300 bg-gray-100 cursor-not-allowed' : approvedBlocked ? 'text-white font-bold bg-red-500 cursor-not-allowed' : approvedHasCheckout ? 'text-red-700 font-bold bg-red-100 hover:bg-red-200' : pending && (start || end) ? 'text-white font-bold bg-orange-500 hover:bg-orange-600' : pending ? 'text-orange-900 bg-orange-100 hover:bg-orange-200' : start || end ? 'text-white font-bold' : range ? 'text-white' : 'text-green-900 bg-green-200 hover:bg-green-300 font-semibold'}`}
              style={!closed && !approved && !pending && (start || end) ? { background: primaryColor } : !closed && !approved && !pending && range ? { background: primaryColor + '55' } : {}}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingPage() {
  const { slug } = useParams()
  const [dbServices, setDbServices] = useState(null)
  const [dbPetTypes, setDbPetTypes] = useState(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [existingBookings, setExistingBookings] = useState([])

  // Fetch services from Supabase by slug
  useEffect(() => {
    const fetchBySlug = async () => {
      try {
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('slug', slug)
          .single()
        if (!account) { setDbLoading(false); return }
      setAccountId(account.id)

        const { data: svcs } = await supabase
          .from('services')
          .select('*')
          .eq('account_id', account.id)
          .order('created_at', { ascending: true })

        const { data: pts } = await supabase
          .from('provider_pet_types')
          .select('name')
          .eq('account_id', account.id)

        if (svcs) setDbServices(uniqueBy(svcs, s => s.id || `${s.name}-${s.price}-${s.duration}`).map(s => ({
          ...s,
          desc: s.description || '',
          pricingType: s.pricing_type || 'per_day',
          max: s.max_pets || 10,
          mixedTypes: s.mixed_types ?? true,
        })))
        if (pts) setDbPetTypes(uniqueBy(pts, p => String(p.name || '').trim().toLowerCase()).map(p => p.name))

        const { data: apts } = await supabase
          .from('appointments')
          .select('check_in, check_out, time, end_time, status, pricing_type')
          .eq('account_id', account.id)
          .in('status', ['pending', 'approved', 'confirmed', 'awaiting payment', 'paid'])
        if (apts) setExistingBookings(uniqueBy(apts, a => `${a.check_in}|${a.check_out}|${a.time}|${a.end_time}|${a.status}`))
      } catch (e) {
        console.error('fetchBySlug error:', e)
      } finally {
        setDbLoading(false)
      }
    }
    if (slug) fetchBySlug()
    else setDbLoading(false)
  }, [slug])

  const general   = ls('bp_general',   { businessName: 'Pet Care', tagline: '', logo: null, logoShape: 'circle' })
  const hero      = ls('bp_hero',      { headline: 'Give Your Pet the Best Care', subheadline: '', images: [], bg: null })
  const booking   = ls('bp_booking',   { title: 'Book Now', subtitle: '', showFacebook: true, showNotes: true })
  const testimony = ls('bp_testimony', { title: 'What Our Clients Say', bg: null, items: [] })
  const footer    = ls('bp_footer',    { phone: '', email: '', address: '', facebook: '' })
  const theme     = ls('bp_theme',     { primary: '#2563eb', secondary: '#eff6ff', text: '#1e3a5f' })
  const petSitter = ls('bp_petSitter', { photo: null, photoShape: 'circle', name: '', description: '' })
  const services  = dbServices ?? []
  const petTypes  = dbPetTypes ?? ls('svc_petTypes', ['Dog', 'Cat'])
  const hours        = ls('bp_hours',        { Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: true, Sunday: false })
  const allowOverlap  = ls('bp_allow_overlap', false)

  const [step, setStep] = useState(1)
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:00')
  const [form, setForm] = useState({ name: '', contact: '', email: '', address: '', facebook: '', notes: '' })
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set())
  const toggleServiceId = (id) => setSelectedServiceIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
      setSelectedServices(p => p.filter(x => x.serviceId !== id))
    } else next.add(id)
    return next
  })
  const [errors, setErrors] = useState({})
  const [txn, setTxn] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [heroIdx, setHeroIdx] = useState(0)

  useEffect(() => {
    if (hero.images.length < 2) return
    const t = setInterval(() => setHeroIdx(c => (c + 1) % hero.images.length), 3000)
    return () => clearInterval(t)
  }, [hero.images.length])

  const handleSelect = (dateStr) => {
    if (!start || (start && end)) { setStart(dateStr); setEnd(null) }
    else if (dateStr < start) { setStart(dateStr) }
    else { setEnd(dateStr) }
  }

  // Check if a proposed time range overlaps any existing booking
  const checkOverlap = (s, e, sTime, eTime) => {
    if (!s || !e) return false
    return existingBookings.some(b => {
      if (b.status === 'pending') return false
      if (!b.check_in || !b.check_out) return false

      if (allowOverlap) {
        // back-to-back ON: blocked only if new booking overlaps existing datetime range
        const newStart = new Date(`${s}T${sTime}:00`).getTime()
        const newEnd   = new Date(`${e}T${eTime}:00`).getTime()
        const bStart   = new Date(`${b.check_in}T${b.time || '00:00'}:00`).getTime()
        const bEnd     = new Date(`${b.check_out}T${b.end_time || '00:00'}:00`).getTime()
        return newStart < bEnd && newEnd > bStart
      }

      // back-to-back OFF: block entire day range
      return s <= b.check_out && e >= b.check_in
    })
  }
  const hasOverlap = checkOverlap(start, end, startTime, endTime)
  const hasPendingOverlap = start && end && existingBookings.some(b => b.status === 'pending' && b.check_in && b.check_out && start <= b.check_out && end >= b.check_in)

  const fmt = (dateStr) => {
    if (!dateStr) return null
    const [y, m, d] = dateStr.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getCount = (id) => selectedServices.find(x => x.id === id)?.count || 0
  const totalPets = selectedServices.reduce((sum, x) => sum + x.count, 0)
  // Per-day bookings are inclusive: Oct 28 → Oct 29 counts as 2 service days.
  const days = start && end ? Math.max(1, Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1) : 0

  // Compute total hours including time (for per_hour services)
  const totalHours = (() => {
    if (!start || !end) return 0
    const [si, sm] = (startTime || '10:00').split(':').map(Number)
    const [ei, em] = (endTime || '10:00').split(':').map(Number)
    const startMs = new Date(`${start}T${String(si).padStart(2,'0')}:${String(sm).padStart(2,'0')}:00`).getTime()
    const endMs = new Date(`${end}T${String(ei).padStart(2,'0')}:${String(em).padStart(2,'0')}:00`).getTime()
    return Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60)))
  })()

  const uniqueServices = [...new Map(selectedServices.map(x => [x.serviceId, x])).values()]
  const primaryPricingType = uniqueServices[0]
    ? (services.find(s => s.id === uniqueServices[0].serviceId)?.pricingType || 'per_day')
    : 'per_day'
  const totalPrice = uniqueServices.reduce((sum, x) => {
    const svc = services.find(s => s.id === x.serviceId)
    if (!svc) return sum
    if (svc.pricingType === 'per_hour') {
      const blocks = Math.max(1, Math.ceil(totalHours / (svc.duration || 1)))
      return sum + (svc.price * blocks)
    }
    return sum + (svc.price * (days || 1))
  }, 0).toFixed(0)
  const servicesText = selectedServices.filter(s => s.count > 0).map(s => `${s.type} (${s.name}) x${s.count}`).join(', ')

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.contact.trim()) e.contact = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if ((booking.fields?.email?.required ?? false) && !form.email.trim()) e.email = 'Required'
    if (booking.fields?.facebook?.required && !form.facebook.trim()) e.facebook = 'Required'
    if (booking.fields?.notes?.required && !form.notes.trim()) e.notes = 'Required'
    if (!totalPets) e.services = 'Please select at least one pet'
    return e
  }

  const continueToServices = () => {
    if (!start || !end) {
      setErrors(prev => ({ ...prev, dates: 'Choose both a check-in and check-out date to continue.' }))
      return
    }
    const closedDates = []
    for (let cursor = new Date(`${start}T00:00:00`); cursor <= new Date(`${end}T00:00:00`); cursor.setDate(cursor.getDate() + 1)) {
      const dayName = DAY_NAMES[cursor.getDay()]
      if (hours?.[dayName] === false) closedDates.push(dayName)
    }
    if (closedDates.length) {
      setErrors(prev => ({ ...prev, dates: `This booking range includes a closed day (${[...new Set(closedDates)].join(', ')}). Choose dates within your available working days.` }))
      return
    }
    if (hasOverlap) {
      setErrors(prev => ({ ...prev, dates: 'These dates overlap an existing booking. Please choose another time.' }))
      return
    }
    if (start === end && endTime <= startTime) {
      setErrors(prev => ({ ...prev, dates: 'Check-out time must be later than check-in time for a same-day booking.' }))
      return
    }
    setErrors(prev => ({ ...prev, dates: '' }))
    setStep(2)
  }

  const continueToDetails = () => {
    if (!totalPets) {
      setErrors(prev => ({ ...prev, services: 'Choose a service and add at least one pet to continue.' }))
      return
    }
    setErrors(prev => ({ ...prev, services: '' }))
    setStep(3)
  }

  const handleSubmit = async () => {
    if (submitting) return
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (start === end && endTime <= startTime) {
      setErrors(prev => ({ ...prev, dates: 'Check-out time must be later than check-in time for a same-day booking.' }))
      setStep(1)
      return
    }
    setSubmitting(true)
    const newTxn = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase()

    const apt = {
      account_id: accountId,
      txn_code: newTxn,
      customer_name: form.name,
      customer_phone: form.contact,
      customer_email: form.email,
      // Keep the address in the existing notes field until the appointments
      // table has a dedicated address column. BookingContext parses this for
      // appointment details and calendar city labels.
      notes: [form.address ? `Address: ${form.address}` : '', form.notes].filter(Boolean).join('\n'),
      customer_facebook: form.facebook,
      pet: selectedServices.map(s => `${s.type} x${s.count}`).join(', '),
      pet_type: selectedServices.map(s => s.type).filter((v,i,a) => a.indexOf(v) === i).join(', '),
      service_name: selectedServices[0]?.name || '',
      date: start,
      time: startTime,
      check_in: start,
      check_out: end,
      end_time: endTime,
      pricing_type: primaryPricingType,
      duration: primaryPricingType === 'per_day' || primaryPricingType === 'daily' ? days * 24 : totalHours,
      base_price: Number(totalPrice),
      final_price: Number(totalPrice),
      status: 'pending',
    }

    try {
      const { error } = await supabase.from('appointments').insert(apt)
      if (error) {
        console.error('Booking error:', error)
        alert(`Failed to submit booking. ${error.message || 'Please try again.'}`)
        return
      }
      setTxn(newTxn)
    } catch (err) {
      console.error('Booking error:', err)
      alert(`Failed to submit booking. ${err?.message || 'Please try again.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setTxn(null); setStart(null); setEnd(null); setStep(1)
    setForm({ name: '', contact: '', email: '', address: '', facebook: '', notes: '' })
    setSelectedServices([]); setSelectedServiceIds(new Set()); setErrors({})
  }

  const invoiceRef = useRef(null)

  const receiptNo = txn ? receiptNumber(general.businessName, accountId, txn) : ''

  const handleSaveImage = async () => {
    if (!invoiceRef.current) return
    const domtoimage = (await import('dom-to-image-more')).default
    const dataUrl = await domtoimage.toJpeg(invoiceRef.current, { quality: 0.95, scale: 2, bgcolor: '#ffffff' })
    const link = document.createElement('a')
    link.download = `${receiptNo}.jpg`
    link.href = dataUrl
    link.click()
  }

  const fbMessage = txn ? encodeURIComponent(
    `Hi! I'd like to confirm my booking.\n\nTransaction ID: ${receiptNo}\nName: ${form.name}\nServices: ${servicesText}\nDays: ${days} day${days > 1 ? 's' : ''}\nEst. Total: ₱${totalPrice}\nCheck-in: ${fmt(start)} ${startTime}\nCheck-out: ${fmt(end)} ${endTime}\nContact: ${form.contact}\n${form.notes ? `Notes: ${form.notes}` : ''}`
  ) : ''

  const fbLink = footer.facebook
    ? `https://m.me/${footer.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '')}?text=${fbMessage}`
    : `https://www.facebook.com/messages`

  const inp = (key) => `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${errors[key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-blue-300'}`
  const shapeClass = general.logoShape === 'circle' ? 'rounded-full' : general.logoShape === 'square' ? 'rounded-xl' : 'rounded-lg'

  return (
    <div className="booking-public flex flex-col min-h-screen" style={{ background: theme.secondary, '--booking-primary': theme.primary, '--booking-text': theme.text, '--booking-tint': theme.secondary }}>
      {/* Nav */}
      <nav className="booking-public-nav shrink-0 z-40 px-5 py-4 md:px-10 md:py-5 flex items-center justify-between" style={{ background: theme.primary }}>
        <div className="flex items-center gap-2">
          {(() => {
            const sc = general.logoShape === 'circle' ? 'rounded-full' : general.logoShape === 'square' ? 'rounded-none' : 'rounded-lg'
            const sz = general.logoShape === 'rectangle' ? 'w-12 h-8 md:w-16 md:h-11' : 'w-9 h-9 md:w-12 md:h-12'
            return general.logo
              ? <img src={general.logo} alt="" className={`${sz} ${sc} object-cover shrink-0`} />
              : <div className={`${sz} ${sc} bg-white/20 flex items-center justify-center text-white font-bold text-base shrink-0`}>{general.businessName.charAt(0)}</div>
          })()}
          <div>
            <p className="font-bold text-white text-sm md:text-lg leading-tight">{general.businessName}</p>
            <p className="text-white/60 text-xs hidden md:block">{general.tagline}</p>
          </div>
        </div>
        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {[['Home','#'],['Testimony','#testimony'],['Book Now','#book']].map(([label, href], i) => (
            <a key={label} href={href}
              className={`text-sm font-medium transition-colors ${
                i === 2 ? 'bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-full' : 'text-white/80 hover:text-white'
              }`}>{label}</a>
          ))}
        </div>
        {/* Mobile Book Now */}
        <a href="#book" className="booking-public-nav-cta md:hidden min-h-11 inline-flex items-center bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 rounded-full">Book Now</a>
      </nav>

      {/* Scrollable content */}
      <div>
      {/* Hero + Testimony + Profile — seamless */}
      <div className="booking-public-landing relative overflow-hidden" style={{ background: theme.secondary }}>
        <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl -top-20 -left-20" style={{ background: theme.primary }} />
        <div className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl top-1/3 left-1/2" style={{ background: theme.primary }} />
        <div className="absolute w-80 h-80 rounded-full opacity-10 blur-3xl top-2/3 -right-10" style={{ background: theme.primary }} />
        <div className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl bottom-20 left-1/4" style={{ background: theme.primary }} />

        {/* Hero */}
        <div className="booking-public-hero flex flex-col md:grid md:grid-cols-2 relative z-10 md:min-h-[calc(100vh-56px)]">
          {/* Mobile: image first */}
          <div className="booking-public-hero-image md:hidden relative w-full h-56 bg-gray-200">
            {hero.images.length > 0
              ? <img src={hero.images[heroIdx]} alt="" className="absolute inset-0 w-full h-full object-cover transition-all duration-700" />
              : <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
            }
            {hero.images.length > 1 && (
              <div className="booking-public-hero-dots absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                {hero.images.map((_, i) => (
                  <button key={i} onClick={() => setHeroIdx(i)} className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.5)', transform: i === heroIdx ? 'scale(1.3)' : 'scale(1)' }} />
                ))}
              </div>
            )}
          </div>
          <div className="booking-public-hero-copy flex flex-col justify-center items-center text-center px-6 py-10 md:px-12 md:py-16">
            <span className="booking-public-eyebrow inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold mb-4" style={{ color: theme.text }}><PawPrint size={16} aria-hidden="true" /> Loving pet care</span>
            {general.tagline && <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] mb-3" style={{ color: theme.primary }}>{general.tagline}</p>}
            <h1 className="booking-public-hero-title font-extrabold text-3xl md:text-5xl leading-tight mb-4" style={{ color: theme.text }}>{hero.headline}</h1>
            {hero.subheadline && <p className="booking-public-hero-description text-gray-600 mb-7 text-base md:text-lg max-w-md leading-relaxed">{hero.subheadline}</p>}
            <a href="#book" className="booking-public-hero-cta px-7 py-3 md:px-9 md:py-3.5 rounded-full text-white text-sm md:text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" style={{ background: theme.primary }}>Book a stay <span aria-hidden="true">→</span></a>
            <p className="mt-3 text-xs text-gray-500">Choose your dates and services in a few simple steps.</p>
          </div>
          {/* Desktop: image on right */}
          <div className="hidden md:flex items-center justify-center py-12 pr-12">
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-xl bg-gray-200">
              {hero.images.length > 0
                ? <img src={hero.images[heroIdx]} alt="" className="absolute inset-0 w-full h-full object-cover transition-all duration-700" />
                : <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
              }
              {hero.images.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {hero.images.map((_, i) => (
                    <button key={i} onClick={() => setHeroIdx(i)} className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.5)', transform: i === heroIdx ? 'scale(1.3)' : 'scale(1)' }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Testimony */}
        {testimony.items.length > 0 && (
          <div id="testimony" className="booking-public-reviews px-6 py-10 md:px-16 md:py-12 relative z-10 bg-white">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-center mb-8" style={{ color: theme.text }}>{testimony.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
                {testimony.items.map((t, i) => (
                  <div key={i} className="booking-public-review-card bg-white rounded-2xl p-8 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                      {t.image
                        ? <img src={t.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                        : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold" style={{ background: theme.primary }}>{t.name.charAt(0)}</div>
                      }
                      <span className="text-base font-semibold text-gray-700">{t.name}</span>
                    </div>
                    <p className="text-base text-gray-500 leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pet Sitter */}
        {petSitter.name && (
          <div id="profile" className="px-6 py-10 md:px-16 md:py-20 relative z-10">
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 items-center max-w-5xl mx-auto">
              <div className="flex justify-center">
                {(() => {
                  const sc = petSitter.photoShape === 'circle' ? 'rounded-full' : petSitter.photoShape === 'square' ? 'rounded-none' : 'rounded-2xl'
                  const sz = petSitter.photoShape === 'rectangle' ? 'w-40 h-56 md:w-56 md:h-80' : 'w-48 h-48 md:w-72 md:h-72'
                  return petSitter.photo
                    ? <img src={petSitter.photo} alt="" className={`${sz} ${sc} object-cover border-4 border-white shadow-xl`} />
                    : <div className={`${sz} ${sc} border-4 border-white shadow-xl flex items-center justify-center text-6xl md:text-8xl font-bold text-white`} style={{ background: theme.primary }}>{petSitter.name.charAt(0)}</div>
                })()}
              </div>
              <div className="text-center md:text-left">
                <p className="font-extrabold text-2xl md:text-4xl leading-tight mb-3" style={{ color: theme.text }}>{petSitter.name}</p>
                <p className="text-sm md:text-base leading-relaxed text-gray-500">{petSitter.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Form */}
      <div id="book" className="px-4 py-12 md:px-8 md:py-20 max-w-5xl mx-auto scroll-mt-6">
        <div className="max-w-2xl mx-auto text-center mb-8 md:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: theme.primary }}>Simple booking</p>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">{booking.title}</h2>
          <p className="text-sm md:text-base text-gray-500">{booking.subtitle || 'Choose your dates, tell us about your pets, and send your request.'}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <ol aria-label="Booking progress" className="booking-progress flex items-center gap-2 mb-5 md:mb-7">
            {[['1','Dates'],['2','Pets & services'],['3','Your details']].map(([num, label], i) => {
              const active = step === i + 1
              const done = step > i + 1
              return [
                <li key={num} aria-current={active ? 'step' : undefined} className="booking-progress-step flex items-center gap-2 min-w-0 shrink-0">
                  <span className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 ${done || active ? 'text-white' : 'bg-white text-gray-400 border border-gray-200'}`} style={done || active ? { background: theme.primary } : {}} aria-label={`Step ${num}`}><PawPrint size={16} strokeWidth={2.5} /></span>
                  <span className={`text-[11px] md:text-sm leading-tight ${active ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{label}</span>
                </li>,
                i < 2 && <li key={`${num}-connector`} aria-hidden="true" className="booking-progress-connector flex-1 h-0.5 min-w-2 rounded-full" />
              ]
            })}
          </ol>

          <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg shadow-gray-200/60 border border-gray-100 p-4 sm:p-6 md:p-8">
            {step === 1 && <section aria-labelledby="booking-dates-title" className="space-y-5">
              <div><h3 id="booking-dates-title" className="text-lg md:text-xl font-bold text-gray-900">When do you need care?</h3><p className="text-sm text-gray-500 mt-1">Select check-in and check-out dates. You can adjust the times below.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4 items-start">
                <MiniCalendar primaryColor={theme.primary} selectedStart={start} selectedEnd={end} onSelect={date => { handleSelect(date); setErrors(prev => ({ ...prev, dates: '' })) }} hours={hours} existingBookings={existingBookings} allowOverlap={allowOverlap} />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                  {[
                    ['Check-in', start, startTime, setStartTime],
                    ['Check-out', end, endTime, setEndTime],
                  ].map(([label, date, time, setTime]) => <div key={label} className="rounded-xl border border-gray-200 p-3 md:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: theme.primary }}>{label}</p>
                    <p className="text-sm font-semibold text-gray-800 min-h-5">{fmt(date) || <span className="font-normal text-gray-400">Choose on calendar</span>}</p>
                    <label className="text-xs text-gray-500 block mt-3 mb-1">Time</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full min-h-11 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>)}
                </div>
              </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Open slot</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-200 border border-orange-300" /> Pending request</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Allowed after last checkout</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Approved / blocked</span>
                    </div>
              {(hasOverlap || hasPendingOverlap || errors.dates) && <p role="alert" className={`px-3 py-2.5 rounded-xl border text-sm ${hasOverlap ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>{errors.dates || (hasOverlap ? 'These dates are already approved and blocked. Please choose another time.' : 'A pending booking request exists for these dates. Your request may be booked together or may require provider approval.')}</p>}
              <div className="flex justify-end pt-1"><button type="button" onClick={continueToServices} className="w-full sm:w-auto min-h-12 px-6 rounded-xl text-white font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: theme.primary }}>Choose services <span aria-hidden="true">→</span></button></div>
            </section>}

            {step === 2 && <section aria-labelledby="booking-services-title" className="space-y-5">
              <div><h3 id="booking-services-title" className="text-lg md:text-xl font-bold text-gray-900">Tell us about your pets</h3><p className="text-sm text-gray-500 mt-1">Choose a service, then add the number of each pet type.</p></div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600"><span><strong className="text-gray-800">Dates:</strong> {fmt(start)} – {fmt(end)}</span><span><strong className="text-gray-800">Stay:</strong> {days} day{days === 1 ? '' : 's'}</span><button type="button" onClick={() => setStep(1)} className="ml-auto font-semibold underline underline-offset-2" style={{ color: theme.primary }}>Edit dates</button></div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Available services</p>
                <div className="space-y-3">
                  {dbLoading && <p className="text-sm text-gray-500">Loading services…</p>}
                  {!dbLoading && services.length === 0 && <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">No services are available right now. Please contact the provider.</p>}
                  {services.map(s => {
                    const isSelected = selectedServiceIds.has(s.id)
                    const max = s.max || 10
                    const totalForService = selectedServices.filter(x => x.serviceId === s.id).reduce((sum, x) => sum + x.count, 0)
                    return <div key={s.id} className={`border rounded-2xl overflow-hidden transition-colors ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                      <button type="button" aria-pressed={isSelected} onClick={() => toggleServiceId(s.id)} className={`w-full min-h-16 flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                        <span><span className="block text-sm font-semibold text-gray-800">{s.name}</span><span className="block text-xs text-gray-500 mt-1">₱{s.price.toLocaleString()}{s.pricingType === 'per_day' ? '/day' : `/${s.duration} hrs`} · up to {max} pets</span>{s.desc && <span className="block text-xs text-gray-500 mt-1">{s.desc}</span>}</span>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-transparent'}`} aria-hidden="true">✓</span>
                      </button>
                      {isSelected && <div className="px-4 py-3 border-t border-blue-100 space-y-2">
                        {(petTypes.length > 0 ? petTypes : ['Dog', 'Cat']).map(type => {
                          const key = `${s.id}-${type}`
                          const count = selectedServices.find(x => x.key === key)?.count || 0
                          const selectedType = selectedServices.find(x => x.serviceId === s.id && x.count > 0)?.type
                          const blocked = !s.mixedTypes && selectedType && selectedType !== type && totalForService > 0
                          const setCount = val => {
                            if (blocked) return
                            const next = Math.max(0, Math.min(max - (totalForService - count), val))
                            setSelectedServices(prev => {
                              const exists = prev.find(x => x.key === key)
                              if (next === 0) return prev.filter(x => x.key !== key)
                              if (exists) return prev.map(x => x.key === key ? { ...x, count: next } : x)
                              return [...prev, { key, serviceId: s.id, name: s.name, price: s.price, type, count: next }]
                            })
                            setErrors(prev => ({ ...prev, services: '' }))
                          }
                          return <div key={key} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${blocked ? 'bg-gray-100 opacity-50' : count > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-100'}`}>
                            <span className="text-sm text-gray-700">{type}</span>
                            <div className="flex items-center gap-3"><button type="button" aria-label={`Remove one ${type}`} onClick={() => setCount(count - 1)} disabled={blocked || count === 0} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg font-semibold disabled:text-gray-300">−</button><span aria-live="polite" className="w-5 text-center text-sm font-semibold">{count}</span><button type="button" aria-label={`Add one ${type}`} onClick={() => setCount(count + 1)} disabled={blocked || totalForService >= max} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg font-semibold disabled:text-gray-300">+</button></div>
                          </div>
                        })}
                      </div>}
                    </div>
                  })}
                </div>
                {errors.services && <p role="alert" className="text-sm text-red-600 mt-2">{errors.services}</p>}
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4" aria-live="polite">
                <div className="flex justify-between gap-4 text-sm text-gray-600"><span>Pets selected</span><span className="font-medium text-gray-800">{totalPets}</span></div>
                {servicesText && <p className="text-xs text-gray-500 mt-1">{servicesText}</p>}
                <div className="flex justify-between gap-4 border-t border-gray-200 mt-3 pt-3"><span className="text-sm font-semibold text-gray-800">Estimated total</span><span className="text-lg font-bold" style={{ color: theme.primary }}>₱{Number(totalPrice).toLocaleString()}</span></div>
                <p className="text-xs text-gray-500 mt-1">Final price may be confirmed by the provider.</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-1"><button type="button" onClick={() => setStep(1)} className="min-h-12 px-5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">← Back to dates</button><button type="button" onClick={continueToDetails} className="min-h-12 px-6 rounded-xl text-white font-semibold hover:opacity-90" style={{ background: theme.primary }}>Continue to your details <span aria-hidden="true">→</span></button></div>
            </section>}

            {step === 3 && <section aria-labelledby="booking-details-title" className="space-y-5">
              <div><h3 id="booking-details-title" className="text-lg md:text-xl font-bold text-gray-900">How can the provider reach you?</h3><p className="text-sm text-gray-500 mt-1">Your details are shared with the provider for this booking request.</p></div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-600"><p><strong className="text-gray-800">Dates:</strong> {fmt(start)} – {fmt(end)} ({days} day{days === 1 ? '' : 's'})</p><p className="mt-1"><strong className="text-gray-800">Pets:</strong> {servicesText}</p><p className="mt-1 font-semibold" style={{ color: theme.primary }}>Estimated total: ₱{Number(totalPrice).toLocaleString()}</p></div>
              {[['name','Full name','text','name'],['contact','Contact number','tel','tel'],['address','Address','text','street-address']].map(([key, label, type, autoComplete]) => <div key={key}><label htmlFor={`booking-${key}`} className="text-sm font-medium text-gray-700 mb-1.5 block">{label}<span className="text-red-600"> *</span></label><input id={`booking-${key}`} type={type} autoComplete={autoComplete} value={form[key]} onChange={e => { setForm(prev => ({ ...prev, [key]: e.target.value })); setErrors(prev => ({ ...prev, [key]: '' })) }} className={`${inp(key)} min-h-12`} />{errors[key] && <p role="alert" className="text-sm text-red-600 mt-1">{errors[key]}</p>}</div>)}
              {(booking.fields?.email?.show ?? true) && <div><label htmlFor="booking-email" className="text-sm font-medium text-gray-700 mb-1.5 block">Email{booking.fields?.email?.required && <span className="text-red-600"> *</span>}</label><input id="booking-email" type="email" autoComplete="email" value={form.email} onChange={e => { setForm(prev => ({ ...prev, email: e.target.value })); setErrors(prev => ({ ...prev, email: '' })) }} className={`${inp('email')} min-h-12`} />{errors.email && <p role="alert" className="text-sm text-red-600 mt-1">{errors.email}</p>}</div>}
              {(booking.fields?.facebook?.show ?? booking.showFacebook) && <div><label htmlFor="booking-facebook" className="text-sm font-medium text-gray-700 mb-1.5 block">Facebook name or link{booking.fields?.facebook?.required && <span className="text-red-600"> *</span>}</label><input id="booking-facebook" value={form.facebook} onChange={e => { setForm(prev => ({ ...prev, facebook: e.target.value })); setErrors(prev => ({ ...prev, facebook: '' })) }} className={`${inp('facebook')} min-h-12`} />{errors.facebook && <p role="alert" className="text-sm text-red-600 mt-1">{errors.facebook}</p>}</div>}
              {(booking.fields?.notes?.show ?? booking.showNotes) && <div><label htmlFor="booking-notes" className="text-sm font-medium text-gray-700 mb-1.5 block">Notes or special requests{booking.fields?.notes?.required && <span className="text-red-600"> *</span>}</label><textarea id="booking-notes" value={form.notes} onChange={e => { setForm(prev => ({ ...prev, notes: e.target.value })); setErrors(prev => ({ ...prev, notes: '' })) }} rows={3} className={`${inp('notes')} resize-y`} />{errors.notes && <p role="alert" className="text-sm text-red-600 mt-1">{errors.notes}</p>}</div>}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-1"><button type="button" onClick={() => setStep(2)} disabled={submitting} className="min-h-12 px-5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50">← Back to pets</button><button type="button" onClick={handleSubmit} disabled={hasOverlap || submitting} className="min-h-12 px-6 rounded-xl text-white font-semibold shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: theme.primary }}>{submitting ? 'Submitting…' : 'Send booking request'}</button></div>
              <p className="text-xs text-center text-gray-500">This is a request. The provider will contact you to confirm.</p>
            </section>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <BookingFooter general={general} footer={footer} primary={theme.primary} />

      {/* Success Modal */}
      {txn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div ref={invoiceRef} className="p-6 sm:p-7">
              <div className="rounded-2xl p-5 mb-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, #1e3a8a)` }}>
                {general.logo
                  ? <img src={general.logo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/70 mx-auto mb-2" />
                  : <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-white/20 mx-auto mb-2"><PawPrint size={25} /></div>
                }
                <p className="text-sm font-semibold text-white/85">{general.businessName}</p>
                <h2 className="text-xl font-bold mt-1">Acknowledgement Receipt</h2>
                <div className="mt-4 rounded-xl bg-white/15 px-4 py-2.5 border border-white/20">
                  <p className="text-[11px] uppercase tracking-wider text-white/70 mb-0.5">Transaction ID</p>
                  <p className="text-base font-bold tracking-widest">{receiptNo}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-3 text-sm">
                {[
                  ['Customer', form.name],
                  ['Service', servicesText],
                  ['Duration', `${days} day${days > 1 ? 's' : ''}`],
                  ['Check-in', `${fmt(start)} ${startTime}`],
                  ['Check-out', `${fmt(end)} ${endTime}`],
                  ['Contact', form.contact],
                  ['Address', form.address],
                  ...(form.notes ? [['Notes', form.notes]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="font-semibold text-gray-800 text-right break-words">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 px-1">
                <span className="text-sm font-semibold text-gray-500">Estimated total</span>
                <span className="text-xl font-bold" style={{ color: theme.primary }}>₱{Number(totalPrice).toLocaleString()}</span>
              </div>
              <p className="mt-2 px-1 text-center text-[11px] font-medium leading-relaxed text-red-600">Subject to change if travel allowance or other applicable charges apply.</p>
              <p className="text-center text-gray-300 text-xs mt-4">Send this to our Facebook page to confirm.</p>
            </div>
            <div className="px-6 pb-5 flex flex-col gap-2">
              <button onClick={handleSaveImage}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                💾 Save as Image
              </button>
              <a href={fbLink} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#1877F2' }}>
                Message us on Facebook
              </a>
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50">Book Again</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
