import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { mapRow } from '../lib/appointmentMapper'

const BookingContext = createContext(null)

const now = () => new Date().toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
