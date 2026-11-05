// Maps a Supabase `appointments` row to the shape used by the provider UI (pure, unit-tested).

export const inclusiveDailyAmount = (a, amount) => {
  const days = a.check_in && a.check_out
    ? Math.max(1, Math.round((new Date(`${a.check_out}T00:00:00`) - new Date(`${a.check_in}T00:00:00`)) / 86400000) + 1)
    : 1
  const pricing = String(a.pricing_type || '').toLowerCase()
  const isDaily = !a.pricing_type || ['per_day', 'daily', 'per day', 'day'].includes(pricing) || String(a.service_name || '').toLowerCase().includes('pet sitting')
  const storedDuration = Number(a.duration || 0)
  // Older records stored exclusive day totals (and one day less in duration).
  if (isDaily && days > 1 && storedDuration > 0 && storedDuration <= (days - 1) * 24 && Number(amount) > 0) {
    return Number(amount) * days / (days - 1)
  }
  return Number(amount || 0)
}

// Map Supabase row → component shape
export const mapRow = (a) => ({
  id: a.id,
  accountId: a.account_id || '',
  customer: a.customer_name || '',
  phone: a.customer_phone || '',
  email: a.customer_email || '',
  address: a.customer_address || a.address || (String(a.notes || '').match(/(?:^|\n)Address:\s*(.*?)(?=\n|$)/i)?.[1] || ''),
  facebook: a.customer_facebook || '',
  service: a.service_name || '',
  pet: a.pet || '',
  petType: a.pet_type || '',
  date: a.date || a.check_in || '',
  time: a.time || '',
  endTime: a.end_time || '',
  checkIn: a.check_in || '',
  checkOut: a.check_out || '',
  duration: a.duration || 1,
  pricingType: ['per_day', 'daily', 'per day', 'day'].includes(String(a.pricing_type || '').toLowerCase())
    ? 'per_day'
    : (a.pricing_type || 'per_day'),
  basePrice: (() => {
    const isDaily = !a.pricing_type || ['per_day', 'daily', 'per day', 'day'].includes(String(a.pricing_type).toLowerCase()) || String(a.service_name || '').toLowerCase().includes('pet sitting')
    const days = a.check_in && a.check_out
      ? Math.max(1, Math.round((new Date(`${a.check_out}T00:00:00`) - new Date(`${a.check_in}T00:00:00`)) / 86400000) + 1)
      : 1
    const storedDays = Math.max(1, Math.ceil(Number(a.duration || 24) / 24))
    return isDaily && days > storedDays && Number(a.final_price || 0) === Number(a.base_price || 0)
      ? Number(a.base_price || 0) * (days / storedDays)
      : inclusiveDailyAmount(a, a.base_price)
  })(),
  finalPrice: (() => {
    const isDaily = !a.pricing_type || ['per_day', 'daily', 'per day', 'day'].includes(String(a.pricing_type).toLowerCase()) || String(a.service_name || '').toLowerCase().includes('pet sitting')
    const days = a.check_in && a.check_out
      ? Math.max(1, Math.round((new Date(`${a.check_out}T00:00:00`) - new Date(`${a.check_in}T00:00:00`)) / 86400000) + 1)
      : 1
    const storedDays = Math.max(1, Math.ceil(Number(a.duration || 24) / 24))
    return isDaily && days > storedDays && Number(a.final_price || 0) === Number(a.base_price || 0)
      ? Number(a.final_price || 0) * (days / storedDays)
      : inclusiveDailyAmount(a, a.final_price)
  })(),
  priceNote: a.price_note || '',
  notes: a.notes || '',
  status: a.status || 'pending',
  txnCode: a.txn_code || '',
  payments: a.payments || [],
  logs: a.logs || [],
  additional: a.additional || undefined,
})
