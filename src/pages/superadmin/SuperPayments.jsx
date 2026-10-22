import { useEffect, useState } from 'react'
import { Check, CreditCard, ExternalLink, Search, X } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import { supabase } from '../../lib/supabase'

const dateText = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'

export default function SuperPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [working, setWorking] = useState(false)

  const loadPayments = async () => {
    setLoading(true)
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }
  useEffect(() => { loadPayments() }, [])

  const visible = payments.filter(payment => {
    const query = search.trim().toLowerCase()
    return (filter === 'all' || payment.status === filter) && (!query || [payment.reference, payment.name, payment.email, payment.plan].some(value => String(value || '').toLowerCase().includes(query)))
  })

  const updatePayment = async status => {
    if (!selected) return
    setWorking(true)
    await supabase.from('payments').update({ status }).eq('id', selected.id)
    if (status === 'verified') {
      const expiry = new Date()
      selected.plan === 'Monthly' ? expiry.setMonth(expiry.getMonth() + 1) : expiry.setFullYear(expiry.getFullYear() + 1)
      await supabase.from('accounts').update({ status: selected.plan?.toLowerCase() === 'annual' ? 'annual' : 'monthly', subscribed_until: expiry.toISOString().slice(0, 10) }).eq('id', selected.account_id)
    }
    setPayments(previous => previous.map(payment => payment.id === selected.id ? { ...payment, status } : payment))
    setSelected(null)
    setWorking(false)
  }

  return <div>
    <PageHeader title="Payment Verification" subtitle="Review uploaded payment proofs and activate subscriptions" />
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">{['pending', 'verified', 'rejected', 'all'].map(status => <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{status}</button>)}</div>
        <label className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transaction" className="outline-none w-full sm:w-48" /></label>
      </div>
      {loading ? <p className="p-10 text-center text-sm text-gray-400">Loading transactions…</p> : visible.length === 0 ? <div className="p-12 text-center"><CreditCard size={30} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold text-gray-600">No transactions found</p><p className="text-sm text-gray-400 mt-1">Uploaded payment proofs will appear here.</p></div> : <div className="divide-y divide-gray-100">{visible.map(payment => <button key={payment.id} onClick={() => setSelected(payment)} className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><CreditCard size={18} /></div><div className="min-w-0 flex-1"><p className="font-semibold text-gray-800 truncate">{payment.name || payment.email || 'Account'} <span className="font-normal text-gray-400">· {payment.plan}</span></p><p className="text-xs text-gray-400 mt-1">{payment.reference} · {payment.method} · {dateText(payment.created_at)}</p></div><div className="text-right"><p className="font-bold text-gray-800">₱{Number(payment.amount || 0).toLocaleString()}</p><Badge status={payment.status} /></div></button>)}</div>}
    </div>
    {selected && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}><div className="p-5 border-b border-gray-100 flex justify-between items-start"><div><p className="font-bold text-gray-800">Payment transaction</p><p className="text-xs text-gray-400 mt-1">{selected.reference}</p></div><button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-400">Account</p><p className="font-medium text-gray-700">{selected.name || '—'}</p></div><div><p className="text-xs text-gray-400">Amount</p><p className="font-bold text-gray-800">₱{Number(selected.amount || 0).toLocaleString()}</p></div><div><p className="text-xs text-gray-400">Method</p><p className="text-gray-700">{selected.method}</p></div><div><p className="text-xs text-gray-400">Submitted</p><p className="text-gray-700">{dateText(selected.created_at)}</p></div></div>{selected.proof && <a href={selected.proof} target="_blank" rel="noreferrer" className="block"><img src={selected.proof} alt="Uploaded proof" className="w-full max-h-72 object-contain rounded-xl border border-gray-100 bg-gray-50" /><span className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-600"><ExternalLink size={13} /> Open full proof</span></a>}{selected.status === 'pending' && <div className="flex gap-3 pt-2"><button disabled={working} onClick={() => updatePayment('rejected')} className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm">Reject</button><button disabled={working} onClick={() => updatePayment('verified')} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><Check size={16} /> Verify & Activate</button></div>}</div></div></div>}
  </div>
}
