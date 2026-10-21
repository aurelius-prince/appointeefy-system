import { createContext, useContext } from 'react'
import { useBookings } from './BookingContext'

const AppointmentContext = createContext(null)

const toAppointment = (booking) => ({
  ...booking,
  customer: booking.customer || '',
  pet: booking.pet || '',
  petType: booking.petType || '',
  checkIn: booking.checkIn || booking.date || '',
  checkOut: booking.checkOut || booking.date || '',
  dailyRate: (booking.pricingType === 'per_day' || booking.pricingType === 'daily')
    ? (Number(booking.finalPrice || booking.basePrice || 0) / Math.max(1, Math.round((new Date(`${booking.checkOut || booking.date}T00:00:00`) - new Date(`${booking.checkIn || booking.date}T00:00:00`)) / 86400000) + 1))
    : (booking.finalPrice || booking.basePrice || 0),
})

export function AppointmentProvider({ children }) {
  const { bookings, updateBooking } = useBookings()
  const appointments = bookings.map(toAppointment)

  const updateStatus = async (id, status) => {
    const current = bookings.find(a => a.id === id)
    if (!current) return
    const labels = {
      pending: ['Booking Requested', 'Customer'],
      confirmed: ['Booking Confirmed', 'Admin'],
      completed: ['Stay Completed', 'Admin'],
      cancelled: ['Booking Cancelled', 'Admin'],
    }
    const [label, by] = labels[status] || [status, 'Admin']
    await updateBooking({
      ...current,
      status,
      logs: [...(current.logs || []), { id: (current.logs?.length || 0) + 1, action: status, label, by, at: new Date().toISOString() }],
    })
  }

  // Calendar stays are inclusive: Oct 27–30 occupies all four date cells.
  // Cancelled records stay in appointment history but must not occupy calendar space.
  const aptsForDay = (dateStr) => appointments.filter(a => a.status !== 'cancelled' && a.checkIn <= dateStr && a.checkOut >= dateStr)
  const aptsCheckInDay = (dateStr) => appointments.filter(a => a.status !== 'cancelled' && a.checkIn === dateStr)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const upcoming = [...appointments]
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && a.checkIn > todayStr)
    .sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''))
    .slice(0, 5)

  return <AppointmentContext.Provider value={{ appointments, updateStatus, aptsForDay, aptsCheckInDay, upcoming, todayStr }}>{children}</AppointmentContext.Provider>
}

export const useAppointments = () => useContext(AppointmentContext)
