import { useMemo, useState } from 'react'
import { TrendingUp, PhilippinePeso, Users, CheckCircle } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import DateFilter, { getDateRange, filterByRange } from '../../components/common/DateFilter'
import { useBookings } from '../../context/BookingContext'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const normalizedStatus = (a) => String(a?.status || '').trim().toLowerCase()
const bookingDate = (a) => a?.checkIn || a?.date || ''

export default function AdminAnalytics() {
  const { bookings } = useBookings()
  const [preset, setPreset] = useState('This Month')
  const [custom, setCustom] = useState({ start: '', end: '' })

  const range = getDateRange(preset, custom)
  // Use the check-in date, matching Dashboard and Calendar range behavior.
  const filtered = useMemo(() => bookings.filter(a => {
    const d = bookingDate(a)
    return (!range.start || d >= range.start) && (!range.end || d <= range.end)
  }), [bookings, range])

  const stats = useMemo(() => {
    const revenueBookings = filtered.filter(a => ['paid', 'completed'].includes(normalizedStatus(a)))
    const cancelled = filtered.filter(a => normalizedStatus(a) === 'cancelled')
    const totalRevenue = revenueBookings.reduce((sum, a) => sum + Number(a.finalPrice || 0) + Number(a.additional || 0), 0)
    const avgRevenue = revenueBookings.length ? totalRevenue / revenueBookings.length : 0
    const completed = filtered.filter(a => normalizedStatus(a) === 'completed')
    const paid = filtered.filter(a => normalizedStatus(a) === 'paid')
    const activeBookings = filtered.filter(a => normalizedStatus(a) !== 'cancelled')
    const uniqueCustomers = [...new Set(activeBookings.map(a => a.customer).filter(Boolean))].length
    return { totalRevenue, avgRevenue, completed: completed.length, paid: paid.length, cancelled: cancelled.length, total: filtered.length, uniqueCustomers }
  }, [filtered])

  const revenueByMonth = useMemo(() => {
    const map = {}
    filtered.filter(a => ['paid', 'completed'].includes(normalizedStatus(a))).forEach(a => {
      const month = new Date(`${bookingDate(a)}T00:00:00`).getMonth()
      map[month] = (map[month] || 0) + Number(a.finalPrice || 0) + Number(a.additional || 0)
    })
    return MONTHS.map((label, i) => ({ label, value: map[i] || 0 }))
  }, [filtered])

  const aptsByMonth = useMemo(() => {
    const map = {}
    filtered.forEach(a => {
      const month = new Date(`${bookingDate(a)}T00:00:00`).getMonth()
      map[month] = (map[month] || 0) + 1
    })
    return MONTHS.map((label, i) => ({ label, value: map[i] || 0 }))
  }, [filtered])

  const statusBreakdown = useMemo(() => {
    const counts = { pending: 0, approved: 0, 'awaiting payment': 0, paid: 0, completed: 0, cancelled: 0 }
    filtered.forEach(a => { const status = normalizedStatus(a); if (status in counts) counts[status]++ })
    return counts
  }, [filtered])

  const topServices = useMemo(() => {
    const map = {}
    filtered.filter(a => ['paid', 'completed'].includes(normalizedStatus(a))).forEach(a => {
      map[a.service] = (map[a.service] || 0) + Number(a.finalPrice || 0) + Number(a.additional || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filtered])

  const maxRevenue = Math.max(...revenueByMonth.map(m => m.value), 1)
  const maxApts = Math.max(...aptsByMonth.map(m => m.value), 1)
  const maxSvcRevenue = Math.max(...topServices.map(([, v]) => v), 1)

  const statusColors = {
    pending: 'bg-yellow-400',
    approved: 'bg-red-400',
    'awaiting payment': 'bg-purple-400',
    paid: 'bg-green-500',
    completed: 'bg-green-400',
    cancelled: 'bg-red-400',
  }
  const statusLabels = {
    pending: 'Pending',
    approved: 'Approved',
    'awaiting payment': 'Awaiting Payment',
    paid: 'Paid',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Revenue and appointment insights" />

      {/* Date Filter */}
      <div className="flex items-center justify-between mb-5">
        <DateFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
        <p className="text-xs text-gray-400">Showing: <span className="font-medium text-gray-600">{preset}</span></p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={`₱${stats.totalRevenue.toLocaleString()}`} icon={PhilippinePeso} color="green" />
        <StatCard title="Avg. per Booking" value={`₱${Math.round(stats.avgRevenue).toLocaleString()}`} icon={TrendingUp} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
        <StatCard title="Unique Customers" value={stats.uniqueCustomers} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
            {revenueByMonth.map(({ label, value }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="w-full flex items-end justify-center flex-1">
                  <div className="w-full bg-blue-500 rounded-t-md transition-all"
                    style={{ height: `${(value / maxRevenue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
                    title={`₱${value.toLocaleString()}`} />
                </div>
                <span className="text-xs text-gray-400 shrink-0">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Paid and completed appointments</p>
        </div>

        {/* Appointments Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Monthly Appointments</h2>
          <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
            {aptsByMonth.map(({ label, value }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="w-full flex items-end justify-center flex-1">
                  <div className="w-full bg-purple-400 rounded-t-md transition-all"
                    style={{ height: `${(value / maxApts) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
                    title={`${value} appointments`} />
                </div>
                <span className="text-xs text-gray-400 shrink-0">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">All statuses included</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Status Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
                    <span className="text-sm text-gray-600">{statusLabels[status]}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${statusColors[status]}`}
                    style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue Summary</h2>
          <div className="space-y-0">
            {[
              { label: 'Total Revenue', value: `₱${stats.totalRevenue.toLocaleString()}`, highlight: true },
              { label: 'Paid / Completed Bookings', value: stats.paid + stats.completed },
              { label: 'Cancelled Bookings', value: stats.cancelled },
              { label: 'Completion Rate', value: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%' },
              { label: 'Cancellation Rate', value: stats.total ? `${Math.round((stats.cancelled / stats.total) * 100)}%` : '0%' },
              { label: 'Avg. Revenue / Booking', value: `₱${Math.round(stats.avgRevenue).toLocaleString()}` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-semibold ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Services by Revenue</h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No completed bookings yet</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(([name, revenue]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">{name}</span>
                    <span className="text-sm font-semibold text-gray-800">₱{revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-400"
                      style={{ width: `${(revenue / maxSvcRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
