import { useState, useEffect, useRef } from 'react'
import { Bell, Megaphone, MessageSquare, Trash2, X, Send, Users, User, ImageIcon, XCircle } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const EMPTY_FORM = { type: 'announcement', title: '', message: '', to_account_id: null, image: null }

export default function SuperNotifications() {
  const [notifications, setNotifications] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [filter, setFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sending, setSending] = useState(false)
  const [saveError, setSaveError] = useState('')
  const imgRef = useRef()

  useEffect(() => {
    Promise.all([
      supabase.from('notifications').select('*').order('sent_at', { ascending: false }),
      supabase.from('accounts').select('id, name, status').order('name')
    ]).then(([{ data: notifs, error: notificationError }, { data: accs, error: accountError }]) => {
      if (notifs) setNotifications(notifs)
      if (accs) setAccounts(accs)
      if (notificationError || accountError) setSaveError('Notifications or provider accounts could not be loaded. Please refresh.')
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required.'
    if (!form.message.trim()) e.message = 'Message is required.'
    if (form.type === 'message' && !form.to_account_id) e.to = 'Please select a recipient.'
    return e
  }

  const handleSend = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSending(true)
    const { data, error: sendError } = await supabase.from('notifications').insert({
      type: form.type,
      title: form.title.trim(),
      message: form.message.trim(),
      to_account_id: form.to_account_id || null,
      image_url: form.image || null,
    }).select().single()
    if (sendError) { setSaveError('Notification could not be sent. Please try again.'); setSending(false); return }
    if (data) setNotifications(prev => [data, ...prev])
    setSending(false)
    setShowCompose(false)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleDelete = async (id) => {
    const { error: deleteError } = await supabase.from('notifications').delete().eq('id', id)
    if (deleteError) { setSaveError('Notification could not be deleted.'); return }
    setNotifications(prev => prev.filter(n => n.id !== id))
    setDeleteConfirm(null)
  }

  const handleImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setForm(f => ({ ...f, image: e.target.result }))
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Send announcements and messages to providers"
        action={
          <button onClick={() => { setShowCompose(true); setForm(EMPTY_FORM); setErrors({}) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm">
            <Send size={16} /> Compose
          </button>
        }
      />
      {saveError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}

      <div className="flex gap-2 mb-5">
        {[{ key: 'all', label: 'All', icon: Bell }, { key: 'announcement', label: 'Announcements', icon: Megaphone }, { key: 'message', label: 'Messages', icon: MessageSquare }]
          .map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
      </div>

      <div className="space-y-3">
        {loading && <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center text-gray-400">No notifications yet.</div>
        )}
        {filtered.map(n => (
          <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'announcement' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
              {n.type === 'announcement' ? <Megaphone size={18} /> : <MessageSquare size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${n.type === 'announcement' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {n.type === 'announcement' ? 'Announcement' : 'Direct Message'}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  {n.to_account_id ? <><User size={11} /> {accounts.find(a => a.id === n.to_account_id)?.name || 'Specific Provider'}</> : <><Users size={11} /> All Providers</>}
                </span>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
              {n.image_url && <img src={n.image_url} alt="" className="mt-2 rounded-xl w-full max-h-40 object-cover border border-gray-100" />}
              <p className="text-xs text-gray-400 mt-2">{fmtDate(n.sent_at)}</p>
            </div>
            <button onClick={() => setDeleteConfirm(n.id)} className="text-gray-300 hover:text-red-400 shrink-0 mt-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCompose(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">Compose Notification</h3>
              <button onClick={() => setShowCompose(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'announcement', label: 'Announcement', icon: Megaphone }, { value: 'message', label: 'Direct Message', icon: MessageSquare }]
                  .map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => setForm({ ...EMPTY_FORM, type: value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition-colors ${form.type === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <Icon size={18} /><span className="font-medium">{label}</span>
                    </button>
                  ))}
              </div>
              {form.type === 'message' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                  <select value={form.to_account_id || ''} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value || null }))}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.to ? 'border-red-400' : 'border-gray-300'}`}>
                    <option value="">Select a provider...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. System Maintenance"
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.title ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4} placeholder="Write your message..."
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none ${errors.message ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image <span className="text-gray-400 font-normal">(optional)</span></label>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => handleImage(e.target.files[0])} />
                {form.image
                  ? <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img src={form.image} alt="" className="w-full h-40 object-cover" />
                      <button onClick={() => setForm(f => ({ ...f, image: null }))} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-0.5"><XCircle size={18} /></button>
                    </div>
                  : <button type="button" onClick={() => imgRef.current.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-400 hover:text-blue-500">
                      <ImageIcon size={20} /><span className="text-xs">Click to upload image</span>
                    </button>
                }
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCompose(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSend} disabled={sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                <Send size={14} /> {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Delete Notification?</h3>
            <p className="text-sm text-gray-500 mb-5">This will remove it permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
