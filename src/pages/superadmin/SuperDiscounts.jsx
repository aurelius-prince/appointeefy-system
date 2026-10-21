import { useState, useEffect } from 'react'
import { Plus, X, Tag, Copy, Check, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import { supabase } from '../../lib/supabase'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
}

const isExpired = (d) => d && new Date(d + 'T00:00:00') < new Date()
const EMPTY_FORM = { code: '', type: 'percentage', value: '', applicable: 'both', limit: '', expiry: '' }

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={copied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function SuperDiscounts() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('discounts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDiscounts(data); setLoading(false) })
  }, [])

  const getStatus = (d) => {
    if (!d.is_active) return 'inactive'
    if (isExpired(d.expiry_date)) return 'expired'
    if (d.used_count >= d.usage_limit) return 'expired'
    return 'active'
  }

  const validate = () => {
    const e = {}
    if (!form.code.trim()) e.code = 'Code is required.'
    else if (discounts.find(d => d.code === form.code.trim().toUpperCase())) e.code = 'Code already exists.'
    if (!form.value || isNaN(form.value) || Number(form.value) <= 0) e.value = 'Enter a valid value.'
    if (form.type === 'percentage' && Number(form.value) > 100) e.value = 'Max 100%.'
    if (!form.limit || isNaN(form.limit) || Number(form.limit) <= 0) e.limit = 'Enter a valid limit.'
    if (!form.expiry) e.expiry = 'Expiry date is required.'
    return e
  }

  const handleAdd = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    const { data, error } = await supabase.from('discounts').insert({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      applicable: form.applicable,
      usage_limit: Number(form.limit),
      used_count: 0,
      expiry_date: form.expiry,
      is_active: true,
    }).select().single()
    if (error) console.error('discounts insert error:', JSON.stringify(error))
    if (data) setDiscounts(prev => [data, ...prev])
    setSaving(false)
    setShowModal(false)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const toggleDiscount = async (id, current) => {
    await supabase.from('discounts').update({ is_active: !current }).eq('id', id)
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d))
  }

  const deleteDiscount = async (id) => {
    await supabase.from('discounts').delete().eq('id', id)
    setDiscounts(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div>
      <PageHeader title="Discounts" subtitle="Manage discount codes for user subscriptions"
        action={
          <button onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setErrors({}) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm">
            <Plus size={16} /> Add Discount
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Codes', value: discounts.length,                                                    color: 'text-gray-800' },
          { label: 'Active',      value: discounts.filter(d => getStatus(d) === 'active').length,             color: 'text-green-600' },
          { label: 'Expired',     value: discounts.filter(d => getStatus(d) === 'expired').length,            color: 'text-red-500' },
          { label: 'Total Used',  value: discounts.reduce((a, d) => a + (d.used_count || 0), 0),             color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3 font-medium">Code</th>
              <th className="px-6 py-3 font-medium">Discount</th>
              <th className="px-6 py-3 font-medium">Applicable</th>
              <th className="px-6 py-3 font-medium">Usage</th>
              <th className="px-6 py-3 font-medium">Expiry</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loading && discounts.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No discount codes yet.</td></tr>}
            {discounts.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-blue-500" />
                    <span className="font-mono font-semibold text-gray-800">{d.code}</span>
                    <CopyBtn text={d.code} />
                  </div>
                </td>
                <td className="px-6 py-3 font-semibold text-gray-800">
                  {d.type === 'percentage' ? `${d.value}% off` : `₱${d.value} off`}
                </td>
                <td className="px-6 py-3 text-gray-600 capitalize">{d.applicable === 'both' ? 'Monthly & Annual' : d.applicable}</td>
                <td className="px-6 py-3 text-gray-500">{d.used_count}/{d.usage_limit}</td>
                <td className="px-6 py-3 text-gray-500">{fmtDate(d.expiry_date)}</td>
                <td className="px-6 py-3"><Badge status={getStatus(d)} /></td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleDiscount(d.id, d.is_active)} className={d.is_active ? 'text-green-500' : 'text-gray-400'}>
                      {d.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => deleteDiscount(d.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">Add Discount Code</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Discount Code" error={errors.code}>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. WELCOME20"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₱)</option>
                  </select>
                </Field>
                <Field label={form.type === 'percentage' ? 'Percent (%)' : 'Amount (₱)'} error={errors.value}>
                  <input type="number" min={1} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. 20"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
              </div>
              <Field label="Applicable To">
                <select value={form.applicable} onChange={e => setForm(f => ({ ...f, applicable: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="both">Monthly & Annual</option>
                  <option value="monthly">Monthly Only</option>
                  <option value="annual">Annual Only</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usage Limit" error={errors.limit}>
                  <input type="number" min={1} value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
                <Field label="Expiry Date" error={errors.expiry}>
                  <input type="date" value={form.expiry} min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Create Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
