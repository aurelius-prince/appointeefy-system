import { useState, useEffect } from 'react'
import { Search, UserCheck, ShieldOff, Trash2, X, CreditCard, RefreshCw } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'
import { usePlans } from '../../hooks/usePlans'

const STATUS_COLORS = {
  waitlisted: 'bg-yellow-100 text-yellow-700',
  trial:      'bg-purple-100 text-purple-700',
  monthly:    'bg-blue-100 text-blue-700',
  annual:     'bg-indigo-100 text-indigo-700',
  expired:    'bg-red-100 text-red-600',
  suspended:  'bg-red-100 text-red-600',
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
}

const toLocalDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const insertManualPayment = async (account, plan, amount) => {
  const { error } = await supabase.from('payments').insert({
    account_id: account.id,
    name: account.name,
    email: account.email,
    business_type: account.business_type,
    plan,
    amount,
    method: 'Manual',
    reference: `MANUAL-${Date.now()}`,
    status: 'verified',
  })
  if (error) console.error('insertManualPayment error:', JSON.stringify(error))
}

export default function SuperAccounts() {
  const { plans } = usePlans()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [planModal, setPlanModal] = useState(null) // { id, mode: 'activate' | 'extend' }
  const [selectedPlan, setSelectedPlan] = useState('Monthly')

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setAccounts(data)
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const pendingAccounts = accounts.filter(a => a.status === 'waitlisted')
  const trialAccounts = accounts.filter(a => a.status === 'trial')

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
    const matchTab = activeTab === 'all' ||
      (activeTab === 'waitlisted' && a.status === 'waitlisted') ||
      (activeTab === 'trial'      && a.status === 'trial') ||
      (activeTab === 'monthly'    && a.status === 'monthly') ||
      (activeTab === 'annual'     && a.status === 'annual') ||
      (activeTab === 'expired'    && a.status === 'expired') ||
      (activeTab === 'suspended'  && a.status === 'suspended')
    return matchSearch && matchTab
  })

  const handleApprove = async (id) => {
    const trialEnd = new Date()
    trialEnd.setMonth(trialEnd.getMonth() + 1)
    setActionLoading(true)
    await supabase.from('accounts').update({
      status: 'trial',
      trial_ends: toLocalDateStr(trialEnd),
    }).eq('id', id)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'trial', trial_ends: toLocalDateStr(trialEnd) } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'trial' }))
    setActionLoading(false)
  }

  const handleSuspend = async (id) => {
    setActionLoading(true)
    await supabase.from('accounts').update({ status: 'suspended' }).eq('id', id)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'suspended' } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'suspended' }))
    setActionLoading(false)
  }

  const handleReactivate = async (id) => {
    const account = accounts.find(a => a.id === id)
    const prevStatus = account?.subscribed_until ? 'monthly' : 'trial'
    setActionLoading(true)
    await supabase.from('accounts').update({ status: prevStatus }).eq('id', id)
    if (prevStatus === 'monthly') {
      await insertManualPayment(account, 'Monthly', plans.monthly ?? 199)
    }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: prevStatus } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: prevStatus }))
    setActionLoading(false)
  }

  const handleActivatePlan = async (id, plan) => {
    const account = accounts.find(a => a.id === id)
    const base = account?.trial_ends ? new Date(account.trial_ends) : new Date()
    if (plan === 'Monthly') base.setMonth(base.getMonth() + 1)
    else base.setFullYear(base.getFullYear() + 1)
    const newStatus = plan === 'Monthly' ? 'monthly' : 'annual'
    const expiryStr = toLocalDateStr(base)
    const amount = plan === 'Monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
    setActionLoading(true)
    await supabase.from('accounts').update({ status: newStatus, subscribed_until: expiryStr }).eq('id', id)
    await insertManualPayment(account, plan, amount)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, subscribed_until: expiryStr } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus, subscribed_until: expiryStr }))
    setActionLoading(false)
    setPlanModal(null)
  }

  const handleExtend = async (id, plan) => {
    const account = accounts.find(a => a.id === id)
    const base = account?.subscribed_until ? new Date(account.subscribed_until) : new Date()
    if (plan === 'Monthly') base.setMonth(base.getMonth() + 1)
    else base.setFullYear(base.getFullYear() + 1)
    const expiryStr = toLocalDateStr(base)
    const newStatus = plan === 'Monthly' ? 'monthly' : 'annual'
    const amount = plan === 'Monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
    setActionLoading(true)
    await supabase.from('accounts').update({ status: newStatus, subscribed_until: expiryStr }).eq('id', id)
    await insertManualPayment(account, plan, amount)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, subscribed_until: expiryStr } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus, subscribed_until: expiryStr }))
    setActionLoading(false)
    setPlanModal(null)
  }

  const handleReset = async (id) => {
    setActionLoading(true)
    await supabase.from('payments').delete().eq('account_id', id)
    await supabase.from('accounts').update({ status: 'waitlisted', trial_ends: null, subscribed_until: null }).eq('id', id)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'waitlisted', trial_ends: null, subscribed_until: null } : a))
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'waitlisted', trial_ends: null, subscribed_until: null }))
    setActionLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    await supabase.from('accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
    setSelected(null)
  }

  return (
    <div>
      <PageHeader title="Account Management" subtitle="Manage all provider accounts" />

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all',        label: 'All Accounts' },
          { key: 'waitlisted', label: 'Waitlisted', count: pendingAccounts.length },
          { key: 'trial',      label: 'Trial',      count: trialAccounts.length },
          { key: 'monthly',    label: 'Monthly' },
          { key: 'annual',     label: 'Annual' },
          { key: 'expired',    label: 'Expired' },
          { key: 'suspended',  label: 'Suspended' },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === key ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Trial Ends</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No accounts found.</td></tr>
              )}
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.account_code}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-gray-700">{a.email}</p>
                    <p className="text-xs text-gray-400">{a.phone}</p>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">{a.business_type}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">{fmtDate(a.trial_ends)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {a.status === 'waitlisted' && (
                        <button onClick={() => handleApprove(a.id)} disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">
                          <UserCheck size={13} /> Approve Trial
                        </button>
                      )}
                      {a.status === 'trial' && (
                        <button onClick={() => { setPlanModal({ id: a.id, mode: 'activate' }); setSelectedPlan('Monthly') }} disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <CreditCard size={13} /> Activate
                        </button>
                      )}
                      {(a.status === 'monthly' || a.status === 'annual') && (
                        <button onClick={() => { setPlanModal({ id: a.id, mode: 'extend' }); setSelectedPlan('Monthly') }} disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <RefreshCw size={13} /> Extend
                        </button>
                      )}
                      {(a.status === 'trial' || a.status === 'monthly' || a.status === 'annual') && (
                        <button onClick={() => handleSuspend(a.id)} disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                          <ShieldOff size={13} /> Suspend
                        </button>
                      )}
                      {(a.status === 'suspended' || a.status === 'expired') && (
                        <button onClick={() => handleReactivate(a.id)} disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">
                          <UserCheck size={13} /> Reactivate
                        </button>
                      )}
                      {/* TEMP: Reset for testing */}
                      <button onClick={() => handleReset(a.id)} disabled={actionLoading}
                        className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg">
                        ↺ Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Modal (Activate / Extend) */}
      {planModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-1">
              {planModal.mode === 'activate' ? 'Activate Subscription' : 'Extend Subscription'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {accounts.find(a => a.id === planModal.id)?.name}
            </p>
            <div className="space-y-2 mb-5">
              {[['Monthly', '₱199 / month'], ['Annual', '₱1,799 / year']].map(([plan, label]) => (
                <label key={plan} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selectedPlan === plan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="plan" value={plan} checked={selectedPlan === plan} onChange={() => setSelectedPlan(plan)} className="accent-blue-600" />
                    <span className="text-sm font-medium text-gray-800">{plan}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPlanModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => planModal.mode === 'activate' ? handleActivatePlan(planModal.id, selectedPlan) : handleExtend(planModal.id, selectedPlan)}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {actionLoading ? 'Saving...' : planModal.mode === 'activate' ? 'Activate' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              {[
                ['Account Code', selected.account_code],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Business Type', selected.business_type],
                ['Status', selected.status?.replace('_', ' ')],
                ['Trial Ends', fmtDate(selected.trial_ends)],
                ['Slug', selected.slug || '—'],
                ['Registered', fmtDate(selected.created_at?.split('T')[0])],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {selected.status === 'waitlisted' && (
                <button onClick={() => { handleApprove(selected.id); setSelected(null) }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm">
                  ✅ Approve — Start Trial
                </button>
              )}
              {selected.status === 'trial' && (
                <button onClick={() => { setPlanModal({ id: selected.id, mode: 'activate' }); setSelectedPlan('Monthly') }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm">
                  Activate Plan
                </button>
              )}
              {(selected.status === 'monthly' || selected.status === 'annual') && (
                <button onClick={() => { setPlanModal({ id: selected.id, mode: 'extend' }); setSelectedPlan('Monthly') }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm">
                  Extend
                </button>
              )}
              {(selected.status === 'trial' || selected.status === 'monthly' || selected.status === 'annual') && (
                <button onClick={() => handleSuspend(selected.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg text-sm">
                  Suspend
                </button>
              )}
              {(selected.status === 'suspended' || selected.status === 'expired') && (
                <button onClick={() => handleReactivate(selected.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm">
                  Reactivate
                </button>
              )}
              <button onClick={() => handleDelete(selected.id)}
                className="px-4 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
