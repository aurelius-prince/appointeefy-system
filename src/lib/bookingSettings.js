// Booking-page settings: defaults, normalisation and Supabase persistence.
// Pure helpers are kept free of browser/Supabase imports so they can be unit tested with `node --test`.

export const DEFAULT_HOURS = { Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: true, Sunday: false }

export const DEFAULT_SETTINGS = {
  general: { businessName: 'Pet Care', tagline: '', logo: null, logoShape: 'circle' },
  hero: { headline: 'Give Your Pet the Best Care', subheadline: '', images: [], imageShape: 'square' },
  booking: {
    title: 'Book Now', subtitle: 'Fill in the form below to reserve a spot for your pet.',
    fields: {
      name: { show: true, required: true }, contact: { show: true, required: true },
      email: { show: true, required: false }, facebook: { show: true, required: false }, notes: { show: true, required: false },
    },
  },
  testimony: { title: 'What Our Clients Say', bg: null, items: [] },
  footer: { phone: '', email: '', address: '', facebook: '' },
  theme: { name: 'Ocean', primary: '#2563eb', secondary: '#eff6ff', text: '#1e3a5f' },
  petSitter: { photo: null, photoShape: 'circle', name: '', description: '', stats: [] },
  hours: DEFAULT_HOURS,
  allowOverlap: false,
  blockedDates: [],
}

// Legacy localStorage key for each settings section (used once to migrate old local-only data to the DB).
export const LEGACY_KEYS = {
  general: 'bp_general', hero: 'bp_hero', booking: 'bp_booking', testimony: 'bp_testimony', footer: 'bp_footer',
  theme: 'bp_theme', petSitter: 'bp_petSitter', hours: 'bp_hours', allowOverlap: 'bp_allow_overlap',
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// Deep-merge saved settings over defaults. Arrays and primitives from `saved` replace defaults;
// objects are merged so newly added default keys always exist (e.g. booking.fields.email).
export const deepMerge = (base, saved) => {
  if (!isObj(base) || !isObj(saved)) return saved === undefined ? base : saved
  const out = { ...base }
  for (const key of Object.keys(saved)) out[key] = key in base ? deepMerge(base[key], saved[key]) : saved[key]
  return out
}

const isIsoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime())

export const normalizeBlockedDates = (list) => {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  return list
    .filter((b) => b && isIsoDate(b.date) && !seen.has(b.date) && seen.add(b.date))
    .map((b, i) => ({ id: b.id ?? `${b.date}-${i}`, date: b.date, reason: String(b.reason || '').slice(0, 120) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export const normalizeSettings = (saved) => {
  // structuredClone so callers can never mutate DEFAULT_SETTINGS (arrays/objects would otherwise be shared).
  const merged = structuredClone(deepMerge(DEFAULT_SETTINGS, isObj(saved) ? saved : {}))
  merged.hours = { ...DEFAULT_HOURS, ...(isObj(merged.hours) ? merged.hours : {}) }
  merged.allowOverlap = merged.allowOverlap === true
  merged.blockedDates = normalizeBlockedDates(merged.blockedDates)
  if (!merged.general.businessName || !String(merged.general.businessName).trim()) merged.general.businessName = DEFAULT_SETTINGS.general.businessName
  return merged
}

export const slugify = (name) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

export const isDateBlocked = (settings, dateStr) =>
  (settings?.blockedDates || []).some((b) => b.date === dateStr)

export const blockedDatesInRange = (settings, start, end) =>
  (settings?.blockedDates || []).filter((b) => b.date >= start && b.date <= end)

// Read legacy local-only settings from a Storage-like object (window.localStorage).
export const readLegacySettings = (storage) => {
  const out = {}
  for (const [section, key] of Object.entries(LEGACY_KEYS)) {
    try {
      const raw = storage?.getItem?.(key)
      if (raw !== null && raw !== undefined) out[section] = JSON.parse(raw)
    } catch { /* ignore corrupt entry */ }
  }
  return out
}

// ── Supabase persistence (client is injected so this stays testable) ─────────────────────────

export const fetchSettingsByAccount = async (supabase, accountId) => {
  const { data, error } = await supabase
    .from('booking_page_settings').select('settings').eq('account_id', accountId).maybeSingle()
  if (error) throw error
  return data ? normalizeSettings(data.settings) : null
}

export const saveSettings = async (supabase, accountId, settings) => {
  if (!accountId) throw new Error('No account selected. Please sign in again.')
  const clean = normalizeSettings(settings)
  const { error } = await supabase
    .from('booking_page_settings')
    .upsert({ account_id: accountId, settings: clean, updated_at: new Date().toISOString() }, { onConflict: 'account_id' })
  if (error) throw error
  return clean
}
