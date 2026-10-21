import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import PageHeader from '../../components/common/PageHeader'

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLORS = {
  pending:           'bg-yellow-100 text-yellow-700',
  approved:          'bg-blue-100 text-blue-700',
  'awaiting payment':'bg-purple-100 text-purple-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-600',
}

export default function AdminLogs() {
  const { bookings, loading } = useBookings()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Flatten logs from all bookings
  const allLogs = bookings.flatMap(b =>
    (b.logs || []).map(log => ({
      ...log,
      txn: b.txnCode || b.id,
      customer: b.customer,
      service: b.service,
      status: b.status,
    }))
  ).sort((a, b) => new Date(b.at) - new Date(a.at))

  const filtered = allLogs.filter(log => {
    const q = search.toLowerCase()
    const matchSearch = (log.customer || '').toLowerCase().includes(q) ||
      (log.txn || '').toLowerCase().includes(q) ||
      (log.msg || '').toLowerCase().includes(q)
    const matchFilter = filter === 'all' || log.status === filter
    return matchSearch && matchFilter
  })
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search, filter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <PageHeader title="Transaction Logs" subtitle={`${filtered.length} log${filtered.length !== 1 ? 's' : ''} found`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, TXN, message..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
          {['all', 'pending', 'approved', 'awaiting payment', 'completed', 'cancelled'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="mobile-record-list">
          {loading ? <p className="mobile-record-empty">Loading logs...</p> : filtered.length === 0 ? <p className="mobile-record-empty">No logs found.</p> : paginated.map((log, i) => (
            <div key={`${log.txn}-${log.at}-${i}`} className="mobile-record-card">
              <span className="mobile-record-top"><strong>{log.customer}</strong><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'}`}>{log.status}</span></span>
              <span className="mobile-record-sub">{log.txn} · {log.service}</span>
              <span className="mobile-record-message">{log.msg}</span>
              <span className="mobile-record-sub">{fmtDate(log.at)}</span>
            </div>
          ))}
        </div>
        <div className="desktop-record-table flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3 font-medium">TXN</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Service</th>
              <th className="px-6 py-3 font-medium">Message</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No logs found.</td></tr>}
            {paginated.map((log, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs text-gray-500">{log.txn}</td>
                <td className="px-6 py-3 font-medium text-gray-800">{log.customer}</td>
                <td className="px-6 py-3 text-gray-600">{log.service}</td>
                <td className="px-6 py-3 text-gray-600">{log.msg}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">{fmtDate(log.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>{filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`} of {filtered.length} logs</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-16 text-center">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
