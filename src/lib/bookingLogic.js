// Pure booking rules shared by the public booking page. No React / Supabase imports so they can be tested.

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const PER_DAY_TYPES = ['per_day', 'daily', 'per day', 'day']

export const isPerDay = (pricingType) => PER_DAY_TYPES.includes(String(pricingType || '').toLowerCase())

export const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Inclusive day count: Oct 28 → Oct 29 = 2 days. DST-safe (rounds the ms difference).
export const inclusiveDays = (start, end) => {
  if (!start || !end) return 0
  const diff = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000)
  return Math.max(1, diff + 1)
}

export const totalHoursBetween = (start, end, startTime = '10:00', endTime = '10:00') => {
  if (!start || !end) return 0
  const ms = new Date(`${end}T${endTime}:00`).getTime() - new Date(`${start}T${startTime}:00`).getTime()
  return Math.max(1, Math.ceil(ms / 3600000))
}

// Total for the selected services. `services` = catalogue, `selected` = [{serviceId, count}].
export const calcTotalPrice = ({ services, selected, days, hours }) => {
  const ids = [...new Set(selected.filter(x => x.count > 0).map(x => x.serviceId))]
  return ids.reduce((sum, id) => {
    const svc = services.find(s => s.id === id)
    if (!svc) return sum
    const price = Number(svc.price) || 0
    if (svc.pricingType === 'per_hour') return sum + price * Math.max(1, Math.ceil(hours / (Number(svc.duration) || 1)))
    return sum + price * (days || 1)
  }, 0)
}

// Closed weekdays inside the range, e.g. ['Sunday'].
export const closedDaysInRange = (hours, start, end) => {
  const found = new Set()
  for (let c = new Date(`${start}T00:00:00`); c <= new Date(`${end}T00:00:00`); c.setDate(c.getDate() + 1)) {
    const name = DAY_NAMES[c.getDay()]
    if (hours?.[name] === false) found.add(name)
  }
  return [...found]
}

// Does the requested range collide with a confirmed (non-pending) booking?
export const hasConfirmedOverlap = ({ bookings, start, end, startTime, endTime, allowOverlap }) => {
  if (!start || !end) return false
  return bookings.some(b => {
    if (b.status === 'pending' || b.status === 'cancelled' || b.status === 'completed') return false
    if (!b.check_in || !b.check_out) return false
    if (allowOverlap) {
      const newStart = new Date(`${start}T${startTime}:00`).getTime()
      const newEnd = new Date(`${end}T${endTime}:00`).getTime()
      const bStart = new Date(`${b.check_in}T${b.time || '00:00'}:00`).getTime()
      const bEnd = new Date(`${b.check_out}T${b.end_time || '00:00'}:00`).getTime()
      return newStart < bEnd && newEnd > bStart
    }
    return start <= b.check_out && end >= b.check_in
  })
}

// Returns an error message or '' for the date step of the booking flow.
export const validateDateRange = ({ start, end, startTime, endTime, todayStr, settings, bookings }) => {
  if (!start || !end) return 'Choose both a check-in and check-out date to continue.'
  if (end < start) return 'Check-out date cannot be before check-in.'
  if (start <= todayStr) return 'Please choose a future check-in date.'
  const closed = closedDaysInRange(settings.hours, start, end)
  if (closed.length) return `This booking range includes a closed day (${closed.join(', ')}). Choose dates within your available working days.`
  const blocked = (settings.blockedDates || []).filter(b => b.date >= start && b.date <= end)
  if (blocked.length) return `This booking range includes an unavailable date (${blocked.map(b => b.date).join(', ')}). Please choose other dates.`
  if (hasConfirmedOverlap({ bookings, start, end, startTime, endTime, allowOverlap: settings.allowOverlap }))
    return 'These dates overlap an existing booking. Please choose another time.'
  if (start === end && endTime <= startTime) return 'Check-out time must be later than check-in time for a same-day booking.'
  return ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/

export const validateCustomer = (form, fields = {}, totalPets = 0) => {
  const e = {}
  if (!form.name.trim()) e.name = 'Required'
  if (!form.contact.trim()) e.contact = 'Required'
  else if (!PHONE_RE.test(form.contact.trim())) e.contact = 'Enter a valid phone number'
  if (!form.address.trim()) e.address = 'Required'
  if (fields.email?.required && !form.email.trim()) e.email = 'Required'
  else if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email'
  if (fields.facebook?.required && !form.facebook.trim()) e.facebook = 'Required'
  if (fields.notes?.required && !form.notes.trim()) e.notes = 'Required'
  if (!totalPets) e.services = 'Please select at least one pet'
  return e
}

const hashString = (value) => {
  let hash = 0
  for (const ch of String(value || '')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return Math.abs(hash)
}

export const receiptPrefix = (name) => {
  const words = String(name || 'Business').trim().split(/\s+/).filter(Boolean)
  if (!words.length) words.push('Business')
  const prefix = words.length > 1
    ? words.map(w => w[0]).join('')
    : words[0].length >= 3 ? words[0].slice(0, 2) + words[0].slice(-1) : words[0]
  return prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(3, 'X')
}

export const receiptNumber = (businessName, accountId, id) =>
  `${receiptPrefix(businessName)}-${hashString(accountId).toString(36).toUpperCase().padStart(2, '0').slice(-2)}-${String(hashString(id) % 100000).padStart(5, '0')}`
