import { useCallback, useEffect, useState } from 'react'
import { LifeBuoy, RefreshCw, Send, X } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'
import { supportDate, supportStatusLabel } from '../../lib/support'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export default function SuperSupport() {
  const [tickets, setTickets] = useState([])
  const [accounts, setAccounts] = useState({})
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('open')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadTickets = useCallback(async () => {
    const [ticketResult, accountResult] = await Promise.all([
      supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }),
      supabase.from('accounts').select('id, name, email'),
    ])
    if (ticketResult.error || accountResult.error) setError('Support tickets could not be loaded. Please refresh.')
    else { setTickets(ticketResult.data || []); setAccounts(Object.fromEntries((accountResult.data || []).map(account => [account.id, account]))); setError('') }
    setLoading(false)
  }, [])
  useEffect(() => { loadTickets() }, [loadTickets])
  useEffect(() => {
    if (!selected) return undefined
    let active = true
    const loadMessages = async () => {
      const { data, error: fetchError } = await supabase.from('support_messages').select('*').eq('ticket_id', selected.id).order('created_at')
      if (active && !fetchError) setMessages(data || [])
    }
    loadMessages()
    const timer = setInterval(loadMessages, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [selected])

  const updateStatus = async status => {
    if (!selected || saving) return
    setSaving(true); setError('')
    const { data, error: saveError } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', selected.id).select().single()
    if (saveError) setError('Could not change ticket status.')
    else { setSelected(data); setTickets(previous => previous.map(ticket => ticket.id === data.id ? data : ticket)) }
    setSaving(false)
  }
  const sendReply = async event => {
    event.preventDefault()
    if (!selected || !reply.trim() || saving) return
    setSaving(true); setError('')
    const { data, error: saveError } = await supabase.from('support_messages').insert({ ticket_id: selected.id, sender_role: 'superadmin', body: reply.trim() }).select().single()
    if (saveError) setError('Could not send the ticket reply.')
    else {
      setMessages(previous => [...previous, data]); setReply('')
      const { error: notificationError } = await supabase.from('notifications').insert({
        type: 'message',
        title: 'Support ticket update',
        message: `We replied to your ticket: ${selected.subject}. Open Help & Support to view the reply.`,
        to_account_id: selected.account_id,
      })
      if (notificationError) setError('Reply sent, but the provider notification could not be delivered.')
      if (selected.status === 'open') {
        const { data: updatedTicket, error: statusError } = await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', selected.id).select().single()
        if (statusError) setError('Reply sent, but ticket status could not be updated.')
        else { setSelected(updatedTicket); setTickets(previous => previous.map(ticket => ticket.id === updatedTicket.id ? updatedTicket : ticket)) }
      }
    }
    setSaving(false)
  }
  const shown = filter === 'all' ? tickets : tickets.filter(ticket => ticket.status === filter)

  return <div>
    <PageHeader title="Support tickets" subtitle="Review provider requests and reply with a solution" />
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mb-4 flex flex-wrap items-center gap-2">{['open', 'in_progress', 'resolved', 'closed', 'all'].map(status => <button key={status} onClick={() => setFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === status ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{status === 'all' ? 'All' : supportStatusLabel(status)} {status !== 'all' && `(${tickets.filter(ticket => ticket.status === status).length})`}</button>)}<button aria-label="Refresh tickets" onClick={loadTickets} className="ml-auto rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><RefreshCw size={16} /></button></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading tickets…</p> : shown.length === 0 ? <div className="p-12 text-center"><LifeBuoy size={28} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-600">No tickets in this view.</p></div> : <div className="divide-y divide-slate-100">{shown.map(ticket => <button key={ticket.id} onClick={() => { setSelected(ticket); setReply('') }} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{ticket.subject}</p><p className="mt-1 truncate text-xs text-slate-500">{accounts[ticket.account_id]?.name || 'Provider'} · {ticket.category} · {supportDate(ticket.created_at)}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{supportStatusLabel(ticket.status)}</span></button>)}</div>}</section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" aria-label="Support ticket details" className="flex max-h-[calc(100dvh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={event => event.stopPropagation()}><div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-4 sm:p-5"><div className="min-w-0"><h2 className="truncate font-semibold text-slate-900">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{accounts[selected.account_id]?.name || 'Provider'} · {accounts[selected.account_id]?.email || ''}</p></div><button aria-label="Close" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"><div className="rounded-xl bg-slate-50 p-4"><p className="mb-1 text-xs font-medium text-slate-500">Original request · {supportDate(selected.created_at)}</p><p className="whitespace-pre-wrap text-sm text-slate-800">{selected.description}</p></div>{messages.map(message => <div key={message.id} className="rounded-xl border border-slate-200 p-4"><p className="mb-1 text-xs font-semibold text-slate-500">{message.sender_role === 'superadmin' ? 'Support team' : 'Provider'} · {supportDate(message.created_at)}</p><p className="whitespace-pre-wrap text-sm text-slate-800">{message.body}</p></div>)}</div><div className="shrink-0 border-t border-slate-100 p-4 sm:p-5"><label className="mb-2 block text-xs font-medium text-slate-600">Ticket status</label><select value={selected.status} onChange={event => updateStatus(event.target.value)} disabled={saving} className="mb-3 w-full rounded-lg border border-slate-300 p-2.5 text-sm">{STATUSES.map(status => <option key={status} value={status}>{supportStatusLabel(status)}</option>)}</select>{selected.status !== 'closed' && <form onSubmit={sendReply}><label className="mb-2 block text-xs font-medium text-slate-600">Reply with an update or solution</label><div className="flex gap-2"><input value={reply} onChange={event => setReply(event.target.value)} required minLength={2} maxLength={4000} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Write a ticket reply" /><button disabled={saving || !reply.trim()} className="grid h-10 w-11 shrink-0 place-items-center rounded-lg bg-slate-900 text-white disabled:opacity-50" aria-label="Send reply"><Send size={17} /></button></div></form>}</div></div></div>}
  </div>
}
