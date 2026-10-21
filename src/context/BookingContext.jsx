import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BookingContext = createContext(null)

const now = () => new Date().toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const inclusiveDailyAmount = (a, amount) => {
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
const mapRow = (a) => ({
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

export function BookingProvider({ children }) {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const accountId = user?.account_id

  useEffect(() => {
    if (!accountId) { setLoading(false); return }
    fetchBookings()

    // Realtime subscription keeps Dashboard, Calendar, and Appointments in sync.
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: `account_id=eq.${accountId}`,
      }, (payload) => {
        const next = mapRow(payload.new)
        setBookings(prev => prev.some(item => item.id === next.id) ? prev : [next, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `account_id=eq.${accountId}`,
      }, (payload) => {
        const next = mapRow(payload.new)
        setBookings(prev => prev.map(item => item.id === next.id ? next : item))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'appointments',
        filter: `account_id=eq.${accountId}`,
      }, (payload) => {
        setBookings(prev => prev.filter(item => item.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [accountId])

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    if (!error && data) setBookings(data.map(mapRow))
    setLoading(false)
  }

  const updateBooking = async (updated) => {
    // Update in Supabase
    const { error } = await supabase
      .from('appointments')
      .update({
        status: updated.status,
        date: updated.date || updated.checkIn,
        check_in: updated.checkIn || updated.date,
        check_out: updated.checkOut || updated.date,
        final_price: updated.finalPrice,
        price_note: updated.priceNote,
        notes: updated.notes,
        payments: updated.payments,
        logs: updated.logs,
        additional: updated.additional || null,
      })
      .eq('id', updated.id)

    if (!error) {
      setBookings(prev => prev.map(a => a.id === updated.id ? updated : a))
    }
    return error
  }

  return (
    <BookingContext.Provider value={{ bookings, setBookings, updateBooking, loading, refetch: fetchBookings }}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBookings = () => useContext(BookingContext)
