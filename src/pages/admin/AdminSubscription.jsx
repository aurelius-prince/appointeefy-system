import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Clock, AlertCircle, Tag, X, Upload, ZoomIn } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { usePlans } from '../../hooks/usePlans'

const PAYMENT_METHODS = [
  { key: 'GCash',         label: 'GCash',         detail: '09XX XXX XXXX · Juan Dela Cruz' },
  { key: 'E-Wallet',      label: 'E-Wallet',      detail: 'Maya · 09XX XXX XXXX · Juan Dela Cruz' },
  { key: 'Bank Transfer', label: 'Bank Transfer', detail: 'BDO · 1234 5678 9012 · Calendaryo Inc.' },
]

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })

const daysLeft = (d) => Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000)

const computePrice = (planKey, discount, plans) => {
  const base = planKey === 'monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
  if (!discount) return { base, final: base, savings: 0 }
  const savings = discount.type === 'percentage'
    ? Math.round(base * discount.value / 100)
    : discount.value
  return { base, final: Math.max(0, base - savings), savings }
}

export default function AdminSubscription() {
  const { user } = useAuth()
  const { plans } = usePlans()
  const [account, setAccount] = useState({})
  const [myPayments, setMyPayments] = useState([])
  const [discounts, setDiscounts] = useState([])
  const accountId = user?.account_id

  useEffect(() => {
    if (!accountId) return
    supabase.from('accounts').select('*').eq('id', accountId).single()
      .then(({ data }) => { if (data) setAccount(data) })
    supabase.from('payments').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyPayments(data) })
    supabase.from('discounts').select('*').eq('active', true)
      .then(({ data }) => { if (data) setDiscounts(data) })
  }, [accountId])

  const PLANS = [
    { key: 'monthly', label: 'Monthly', price: plans.monthly ?? 199,  desc: 'Billed every month' },
    { key: 'annual',  label: 'Annual',  price: plans.annual  ?? 1799, desc: `Save ₱${(((plans.monthly ?? 199) * 12) - (plans.annual ?? 1799)).toLocaleString()} vs monthly` },
  ]

  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('GCash')
  const [proof, setProof] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [zoomImg, setZoomImg] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const pricing = computePrice(selectedPlan, appliedDiscount, plans)

  const applyDiscount = () => {
    setDiscountError('')
    const found = discounts.find(
      (d) =>
        d.code === discountCode.trim().toUpperCase() &&
        d.active &&
        new Date(d.expiry + 'T00:00:00') > new Date() &&
        d.used < d.limit
    )
    if (!found) { setDiscountError('Invalid or expired discount code.'); return }
    if (found.applicable !== 'both' && found.applicable !== selectedPlan) {
      setDiscountError(`This code is only valid for the ${found.applicable} plan.`)
      return
    }
    setAppliedDiscount(found)
  }

  const removeDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
  }

  const handleProof = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => { setProof(reader.result); setProofPreview(reader.result) }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!proof) return
    const planLabel = selectedPlan === 'monthly' ? 'Monthly' : 'Annual'
    await supabase.from('payments').insert({
      account_id: accountId,
      name: account.name || user?.name,
      email: account.email || user?.email,
      business_type: account.business_type,
      plan: planLabel,
      amount: pricing.final,
      method: selectedMethod,
      reference: `${selectedMethod.replace(' ', '').toUpperCase()}-${Date.now()}`,
      proof,
      discount_code: appliedDiscount?.code || null,
      status: 'pending',
    })
    setSubmitted(true)
  }

  const resetForm = () => {
    setSubmitted(false)
    setProof(null)
    setProofPreview(null)
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
  }

  const status = account.status || 'trial'
  const expiry = account.trial_ends || account.subscribed_until
  const days = expiry ? daysLeft(expiry) : null

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Manage your plan and billing" />

      {/* Current Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status === 'monthly' || status === 'annual' ? 'bg-green-50' : status === 'trial' ? 'bg-purple-50' : 'bg-red-50'
            }`}>
              {status === 'monthly' || status === 'annual' ? <CheckCircle size={22} className="text-green-500" /> :
               status === 'trial' ? <Clock size={22} className="text-purple-500" /> :
               <AlertCircle size={22} className="text-red-500" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800">
                  {status === 'trial' ? '30-Day Free Trial' : status === 'monthly' ? 'Monthly Plan' : status === 'annual' ? 'Annual Plan' : 'Subscription'}
                </p>
                <Badge status={status} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {expiry
                  ? `${status === 'trial' ? 'Trial ends' : 'Renews'} ${fmtDate(expiry)} · ${days > 0 ? `${days} days left` : 'Expired'}`
                  : 'No active subscription'}
              </p>
            </div>
          </div>
          {days !== null && days <= 5 && days > 0 && (
            <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              ⚠️ Expiring soon!
            </span>
          )}
        </div>
      </div>

      {submitted ? (
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1">Payment Submitted!</h3>
          <p className="text-sm text-gray-500">Your proof of payment has been submitted. Our team will verify it within 24 hours.</p>
          <button onClick={resetForm} className="mt-5 text-sm text-blue-500 hover:underline">
            Submit another payment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Plan Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-800 mb-4">Choose a Plan</p>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((p) => (
                  <button key={p.key} onClick={() => { setSelectedPlan(p.key); removeDiscount() }}
                    className={`border-2 rounded-xl p-4 text-left transition-all ${
                      selectedPlan === p.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className="font-bold text-gray-800 text-lg">₱{p.price.toLocaleString()}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{p.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                    {selectedPlan === p.key && (
                      <span className="inline-block mt-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Code */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-800 mb-3">Discount Code</p>
              {appliedDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag size={15} className="text-green-600" />
                    <span className="font-mono font-semibold text-green-700">{appliedDiscount.code}</span>
                    <span className="text-xs text-green-600">
                      — {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}% off` : `₱${appliedDiscount.value} off`}
                    </span>
                  </div>
                  <button onClick={removeDiscount} className="text-green-500 hover:text-green-700"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError('') }}
                    placeholder="Enter discount code"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={applyDiscount}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Apply
                  </button>
                </div>
              )}
              {discountError && <p className="text-xs text-red-500 mt-2">{discountError}</p>}
            </div>

            {/* Payment Method + Proof */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-800 mb-3">Payment Method</p>
              <div className="space-y-2 mb-4">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.key} onClick={() => setSelectedMethod(m.key)}
                    className={`w-full flex items-center justify-between border-2 rounded-xl px-4 py-3 transition-all ${
                      selectedMethod === m.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-sm font-medium text-gray-800">{m.label}</span>
                    <span className="text-xs text-gray-500">{m.detail}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm font-medium text-gray-700 mb-2">Upload Proof of Payment</p>
              {proofPreview ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-gray-200">
                  <img src={proofPreview} alt="proof" className="w-full max-h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => setZoomImg(proofPreview)} className="bg-white rounded-lg p-2 shadow">
                      <ZoomIn size={16} className="text-gray-700" />
                    </button>
                    <button onClick={() => { setProof(null); setProofPreview(null) }} className="bg-white rounded-lg p-2 shadow">
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload size={20} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload screenshot</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProof} />
                </label>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
              <p className="font-semibold text-gray-800 mb-4">Order Summary</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} Plan</span>
                  <span>₱{pricing.base.toLocaleString()}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>−₱{pricing.savings.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-800 text-base">
                  <span>Total</span>
                  <span>₱{pricing.final.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={!proof}
                className={`w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  proof ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}>
                Submit Payment
              </button>
              {!proof && <p className="text-xs text-gray-400 text-center mt-2">Upload proof of payment to continue</p>}
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Payment History</h2>
        </div>
        <div className="payment-history-cards">
          {myPayments.length === 0 ? <p className="mobile-record-empty">No payment history yet.</p> : myPayments.map(h => (
            <div className="mobile-record-card" key={h.id}>
              <span className="mobile-record-top"><strong>{h.plan}</strong><Badge status={h.status} /></span>
              <span className="mobile-record-details"><span>{h.method}</span><strong>₱{h.amount?.toLocaleString()}</strong></span>
              <span className="mobile-record-sub">{h.reference} · {h.created_at ? fmtDate(h.created_at.split('T')[0]) : '—'}</span>
            </div>
          ))}
        </div>
        <div className="payment-history-table overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myPayments.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No payment history yet.</td></tr>
              )}
              {myPayments.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{h.reference}</td>
                  <td className="px-6 py-3 text-gray-500">{h.created_at ? fmtDate(h.created_at.split('T')[0]) : '—'}</td>
                  <td className="px-6 py-3 text-gray-700">{h.plan}</td>
                  <td className="px-6 py-3 font-semibold text-gray-800">₱{h.amount?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-500">{h.method}</td>
                  <td className="px-6 py-3"><Badge status={h.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {zoomImg && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="proof zoom" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
