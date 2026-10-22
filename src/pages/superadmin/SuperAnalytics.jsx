import { useState, useEffect } from 'react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Users, TrendingUp, CalendarCheck, UserCheck, DollarSign } from 'lucide-react'
import StatCard from '../../components/superadmin/SuperStatCard'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  monthly:   '#3b82f6',
  annual:    '#22c55e',
  trial:     '#a855f7',
  waitlisted:'#eab308',
  expired:   '#ef4444',
  suspended: '#6b7280',
}
const PAYMENT_STATES = [
  { key: 'awaiting_payment', label: 'Awaiting payment', color: 'bg-orange-500' },
  { key: 'pending', label: 'For review', color: 'bg-amber-500' },
  { key: 'verified', label: 'Verified', color: 'bg-emerald-600' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { key: 'failed', label: 'Failed', color: 'bg-slate-500' },
]

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="mb-4">
        <p className="font-semibold text-gray-800">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function empty(arr) {
  return <p className="text-center text-gray-400 py-8 text-sm">{arr}</p>
}

export default function SuperAnalytics() {
  const [accounts, setAccounts]         = useState([])
  const [appointments, setAppointments] = useState([])
  const [payments, setPayments]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('accounts').select('id, name, status, created_at, subscribed_until, trial_ends'),
      supabase.from('appointments').select('id, status, created_at'),
      supabase.from('payments').select('id, amount, status, plan, method, created_at, account_id, name'),
    ]).then(([{ data: accs, error: accountError }, { data: apts, error: appointmentError }, { data: pays, error: paymentError }]) => {
      if (accountError || appointmentError || paymentError) setLoadError('Some analytics could not be loaded. Please refresh the page.')
      if (accs)  setAccounts(accs)
      if (apts)  setAppointments(apts)
      if (pays)  setPayments(pays)
      setLoading(false)
    })
  }, [])

  // ── Revenue ──────────────────────────────────────────────────────────────
  const approvedPayments  = payments.filter(p => p.status === 'verified')
  const verifiedPayments  = approvedPayments.filter(p => p.method !== 'Manual')
  const totalRevenue      = verifiedPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const paymentCounts = Object.fromEntries(PAYMENT_STATES.map(({ key }) => [key, payments.filter(p => p.status === key).length]))

  // Manually activated = verified payments with method 'Manual'
  const manualPayments = approvedPayments.filter(p => p.method === 'Manual')
  const manualRevenue  = manualPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  // ── User stats ───────────────────────────────────────────────────────────
  const stats = {
    total:     accounts.length,
    paying:    accounts.filter(a => a.status === 'monthly' || a.status === 'annual').length,
    trial:     accounts.filter(a => a.status === 'trial').length,
    waitlisted:accounts.filter(a => a.status === 'waitlisted').length,
    expired:   accounts.filter(a => a.status === 'expired').length,
    suspended: accounts.filter(a => a.status === 'suspended').length,
  }

  // ── Monthly revenue (last 6 months) ──────────────────────────────────────
  const monthlyRevenue = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleString('default', { month: 'short' })
      const y = d.getFullYear(), m = d.getMonth()
      const verified = verifiedPayments.filter(p => {
        const c = new Date(p.created_at)
        return c.getFullYear() === y && c.getMonth() === m
      }).reduce((s, p) => s + Number(p.amount || 0), 0)
      months.push({ month: label, verified })
    }
    return months
  })()

  // ── Monthly new users (last 6 months) ────────────────────────────────────
  const monthlyUsers = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleString('default', { month: 'short' })
      const y = d.getFullYear(), m = d.getMonth()
      const count = accounts.filter(a => {
        const c = new Date(a.created_at)
        return c.getFullYear() === y && c.getMonth() === m
      }).length
      months.push({ month: label, users: count })
    }
    return months
  })()

  // ── Monthly appointments (last 6 months) ─────────────────────────────────
  const monthlyAppts = (() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleString('default', { month: 'short' })
      const y = d.getFullYear(), m = d.getMonth()
      const filter = (s) => appointments.filter(a => {
        const c = new Date(a.created_at)
        return c.getFullYear() === y && c.getMonth() === m && a.status === s
      }).length
      months.push({ month: label, completed: filter('completed'), cancelled: filter('cancelled') })
    }
    return months
  })()

  // ── Status pie ────────────────────────────────────────────────────────────
  const statusPie = Object.entries(STATUS_COLORS)
    .map(([s, color]) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: accounts.filter(a => a.status === s).length, color }))
    .filter(d => d.value > 0)

  // ── Payment method breakdown ──────────────────────────────────────────────
  const methodMap = {}
  verifiedPayments.forEach(p => { methodMap[p.method || 'Unknown'] = (methodMap[p.method || 'Unknown'] || 0) + Number(p.amount || 0) })
  const methodData = Object.entries(methodMap).map(([method, amount]) => ({ method, amount }))

  // ── Plan breakdown ────────────────────────────────────────────────────────
  const planBreakdown = [
    { label: 'Monthly', count: accounts.filter(a => a.status === 'monthly').length, color: 'bg-blue-500' },
    { label: 'Annual',  count: accounts.filter(a => a.status === 'annual').length,  color: 'bg-green-500' },
    { label: 'Trial',   count: stats.trial,     color: 'bg-purple-500' },
    { label: 'Waitlisted', count: stats.waitlisted, color: 'bg-yellow-400' },
    { label: 'Expired', count: stats.expired,   color: 'bg-red-400' },
    { label: 'Suspended', count: stats.suspended, color: 'bg-gray-400' },
  ]
  const planTotal = planBreakdown.reduce((s, p) => s + p.count, 0) || 1

  if (loading) return <div className="p-8 text-center text-gray-400">Loading analytics...</div>

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Payments, subscriptions, and account activity" />
      {loadError && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Verified Payments" value={`₱${totalRevenue.toLocaleString()}`} icon={DollarSign} color="yellow" />
        <StatCard title="For Review" value={paymentCounts.pending} icon={CalendarCheck} color="blue" />
        <StatCard title="Paid Plans"     value={stats.paying}                   icon={UserCheck}    color="green" />
        <StatCard title="Total Users"    value={stats.total}                    icon={Users}        color="blue" />
        <StatCard title="Appointments"   value={appointments.length}            icon={CalendarCheck} color="blue" />
      </div>

      <ChartCard title="Payment requests" subtitle="Same transaction statuses shown in Payments">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PAYMENT_STATES.map(({ key, label, color }) => <div key={key} className="rounded-xl border border-slate-200 p-3"><div className={`mb-2 h-1 w-8 rounded-full ${color}`} /><p className="text-2xl font-semibold text-slate-900">{paymentCounts[key]}</p><p className="text-xs font-medium text-slate-600">{label}</p></div>)}
        </div>
      </ChartCard>

      {/* Revenue + Users row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Monthly Payments" subtitle="Verified customer payments, excluding manual activations (last 6 months)">
          {monthlyRevenue.every(m => m.verified === 0)
            ? empty('No payment data yet.')
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}
                    tickFormatter={v => `₱${v >= 1000 ? `${v/1000}k` : v}`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v) => `₱${v.toLocaleString()}`} />
                  <Bar dataKey="verified" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="New Users per Month" subtitle="User registrations (last 6 months)">
          {monthlyUsers.every(m => m.users === 0)
            ? empty('No registration data yet.')
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyUsers} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="users" name="New Users" stroke="#3b82f6" strokeWidth={2} fill="url(#userGrad)" />
                </AreaChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>

      {/* Revenue details row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Payment method breakdown */}
        <ChartCard title="Payments by Method" subtitle="Verified customer payments; manual activations excluded">
          {methodData.length === 0
            ? empty('No verified payments yet.')
            : <div className="space-y-3 mt-1">
                {methodData.map(m => (
                  <div key={m.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{m.method}</span>
                      <span className="font-semibold text-gray-800">₱{m.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(m.amount / totalRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-800">
                  <span>Total Received</span>
                  <span>₱{totalRevenue.toLocaleString()}</span>
                </div>
              </div>
          }
        </ChartCard>

        {/* Manually activated */}
        <ChartCard title="Manually Activated" subtitle="Admin-created records; excluded from received payments">
          {manualPayments.length === 0
            ? empty('No manual activations yet.')
            : <div className="space-y-2 max-h-48 overflow-y-auto">
                {manualPayments.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                        {p.name?.[0] ?? '?'}
                      </div>
                      <span className="text-gray-700 font-medium truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.plan === 'Annual' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{p.plan}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₱{p.amount?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
          }
          <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-800 mt-3">
            <span>{manualPayments.length} manual activation{manualPayments.length !== 1 ? 's' : ''}</span>
            <span>₱{manualRevenue.toLocaleString()}</span>
          </div>
        </ChartCard>

        {/* Plan breakdown */}
        <ChartCard title="User Status Breakdown" subtitle="All accounts by current status">
          <div className="space-y-2.5">
            {planBreakdown.map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{p.label}</span>
                  <span className="font-semibold text-gray-800">{p.count}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.color}`}
                    style={{ width: `${(p.count / planTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Appointments + Status Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Monthly Appointments" subtitle="Completed vs Cancelled (last 6 months)">
          <p className="mb-3 text-xs text-slate-500">Appointments across provider accounts.</p>
          {monthlyAppts.every(m => m.completed === 0 && m.cancelled === 0)
            ? empty('No appointment data yet.')
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyAppts} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Account Status Distribution" subtitle="Breakdown of all user accounts">
          {statusPie.length === 0
            ? empty('No account data yet.')
            : <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {statusPie.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </ChartCard>
      </div>
    </div>
  )
}
