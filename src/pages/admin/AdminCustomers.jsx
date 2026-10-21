import { useState, useMemo, useEffect } from 'react'
import { Search, Eye, X, Calendar, PawPrint } from 'lucide-react'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { useBookings } from '../../context/BookingContext'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  'awaiting payment': 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminCustomers() {
  const { bookings, loading } = useBookings()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  // Derive unique customers from appointments
  const customers = useMemo(() => {
    const map = new Map()
    bookings.forEach(a => {
      const key = a.phone || a.email || a.customer
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: a.customer,
          email: a.email || '—',
          phone: a.phone || '—',
          facebook: a.facebook || '',
          joined: a.date || a.checkIn || '',
          appointments: [],
          totalSpent: 0,
        })
      }
      const c = map.get(key)
      c.appointments.push(a)
      if (a.status === 'completed') c.totalSpent += a.finalPrice || 0
      // Keep earliest date as joined
      if (a.date && (!c.joined || a.date < c.joined)) c.joined = a.date
    })
    return Array.from(map.values()).map(c => ({
      ...c,
      totalAppointments: c.appointments.length,
      pets: [...new Set(c.appointments.map(a => a.pet).filter(Boolean))],
    }))
  }, [bookings])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  return (
    <div className="h-full min-h-0 flex flex-col p-6 overflow-hidden">
      <PageHeader title="Customers" subtitle={`${customers.length} total customers`} />

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="mobile-record-list">
          {loading ? <p className="mobile-record-empty">Loading customers...</p> : filtered.length === 0 ? <p className="mobile-record-empty">No customers yet.</p> : paginated.map(c => (
            <button type="button" key={c.id} className="mobile-record-card" onClick={() => setSelected(c)}>
              <span className="mobile-record-top"><strong>{c.name}</strong><span className="mobile-record-count">{c.totalAppointments} booking{c.totalAppointments !== 1 ? 's' : ''}</span></span>
              <span className="mobile-record-sub">{c.email} · {c.phone}</span>
              <span className="mobile-record-details"><span>{c.pets.length} pet{c.pets.length !== 1 ? 's' : ''} · Since {fmtDate(c.joined)}</span><strong>₱{c.totalSpent.toLocaleString()}</strong></span>
            </button>
          ))}
        </div>
        <div className="desktop-record-table flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr>
              {['Customer', 'Contact', 'Pets', 'First Booking', 'Appointments', 'Total Spent', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading customers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No customers yet.</td></tr>
            ) : paginated.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="customer-avatar w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs shrink-0">
                      {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{c.email}</div>
                  <div className="text-xs text-gray-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-1">
                    <PawPrint size={13} className="text-gray-400" />
                    {c.pets.length} pet{c.pets.length !== 1 ? 's' : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.joined)}</td>
                <td className="px-4 py-3 text-center font-medium text-gray-800">{c.totalAppointments}</td>
                <td className="px-4 py-3 font-medium text-gray-800">₱{c.totalSpent.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(c)}
                    className="customer-view-action p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>{filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`} of {filtered.length} customers</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="pagination-button rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-16 text-center">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="pagination-button rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="customer-avatar w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{selected.name}</h2>
                  <p className="text-xs text-gray-400">First booking {fmtDate(selected.joined)}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ['Facebook', selected.facebook || '—'],
                  ['Total Appointments', selected.totalAppointments],
                  ['Total Spent', `₱${selected.totalSpent.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800 break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Pets */}
              {selected.pets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pets</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.pets.map(pet => (
                      <span key={pet} className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                        <PawPrint size={11} /> {pet}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Appointment History */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Appointment History</p>
                <div className="space-y-2">
                  {selected.appointments.length === 0 ? (
                    <p className="text-sm text-gray-400">No appointments yet.</p>
                  ) : selected.appointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                          <Calendar size={14} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{apt.service}</p>
                          <p className="text-xs text-gray-400">{apt.pet} · {fmtDate(apt.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">₱{(apt.finalPrice || 0).toLocaleString()}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
