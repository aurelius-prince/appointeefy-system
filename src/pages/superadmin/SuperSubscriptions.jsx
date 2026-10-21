import { useState, useEffect } from 'react'
import { Search, X, ShieldOff, UserCheck, CreditCard, RefreshCw, Pencil, Check } from 'lucide-react'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'
import { usePlans } from '../../hooks/usePlans'

const toLocalDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
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
  if (error) console.error('insertManualPayment error:', error)
}

export default function SuperSubscriptions() {
  const { plans, loading: plansLoading } = usePlans()
  const [editingPlan, setEditingPlan] = useState(null) // { id, price }
  const [savingPlan, setSavingPlan] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null) // { account, mode: 'activate' | 'extend' }
  const [selectedPlan, setSelectedPlan] = useState('Monthly')
  const [saving, setSaving] = useState(false)

  const handleSavePlan = async () => {
    if (!editingPlan) return
    setSavingPlan(true)
    await supabase.from('plans').update({ price: Number(editingPlan.price) }).eq('id', editingPlan.id)
    setSavingPlan(false)
    setEditingPlan(null)
  }

  useEffect(() => {
    supabase.from('accounts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAccounts(data); setLoading(false) })
  }, [])

  const filtered = accounts.filter(a => {
    const matchSearch = a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.status === filter
    return matchSearch && matchFilter
  })

  const handleActivate = async () => {
    if (!modal) return
    setSaving(true)
    const base = modal.account.trial_ends ? new Date(modal.account.trial_ends) : new Date()
    if (selectedPlan === 'Monthly') base.setMonth(base.getMonth() + 1)
    else base.setFullYear(base.getFullYear() + 1)
    const newStatus = selectedPlan === 'Monthly' ? 'monthly' : 'annual'
    const expiryStr = toLocalDateStr(base)
    const amount = selectedPlan === 'Monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
    await supabase.from('accounts').update({ status: newStatus, subscribed_until: expiryStr }).eq('id', modal.account.id)
    await insertManualPayment(modal.account, selectedPlan, amount)
    setAccounts(prev => prev.map(a => a.id === modal.account.id ? { ...a, status: newStatus, subscribed_until: expiryStr } : a))
    setSaving(false)
    setModal(null)
  }

  const handleExtend = async () => {
    if (!modal) return
    setSaving(true)
    const base = modal.account.subscribed_until ? new Date(modal.account.subscribed_until) : new Date()
    if (selectedPlan === 'Monthly') base.setMonth(base.getMonth() + 1)
    else base.setFullYear(base.getFullYear() + 1)
    const newStatus = selectedPlan === 'Monthly' ? 'monthly' : 'annual'
    const expiryStr = toLocalDateStr(base)
    const amount = selectedPlan === 'Monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
    await supabase.from('accounts').update({ status: newStatus, subscribed_until: expiryStr }).eq('id', modal.account.id)
    await insertManualPayment(modal.account, selectedPlan, amount)
    setAccounts(prev => prev.map(a => a.id === modal.account.id ? { ...a, status: newStatus, subscribed_until: expiryStr } : a))
    setSaving(false)
    setModal(null)
  }

  const handleSuspend = async (id) => {
    await supabase.from('accounts').update({ status: 'suspended' }).eq('id', id)
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'suspended' } : a))
  }

  const handleReactivate = async (id) => {
    const account = accounts.find(a => a.id === id)
    const prevStatus = account?.subscribed_until ? 'monthly' : 'trial'
    await supabase.from('accounts').update({ status: prevStatus }).eq('id', id)
    if (prevStatus === 'monthly') {
      await insertManualPayment(account, 'Monthly', plans.monthly ?? 199)
    }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: prevStatus } : a))
  }

  return (
    <div>
      <PageHeader title="Subscription Management" subtitle="Manage account subscriptions" />

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[{ id: 'monthly', name: 'Monthly' }, { id: 'annual', name: 'Annual' }].map(({ id, name }) => (
          <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{name} Plan</p>
              <p className="text-sm text-gray-500">₱{plans[id]?.toLocaleString()} / {id === 'monthly' ? 'month' : 'year'}</p>
            </div>
            {editingPlan?.id === id ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">₱</span>
                <input
                  type="number"
                  value={editingPlan.price}
                  onChange={e => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  className="w-24 border border-blue-400 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <button onClick={handleSavePlan} disabled={savingPlan}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingPlan(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-600">₱{plans[id]?.toLocaleString()}</span>
                <button onClick={() => setEditingPlan({ id, price: plans[id] })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="trial">Trial</option>
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Business Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Trial Ends</th>
                <th className="px-6 py-3 font-medium">Subscribed Until</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No accounts found.</td></tr>}
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{a.business_type}</td>
                  <td className="px-6 py-3"><Badge status={a.status} /></td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{fmtDate(a.trial_ends)}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{fmtDate(a.subscribed_until)}</td>
                  <td className="px-6 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {a.status === 'trial' && (
                        <button onClick={() => { setModal({ account: a, mode: 'activate' }); setSelectedPlan('Monthly') }}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <CreditCard size={13} /> Activate
                        </button>
                      )}
                      {(a.status === 'monthly' || a.status === 'annual') && (
                        <button onClick={() => { setModal({ account: a, mode: 'extend' }); setSelectedPlan('Monthly') }}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <RefreshCw size={13} /> Extend
                        </button>
                      )}
                      {(a.status === 'trial' || a.status === 'monthly' || a.status === 'annual') && (
                        <button onClick={() => handleSuspend(a.id)}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                          <ShieldOff size={13} /> Suspend
                        </button>
                      )}
                      {(a.status === 'suspended' || a.status === 'expired') && (
                        <button onClick={() => handleReactivate(a.id)}
                          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg">
                          <UserCheck size={13} /> Reactivate
                        </button>
                      )}
                      {a.status === 'waitlisted' && (
                        <button onClick={() => { setModal({ account: a, mode: 'activate' }); setSelectedPlan('Monthly') }}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <CreditCard size={13} /> Activate Plan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-1">
              {modal.mode === 'extend' ? 'Extend Subscription' : 'Activate Subscription'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{modal.account.name}</p>
            <div className="space-y-2 mb-5">
              {[['Monthly', plans.monthly], ['Annual', plans.annual]].map(([plan, price]) => (
                <label key={plan} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selectedPlan === plan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="plan" value={plan} checked={selectedPlan === plan} onChange={() => setSelectedPlan(plan)} className="accent-blue-600" />
                    <span className="text-sm font-medium text-gray-800">{plan}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">₱{price?.toLocaleString()}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={modal.mode === 'extend' ? handleExtend : handleActivate} disabled={saving}
                className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : modal.mode === 'extend' ? 'Extend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Business Type', selected.business_type],
                ['Status', selected.status],
                ['Trial Ends', fmtDate(selected.trial_ends)],
                ['Subscribed Until', fmtDate(selected.subscribed_until)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
