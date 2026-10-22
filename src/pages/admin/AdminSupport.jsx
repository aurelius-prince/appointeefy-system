import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, LifeBuoy, Plus, Send, X } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { SUPPORT_CATEGORIES, SUPPORT_FAQS, supportDate, supportStatusLabel } from '../../lib/support'

export default function AdminSupport() {
  const { user } = useAuth()
  const accountId = user?.account_id
  const [tickets, setTickets] = useState([])
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [faqOpen, setFaqOpen] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [form, setForm] = useState({ category: SUPPORT_CATEGORIES[0], subject: '', description: '' })
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!formOpen) setCategoryOpen(false) }, [formOpen])

  const loadTickets = useCallback(async () => {
    if (!accountId) return
    const { data, error: fetchError } = await supabase.from('support_tickets').select('*').eq('account_id', accountId).order('updated_at', { ascending: false })
    if (fetchError) setError('Support tickets could not be loaded. Please try again.')
    else { setTickets(data || []); setError('') }
    setLoading(false)
  }, [accountId])
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

  const createTicket = async event => {
    event.preventDefault()
    if (!accountId || saving) return
    setSaving(true); setError('')
    const { data, error: saveError } = await supabase.from('support_tickets').insert({ account_id: accountId, category: form.category, subject: form.subject.trim(), description: form.description.trim() }).select().single()
    if (saveError) setError(saveError.message || 'Ticket could not be created.')
    else { setTickets(previous => [data, ...previous]); setSelected(data); setFormOpen(false); setForm({ category: SUPPORT_CATEGORIES[0], subject: '', description: '' }) }
    setSaving(false)
  }
  const sendReply = async event => {
    event.preventDefault()
    if (!selected || !reply.trim() || saving) return
    setSaving(true); setError('')
    const { data, error: saveError } = await supabase.from('support_messages').insert({ ticket_id: selected.id, sender_role: 'provider', body: reply.trim() }).select().single()
    if (saveError) setError('Could not add your update. Please try again.')
    else { setMessages(previous => [...previous, data]); setReply('') }
    setSaving(false)
  }

  return <div className="provider-support w-full min-w-0 max-w-5xl">
    <PageHeader title="Help & Support" subtitle="Find answers or send a support request" />
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2"><LifeBuoy size={19} className="text-gray-600" /><h2 className="font-semibold text-gray-900">Frequently asked questions</h2></div>
      <div className="divide-y divide-gray-100">{SUPPORT_FAQS.map((faq, index) => <div key={faq.question}><button onClick={() => setFaqOpen(faqOpen === index ? null : index)} aria-expanded={faqOpen === index} className="flex w-full items-start justify-between gap-3 py-3 text-left text-sm font-medium text-gray-800"><span>{faq.question}</span><ChevronDown size={16} className={`mt-0.5 shrink-0 transition-transform ${faqOpen === index ? 'rotate-180' : ''}`} /></button>{faqOpen === index && <p className="pb-4 pr-5 text-sm leading-relaxed text-gray-600">{faq.answer}</p>}</div>)}</div>
    </section>
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">My support tickets</h2><p className="mt-1 text-xs text-gray-500">One issue per ticket. We will reply inside your request.</p></div><button onClick={() => { setFormOpen(true); setSelected(null) }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white"><Plus size={16} />New ticket</button></div>
      {loading ? <p className="py-8 text-center text-sm text-gray-500">Loading tickets…</p> : tickets.length === 0 ? <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No support tickets yet.</p> : <div className="divide-y divide-gray-100">{tickets.map(ticket => <button key={ticket.id} onClick={() => { setSelected(ticket); setFormOpen(false); setReply('') }} className="flex w-full items-center justify-between gap-3 py-4 text-left"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{ticket.subject}</p><p className="mt-1 text-xs text-gray-500">{ticket.category} · {supportDate(ticket.created_at)}</p></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{supportStatusLabel(ticket.status)}</span><ChevronRight size={16} className="text-gray-400" /></div></button>)}</div>}
    </section>

    {(selected || formOpen) && createPortal(<div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/55 p-3 sm:p-6" onClick={() => { setSelected(null); setFormOpen(false) }}><div role="dialog" aria-modal="true" aria-label={formOpen ? 'New support ticket' : 'Support ticket'} className="flex max-h-[calc(100dvh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={event => event.stopPropagation()}><div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 p-4 sm:p-5"><div className="min-w-0"><h2 className="truncate font-semibold text-gray-900">{formOpen ? 'New support ticket' : selected.subject}</h2><p className="mt-1 text-xs text-gray-500">{formOpen ? 'Describe one issue so we can help you faster.' : `${selected.category} · ${supportStatusLabel(selected.status)}`}</p></div><button aria-label="Close" onClick={() => { setSelected(null); setFormOpen(false) }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div>
      {error && <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {formOpen ? <form onSubmit={createTicket} className="space-y-4 overflow-y-auto p-4 sm:p-5"><div><span className="block text-sm font-medium">Category</span><button type="button" onClick={() => setCategoryOpen(true)} aria-haspopup="dialog" className="mt-1 flex min-h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm"><span>{form.category}</span><ChevronDown size={16} /></button></div><label className="block text-sm font-medium">Subject<input value={form.subject} onChange={event => setForm(previous => ({ ...previous, subject: event.target.value }))} minLength={5} maxLength={120} required className="mt-1 block w-full rounded-lg border border-gray-300 p-2.5 text-sm" placeholder="A short summary of the issue" /></label><label className="block text-sm font-medium">What happened?<textarea value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} minLength={15} maxLength={4000} required rows={5} className="mt-1 block w-full resize-y rounded-lg border border-gray-300 p-2.5 text-sm" placeholder="Include relevant steps or transaction ID" /></label><button disabled={saving} className="min-h-11 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Submitting…' : 'Submit ticket'}</button></form> : <><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"><div className="rounded-xl bg-gray-50 p-4"><p className="mb-1 text-xs font-medium text-gray-500">Your request · {supportDate(selected.created_at)}</p><p className="whitespace-pre-wrap text-sm text-gray-800">{selected.description}</p></div>{messages.map(message => <div key={message.id} className={`rounded-xl p-4 ${message.sender_role === 'superadmin' ? 'border border-gray-200 bg-white' : 'bg-gray-50'}`}><p className="mb-1 text-xs font-semibold text-gray-500">{message.sender_role === 'superadmin' ? 'Support team' : 'You'} · {supportDate(message.created_at)}</p><p className="whitespace-pre-wrap text-sm text-gray-800">{message.body}</p></div>)}</div>{selected.status !== 'closed' && <form onSubmit={sendReply} className="shrink-0 border-t border-gray-100 p-4 sm:p-5"><label className="mb-2 block text-xs font-medium text-gray-600">Add an update to this ticket</label><div className="flex gap-2"><input value={reply} onChange={event => setReply(event.target.value)} minLength={2} maxLength={4000} required className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Write your follow-up" /><button disabled={saving || !reply.trim()} aria-label="Send update" className="grid h-10 w-11 shrink-0 place-items-center rounded-lg bg-gray-900 text-white disabled:opacity-50"><Send size={17} /></button></div></form>}</>}
    </div></div>, document.body)}
    {categoryOpen && formOpen && createPortal(
      <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4" onClick={() => setCategoryOpen(false)}>
        <div role="dialog" aria-modal="true" aria-label="Choose ticket category" className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-gray-900">Choose a category</h3><button type="button" aria-label="Close categories" onClick={() => setCategoryOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="space-y-1 p-2">{SUPPORT_CATEGORIES.map(category => <button type="button" key={category} onClick={() => { setForm(previous => ({ ...previous, category })); setCategoryOpen(false) }} className={`flex min-h-12 w-full items-center rounded-xl px-4 text-left text-sm font-medium ${form.category === category ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>{category}</button>)}</div>
        </div>
      </div>, document.body)}
  </div>
}
