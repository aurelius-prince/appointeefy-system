import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CreditCard, ExternalLink, RefreshCw, Search, X } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import { supabase } from '../../lib/supabase'

const dateText = value => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const money = value => `₱${Number(value || 0).toLocaleString('en-PH')}`
const statusTabs = [
  ['pending', 'For review'], ['awaiting_payment', 'Awaiting payment'],
  ['verified', 'Verified'], ['rejected', 'Rejected'], ['failed', 'Failed'], ['all', 'All'],
]
const addDuration = (base, plan, quantity) => {
  const date = new Date(base)
  const day = date.getDate()
  date.setDate(1)
  if (String(plan).toLowerCase() === 'annual') date.setFullYear(date.getFullYear() + quantity)
  else date.setMonth(date.getMonth() + quantity)
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SuperPayments() {
  const [payments, setPayments] = useState([])
  const [accounts, setAccounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [working, setWorking] = useState(false)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError('')
    const [paymentResult, accountResult] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('id, name, email, status, subscribed_until'),
    ])
    if (paymentResult.error || accountResult.error) {
      setError('Payment requests could not be loaded. Please refresh and try again.')
    } else {
      setPayments(paymentResult.data || [])
      setAccounts(Object.fromEntries((accountResult.data || []).map(account => [account.id, account])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPayments() }, [loadPayments])

  const counts = useMemo(() => payments.reduce((result, payment) => {
    result[payment.status] = (result[payment.status] || 0) + 1
    return result
  }, {}), [payments])
  const visible = payments.filter(payment => {
    const query = search.trim().toLowerCase()
    const account = accounts[payment.account_id]
    return (filter === 'all' || payment.status === filter) && (!query || [payment.id, payment.reference, payment.name, payment.email, payment.plan, account?.name, account?.email].some(value => String(value || '').toLowerCase().includes(query)))
  })

  const updatePayment = async status => {
    if (!selected || working || selected.status !== 'pending') return
    setWorking(true)
    setError('')
    try {
      const account = accounts[selected.account_id]
      if (status === 'verified' && !account) throw new Error('This transaction has no matching provider account. It cannot be activated.')

      const { data, error: paymentError } = await supabase.from('payments').update({ status }).eq('id', selected.id).eq('status', 'pending').select().single()
      if (paymentError || !data) throw new Error('Could not update this payment. Refresh and try again.')

      if (status === 'verified') {
        const today = new Date()
        const currentEnd = account.subscribed_until ? new Date(`${account.subscribed_until}T00:00:00`) : null
        const base = currentEnd && currentEnd > today ? currentEnd : today
        const quantity = Math.max(1, Number(selected.quantity) || 1)
        const subscribedUntil = addDuration(base, selected.plan, quantity)
        const accountStatus = String(selected.plan).toLowerCase() === 'annual' ? 'annual' : 'monthly'
        const { data: updatedAccount, error: accountError } = await supabase.from('accounts').update({ status: accountStatus, subscribed_until: subscribedUntil }).eq('id', selected.account_id).select('id, name, email, status, subscribed_until').single()
        if (accountError || !updatedAccount) {
          await supabase.from('payments').update({ status: 'pending' }).eq('id', selected.id).eq('status', 'verified')
          throw new Error('The provider subscription could not be updated. Please refresh before trying again.')
        }
        setAccounts(previous => ({ ...previous, [updatedAccount.id]: updatedAccount }))
      }
      setPayments(previous => previous.map(payment => payment.id === selected.id ? data : payment))
      setSelected(null)
    } catch (cause) {
      await loadPayments()
      setError(cause.message || 'Could not complete the request.')
    } finally {
      setWorking(false)
    }
  }

  const selectedAccount = selected ? accounts[selected.account_id] : null
  return <div>
    <PageHeader title="Payments" subtitle="Provider payment requests and subscription verification" />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {statusTabs.filter(([key]) => key !== 'all').map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-xl border p-4 text-left transition-colors ${filter === key ? 'border-slate-500 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className="block text-2xl font-semibold text-slate-900">{counts[key] || 0}</span><span className="text-xs font-medium text-slate-600">{label}</span></button>)}
    </div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {statusTabs.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-400"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search provider or transaction" className="w-full bg-transparent text-sm text-slate-800 outline-none" /></label>
          <button aria-label="Refresh payments" title="Refresh payments" onClick={loadPayments} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><RefreshCw size={16} /></button>
        </div>
      </div>
      {error && <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading payments…</p> : visible.length === 0 ? <div className="p-12 text-center"><CreditCard size={28} className="mx-auto mb-3 text-slate-300" /><p className="font-medium text-slate-700">No payments in this view</p><p className="mt-1 text-sm text-slate-500">Choose another status to see other transactions.</p></div> : <div className="divide-y divide-slate-100">{visible.map(payment => {
        const account = accounts[payment.account_id]
        return <button key={payment.id} onClick={() => setSelected(payment)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><CreditCard size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{account?.name || payment.name || account?.email || payment.email || 'Unknown provider'} <span className="font-normal text-slate-500">· {payment.plan} {Number(payment.quantity) > 1 ? `× ${payment.quantity}` : ''}</span></p><p className="mt-1 truncate text-xs text-slate-500">{account?.email || payment.email || 'No email'} · {String(payment.id).slice(0, 8).toUpperCase()} · {dateText(payment.created_at)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-slate-900">{money(payment.amount)}</p><Badge status={payment.status} /></div></button>
      })}</div>}
    </section>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" aria-label="Payment details" className="max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={event => event.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-900">Payment details</h2><p className="mt-1 font-mono text-xs text-slate-500">Transaction {String(selected.id).slice(0, 8).toUpperCase()}</p></div><button aria-label="Close payment details" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><p className="text-xs text-slate-500">Provider</p><p className="font-semibold text-slate-800">{selectedAccount?.name || selected.name || '—'}</p><p className="break-all text-xs text-slate-500">{selectedAccount?.email || selected.email || '—'}</p></div><div><p className="text-xs text-slate-500">Status</p><Badge status={selected.status} /></div><div><p className="text-xs text-slate-500">Plan and duration</p><p className="font-medium text-slate-800">{selected.plan} × {Math.max(1, Number(selected.quantity) || 1)}</p></div><div><p className="text-xs text-slate-500">Amount</p><p className="font-semibold text-slate-800">{money(selected.amount)}</p></div><div><p className="text-xs text-slate-500">GCash reference</p><p className="break-all font-medium text-slate-800">{selected.status === 'awaiting_payment' ? 'Not submitted' : selected.reference || '—'}</p></div><div><p className="text-xs text-slate-500">Created</p><p className="text-slate-800">{dateText(selected.created_at)}</p></div></div>{selected.proof && <a href={selected.proof} target="_blank" rel="noreferrer" className="block"><img src={selected.proof} alt="Uploaded payment proof" className="max-h-72 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" /><span className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-slate-700"><ExternalLink size={13} />View full proof</span></a>}{selected.status === 'pending' && <div className="flex gap-3 pt-2"><button disabled={working} onClick={() => updatePayment('rejected')} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Reject</button><button disabled={working || !selectedAccount || !selected.proof} onClick={() => updatePayment('verified')} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} className="mr-1 inline" />Verify & activate</button></div>}{selected.status === 'pending' && (!selectedAccount || !selected.proof) && <p className="text-xs text-amber-700">A matching provider account and uploaded proof are required to activate this payment.</p>}</div></div></div>}
  </div>
}
