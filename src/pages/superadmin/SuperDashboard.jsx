import { useState, useEffect } from 'react'
import { Users, UserCheck, Clock, AlertCircle, DollarSign, CreditCard, UserX, CalendarClock, CheckSquare, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/superadmin/SuperStatCard'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
}

const daysUntil = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
}

function ReminderCard({ icon: Icon, iconBg, iconColor, title, count, countColor, children, onViewAll }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon size={18} className={iconColor} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{title}</p>
            <p className={`text-xs font-medium ${countColor}`}>{count} item{count !== 1 ? 's' : ''} need attention</p>
          </div>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          View all <ChevronRight size={13} />
        </button>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

export default function SuperDashboard() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('accounts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAccounts(data); setLoading(false) })
  }, [])

  const stats = {
    total:   accounts.length,
    active:  accounts.filter(a => a.status === 'monthly' || a.status === 'annual').length,
    trial:   accounts.filter(a => a.status === 'trial').length,
    pending: accounts.filter(a => a.status === 'waitlisted').length,
    expired: accounts.filter(a => a.status === 'expired').length,
  }

  const recent          = accounts.slice(0, 5)
  const pendingApproval = accounts.filter(a => a.status === 'waitlisted').slice(0, 5)
  const suspended       = accounts.filter(a => a.status === 'suspended').slice(0, 5)
  const expiringSoon    = accounts.filter(a => {
    if (!a.trial_ends) return false
    const days = daysUntil(a.trial_ends)
    return days !== null && days <= 7 && days >= 0
  }).slice(0, 5)

  if (loading) return <div className="p-8 text-center text-gray-400">Loading dashboard...</div>

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back! Here's what needs your attention today." />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Accounts" value={stats.total}   icon={Users}        color="blue" />
        <StatCard title="Active"         value={stats.active}  icon={UserCheck}    color="green" />
        <StatCard title="On Trial"       value={stats.trial}   icon={Clock}        color="purple" />
        <StatCard title="Pending"        value={stats.pending} icon={Clock}        color="yellow" />
        <StatCard title="Expired"        value={stats.expired} icon={AlertCircle}  color="red" />
      </div>

      {/* Reminders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

        {/* Expiring Soon */}
        <ReminderCard icon={CalendarClock} iconBg="bg-orange-50" iconColor="text-orange-500"
          title="Expiring Trials" count={expiringSoon.length} countColor="text-orange-500"
          onViewAll={() => navigate('/superadmin/accounts?tab=trial')}>
          {expiringSoon.length === 0
            ? <p className="px-5 py-4 text-sm text-gray-400 text-center">No expiring trials.</p>
            : expiringSoon.map(a => {
                const days = daysUntil(a.trial_ends)
                return (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">{a.name[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.name}</p>
                        <p className="text-xs text-gray-400">Trial ends {fmtDate(a.trial_ends)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${days <= 3 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      {days <= 0 ? 'Today!' : `${days}d left`}
                    </span>
                  </div>
                )
              })
          }
        </ReminderCard>

        {/* Pending Approvals */}
        <ReminderCard icon={CheckSquare} iconBg="bg-blue-50" iconColor="text-blue-500"
          title="Pending Approvals" count={pendingApproval.length} countColor="text-blue-600"
          onViewAll={() => navigate('/superadmin/accounts')}>
          {pendingApproval.length === 0
            ? <p className="px-5 py-4 text-sm text-gray-400 text-center">No pending approvals.</p>
            : pendingApproval.map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">{a.name[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.business_type}</p>
                    </div>
                  </div>
                  <span className="bg-yellow-50 text-yellow-600 text-xs font-medium px-2.5 py-1 rounded-full">Pending</span>
                </div>
              ))
          }
        </ReminderCard>

        {/* Suspended */}
        <ReminderCard icon={UserX} iconBg="bg-red-50" iconColor="text-red-500"
          title="Suspended Accounts" count={suspended.length} countColor="text-red-500"
          onViewAll={() => navigate('/superadmin/accounts')}>
          {suspended.length === 0
            ? <p className="px-5 py-4 text-sm text-gray-400 text-center">No suspended accounts.</p>
            : suspended.map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 font-bold text-sm">{a.name[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.business_type}</p>
                    </div>
                  </div>
                  <Badge status="suspended" />
                </div>
              ))
          }
        </ReminderCard>

        {/* Expired */}
        <ReminderCard icon={AlertCircle} iconBg="bg-gray-50" iconColor="text-gray-500"
          title="Expired Accounts" count={stats.expired} countColor="text-gray-500"
          onViewAll={() => navigate('/superadmin/accounts')}>
          {accounts.filter(a => a.status === 'expired').length === 0
            ? <p className="px-5 py-4 text-sm text-gray-400 text-center">No expired accounts.</p>
            : accounts.filter(a => a.status === 'expired').slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">{a.name[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.business_type}</p>
                    </div>
                  </div>
                  <Badge status="expired" />
                </div>
              ))
          }
        </ReminderCard>
      </div>

      {/* Recent Registrations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Provider Registrations</h2>
          <button onClick={() => navigate('/superadmin/accounts')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            View all <ChevronRight size={13} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No accounts yet.</td></tr>
              )}
              {recent.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td data-label="Business" className="px-6 py-3 font-medium text-gray-800">{r.name}</td>
                  <td data-label="Email" className="px-6 py-3 text-gray-500">{r.email}</td>
                  <td data-label="Type" className="px-6 py-3">
                    <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-full">{r.business_type}</span>
                  </td>
                  <td data-label="Status" className="px-6 py-3"><Badge status={r.status} /></td>
                  <td data-label="Registered" className="px-6 py-3 text-gray-500">{fmtDate(r.created_at?.split('T')[0])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
