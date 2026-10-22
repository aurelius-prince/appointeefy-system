import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, Clock, AlertCircle, X, Upload, ZoomIn, QrCode, CalendarDays, ChevronRight, ReceiptText, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { usePlans } from '../../hooks/usePlans'

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })

const fmtDateTime = (value) => value
  ? new Date(value).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—'

const shortTransactionId = (id) => {
  const value = String(id || '')
  return value.length > 8 ? value.slice(0, 8).toUpperCase() : (value || '—')
}

const daysLeft = (d) => Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000)

const estimatedExpiry = (planKey, quantity = 1) => {
  const date = new Date()
  const day = date.getDate()
  date.setDate(1)
  if (planKey === 'monthly') date.setMonth(date.getMonth() + quantity)
  else date.setFullYear(date.getFullYear() + quantity)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const computePrice = (planKey, discount, plans) => {
  const base = planKey === 'monthly' ? (plans.monthly ?? 199) : (plans.annual ?? 1799)
  if (!discount) return { base, final: base, savings: 0 }
  const savings = discount.type === 'percentage'
    ? Math.round(base * discount.value / 100)
    : discount.value
  return { base, final: Math.max(0, base - savings), savings }
}

const uniquePayments = (payments = []) => {
  const seen = new Set()
  return payments.filter((payment) => {
    const key = payment.id || `${payment.reference || ''}-${payment.created_at || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const PAYMENTS_PER_PAGE = 10

export default function AdminSubscription() {
  const { user } = useAuth()
  const { plans } = usePlans()
  const [account, setAccount] = useState({})
  const [myPayments, setMyPayments] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [discounts, setDiscounts] = useState([])
  const accountId = user?.account_id

  const historyPageCount = Math.max(1, Math.ceil(myPayments.length / PAYMENTS_PER_PAGE))
  const currentHistoryPage = Math.min(historyPage, historyPageCount)
  const visiblePayments = myPayments.slice((currentHistoryPage - 1) * PAYMENTS_PER_PAGE, currentHistoryPage * PAYMENTS_PER_PAGE)

  useEffect(() => {
    if (!accountId) return
    supabase.from('accounts').select('*').eq('id', accountId).single()
      .then(({ data }) => { if (data) setAccount(data) })
    supabase.from('payments').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyPayments(uniquePayments(data)) })
    supabase.from('discounts').select('*').eq('active', true)
      .then(({ data }) => { if (data) setDiscounts(data) })
  }, [accountId])

  // Expire unfinished GCash transactions after one hour. The periodic check
  // keeps the history accurate while this page is open; the same rule should
  // also be enforced by a scheduled server job for background expiry.
  useEffect(() => {
    if (!accountId) return undefined
    let active = true
    const expireAwaitingPayments = async () => {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('payments')
        .select('id')
        .eq('account_id', accountId)
        .eq('status', 'awaiting_payment')
        .lt('created_at', cutoff)
      if (!active || !data?.length) return
      const ids = data.map(payment => payment.id)
      const { error } = await supabase.from('payments').update({ status: 'failed' }).in('id', ids)
      if (!error && active) {
        setMyPayments(previous => previous.map(payment => ids.includes(payment.id) ? { ...payment, status: 'failed' } : payment))
        if (draftPayment && ids.includes(draftPayment.id)) {
          setDraftPayment(null)
          setShowPaymentFlow(false)
          setPaymentError('This payment session expired after one hour. Please create a new transaction.')
        }
      }
    }
    expireAwaitingPayments()
    const timer = setInterval(expireAwaitingPayments, 60 * 1000)
    return () => { active = false; clearInterval(timer) }
  }, [accountId])

  const PLANS = [
    { key: 'monthly', label: 'Monthly', price: plans.monthly ?? 199,  desc: 'Billed every month' },
    { key: 'annual',  label: 'Annual',  price: plans.annual  ?? 1799, desc: `Save ₱${(((plans.monthly ?? 199) * 12) - (plans.annual ?? 1799)).toLocaleString()} vs monthly` },
  ]

  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [quantity, setQuantity] = useState(1)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const selectedMethod = 'GCash'
  const [paymentReference, setPaymentReference] = useState('')
  const [proof, setProof] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [zoomImg, setZoomImg] = useState(null)
  const [viewPayment, setViewPayment] = useState(null)

  const [submitted, setSubmitted] = useState(false)
  const [submittedPayment, setSubmittedPayment] = useState(null)
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const [draftPayment, setDraftPayment] = useState(null)

  useEffect(() => {
    const modalOpen = Boolean(viewPayment || showPaymentFlow)
    if (!modalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const main = document.querySelector('.admin-main')
    const previousMainOverflow = main?.style.overflowY
    document.body.style.overflow = 'hidden'
    if (main) main.style.overflowY = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (main) main.style.overflowY = previousMainOverflow
    }
  }, [viewPayment, showPaymentFlow])
  const [paymentError, setPaymentError] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const pricing = computePrice(selectedPlan, appliedDiscount, plans)
  const orderTotal = pricing.final * quantity
  const orderBase = pricing.base * quantity
  const orderSavings = pricing.savings * quantity

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
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setPaymentError('Upload a JPG or PNG image smaller than 5 MB.')
      e.target.value = ''
      return
    }
    setPaymentError('')
    const reader = new FileReader()
    reader.onloadend = () => { setProof(reader.result); setProofPreview(reader.result) }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!proof || !paymentReference.trim() || savingPayment) return
    setPaymentError('')
    setSavingPayment(true)
    const planLabel = selectedPlan === 'monthly' ? 'Monthly' : 'Annual'
    const enteredReference = paymentReference.trim()
    if (draftPayment?.id) {
      const { data, error } = await supabase.from('payments').update({ reference: enteredReference, proof, status: 'pending' }).eq('id', draftPayment.id).select().single()
      if (error) { setPaymentError('Payment proof could not be submitted. Please try again.'); setSavingPayment(false); return }
      setMyPayments(previous => previous.map(payment => payment.id === draftPayment.id ? (data || { ...payment, status: 'pending', proof }) : payment))
      setSubmittedPayment(data || { ...draftPayment, status: 'pending' })
      setSubmitted(true)
      setShowPaymentFlow(false)
      setDraftPayment(null)
      setSavingPayment(false)
      return
    }
    const reference = `${selectedMethod.replace(' ', '').toUpperCase()}-${Date.now()}`
    const { data, error } = await supabase.from('payments').insert({
      account_id: accountId,
      name: account.name || user?.name,
      email: account.email || user?.email,
      business_type: account.business_type,
      plan: planLabel,
      amount: orderTotal,
      quantity,
      method: selectedMethod,
      reference: enteredReference || reference,
      proof,
      discount_code: appliedDiscount?.code || null,
      status: 'pending',
    })
    if (error) { setPaymentError('Payment proof could not be submitted. Please try again.'); setSavingPayment(false); return }
    setSubmittedPayment(data?.[0] || { reference, plan: planLabel, amount: orderTotal, quantity, method: selectedMethod })
    setSubmitted(true)
    setSavingPayment(false)
  }

  const cancelTransaction = async () => {
    if (!draftPayment?.id) { setShowPaymentFlow(false); return }
    setPaymentError('')
    setSavingPayment(true)
    const { data, error } = await supabase.from('payments').update({ status: 'failed' }).eq('id', draftPayment.id).select().single()
    if (error) { setPaymentError('Could not cancel the transaction. Please try again.'); setSavingPayment(false); return }
    setMyPayments(previous => previous.map(payment => payment.id === draftPayment.id ? (data || { ...payment, status: 'failed' }) : payment))
    setDraftPayment(null)
    setShowPaymentFlow(false)
    setSavingPayment(false)
  }

  const cancelSubmittedPayment = async () => {
    if (!viewPayment?.id || savingPayment) return
    setSavingPayment(true)
    const { data, error } = await supabase.from('payments').update({ status: 'failed' }).eq('id', viewPayment.id).select().single()
    if (!error) {
      setMyPayments(previous => previous.map(payment => payment.id === viewPayment.id ? (data || { ...payment, status: 'failed' }) : payment))
      setViewPayment(null)
    }
    setSavingPayment(false)
  }

  const startPayment = async () => {
    if (savingPayment) return
    setPaymentError('')
    setSavingPayment(true)
    const planLabel = selectedPlan === 'monthly' ? 'Monthly' : 'Annual'
    const reference = `${selectedMethod.replace(' ', '').toUpperCase()}-${Date.now()}`
    const paymentPayload = { account_id: accountId, name: account.name || user?.name, email: account.email || user?.email, business_type: account.business_type, plan: planLabel, amount: orderTotal, quantity, method: selectedMethod, reference, discount_code: appliedDiscount?.code || null, status: 'awaiting_payment' }
    let { data, error } = await supabase.from('payments').insert(paymentPayload).select().single()
    // Keep the payment flow compatible with older databases that do not have quantity yet.
    if (error && /quantity/i.test(error.message || '')) {
      const { quantity: _quantity, ...legacyPayload } = paymentPayload
      const retry = await supabase.from('payments').insert(legacyPayload).select().single()
      data = retry.data
      error = retry.error
    }
    if (error || !data) { setPaymentError('Could not create the transaction. Please try again.'); setSavingPayment(false); return }
    const draft = data
    setDraftPayment(draft)
    // Keep the customer-facing field empty; the generated reference is internal
    // until the customer enters the GCash receipt reference.
    setPaymentReference('')
    setMyPayments(previous => uniquePayments([draft, ...previous]))
    setHistoryPage(1)
    setShowPaymentFlow(true)
    setSavingPayment(false)
  }

  const continuePayment = (payment) => {
    if (payment.status !== 'awaiting_payment') return
    setSelectedPlan((payment.plan || '').toLowerCase() === 'annual' ? 'annual' : 'monthly')
    setQuantity(Math.max(1, Number(payment.quantity) || 1))
    setDraftPayment(payment)
    setPaymentReference('')
    setProof(null)
    setProofPreview(null)
    setPaymentError('')
    setShowPaymentFlow(true)
  }

  const resetForm = () => {
    setSubmitted(false)
    setProof(null)
    setProofPreview(null)
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
    setSubmittedPayment(null)
  }

  const status = account.status || 'trial'
  const expiry = status === 'trial' ? account.trial_ends : (account.subscribed_until || account.trial_ends)
  const days = expiry ? daysLeft(expiry) : null

  return (
    <div className="subscription-page">
      <PageHeader title="Subscription" subtitle="Your plan, payments, and billing history in one place" />

      {/* Current Status */}
      <section className="subscription-current">
        <div className="subscription-current-main">
          <div className="subscription-current-identity">
            <div className={`subscription-current-icon ${
              status === 'monthly' || status === 'annual' ? 'bg-green-50' : status === 'trial' ? 'bg-purple-50' : 'bg-red-50'
            }`}>
              {status === 'monthly' || status === 'annual' ? <CheckCircle size={22} className="text-green-500" /> :
               status === 'trial' ? <Clock size={22} className="text-purple-500" /> :
               <AlertCircle size={22} className="text-red-500" />}
            </div>
            <div>
              <p className="subscription-eyebrow">CURRENT PLAN</p>
              <div className="subscription-current-title">
                <h2>
                  {status === 'trial' ? '30-Day Free Trial' : status === 'monthly' ? 'Monthly Plan' : status === 'annual' ? 'Annual Plan' : 'Subscription'}
                </h2>
                <Badge status={status} />
              </div>
            </div>
          </div>
          {days !== null && days <= 5 && days > 0 && (
            <span className="subscription-expiring">Expiring soon</span>
          )}
        </div>
        <div className="subscription-current-meta">
          <div><CalendarDays size={17} /><span>{expiry ? `${status === 'trial' ? 'Trial ends' : 'Valid until'} ${fmtDate(expiry)}` : 'No active expiry date'}</span></div>
          {days !== null && <div><Clock size={17} /><span>{days > 0 ? `${days} days remaining` : 'Plan expired'}</span></div>}
        </div>
      </section>

      {submitted ? (
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 sm:p-8 text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1">Payment Submitted!</h3>
          <p className="text-sm text-gray-500">Your transaction is now pending verification by the Super Admin.</p>
          {submittedPayment && <div className="mt-5 mx-auto max-w-sm rounded-2xl bg-pink-50 border border-pink-100 p-4 text-left">
            <div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-wide text-pink-600">Transaction reference</span><span className="text-xs font-semibold text-amber-600 bg-amber-100 rounded-full px-2 py-1">Pending review</span></div>
            <p className="font-mono text-sm font-bold text-gray-800 break-all">{submittedPayment.reference}</p>
            <div className="mt-3 pt-3 border-t border-pink-100 flex justify-between text-sm"><span className="text-gray-500">{submittedPayment.plan} · {submittedPayment.method}</span><strong className="text-gray-800">₱{Number(submittedPayment.amount || 0).toLocaleString()}</strong></div>
          </div>}
          <p className="text-xs text-gray-400 mt-4">Keep this reference for your records. Verification usually takes up to 24 hours.</p>
          <button onClick={resetForm} className="mt-5 text-sm text-blue-500 hover:underline">
            Submit another payment
          </button>
        </div>
      ) : (
        <div className={`subscription-grid ${showPaymentFlow ? 'payment-modal-open' : ''}`}>
          <div className="subscription-plan-column">

            {/* Plan Selector */}
            <section className="subscription-section subscription-plans">
              <div className="subscription-section-heading"><div><p className="subscription-eyebrow">YOUR NEXT PLAN</p><h2>Choose your billing period</h2><p>Pick the option that works for your business.</p></div></div>
              <div className="subscription-plan-list">
                {PLANS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={selectedPlan === p.key} onClick={() => { setSelectedPlan(p.key); removeDiscount(); setShowPaymentFlow(false) }}
                    className={`subscription-plan-card ${selectedPlan === p.key ? 'subscription-plan-selected' : ''}`}>
                    <span className="subscription-plan-top"><span className="subscription-plan-name">{p.label}</span>{p.key === 'annual' && <span className="subscription-best-value">Best value</span>}</span>
                    <span className="subscription-plan-price">₱{p.price.toLocaleString()}<small> / {p.key === 'monthly' ? 'month' : 'year'}</small></span>
                    <span className="subscription-plan-desc">{p.desc}</span>
                    <span className="subscription-plan-select"><span className="subscription-radio" />{selectedPlan === p.key ? 'Selected plan' : 'Select plan'}</span>
                  </button>
                ))}
              </div>
            </section>

            {showPaymentFlow && createPortal(<div className="subscription-payment-backdrop subscription-page" role="presentation">
            <div className="subscription-payment-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-payment-title">
            <div className="subscription-modal-heading"><div><p className="subscription-eyebrow">GCASH PAYMENT</p><h2 id="subscription-payment-title">Complete your payment</h2><p>{selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} plan · ₱{Number(draftPayment?.amount ?? orderTotal).toLocaleString()}</p></div><button type="button" onClick={() => setShowPaymentFlow(false)} aria-label="Close payment modal" className="subscription-modal-close"><X size={18} /></button></div>
            {/* Payment Method + Proof */}
            <div className="subscription-payment-body">
              <div className="subscription-payment-instructions"><QrCode size={18} /><span>Scan the GCash QR, then enter your reference and upload your receipt.</span></div>
              <div className="subscription-payment-fields">
              <div className="subscription-qr-panel"><img src="/sample-gcash-qr.svg" alt="Sample GCash QR code" /><strong>Scan with GCash</strong><span>Sample QR for testing only</span><a className="subscription-qr-download" href="/sample-gcash-qr.svg" download="gcash-payment-qr.svg">Save QR image</a></div>
              <div className="subscription-payment-inputs">
              <div className="subscription-gcash-account"><span>Payment method</span><strong>GCash</strong></div>
              <label className="subscription-field">GCash reference number
                <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Reference from your GCash receipt" inputMode="numeric" />
              </label>
              <p className="subscription-field-label">Proof of payment</p>
              {proofPreview ? (
                <div className="subscription-proof-preview">
                  <img src={proofPreview} alt="Payment proof preview" />
                  <div>
                    <button type="button" onClick={() => setZoomImg(proofPreview)} aria-label="View payment proof">
                      <ZoomIn size={16} className="text-gray-700" />
                    </button>
                    <button type="button" onClick={() => { setProof(null); setProofPreview(null) }} aria-label="Remove payment proof">
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="subscription-upload">
                  <Upload size={19} />
                  <span>Upload GCash receipt</span>
                  <small>PNG or JPG · up to 5 MB</small>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProof} />
                </label>
              )}
              </div>
              </div>
              <p className="subscription-payment-warning"><ShieldCheck size={16} />Check that your GCash payment is complete and the amount matches your order.</p>
              {paymentError && <p className="subscription-payment-error" role="alert">{paymentError}</p>}
              <div className="subscription-payment-actions"><button type="button" onClick={cancelTransaction} disabled={savingPayment} className="subscription-cancel-button">Cancel transaction</button><button type="button" onClick={handleSubmit} disabled={!proof || !paymentReference.trim() || savingPayment} className="subscription-primary-button">{savingPayment ? 'Saving…' : 'Submit payment proof'}<ChevronRight size={17} /></button></div>
            </div>
            </div>
            </div>, document.body)}
          </div>

          {/* Order Summary */}
          <aside className="subscription-summary">
            <div className="subscription-summary-header"><span className="subscription-summary-icon"><ReceiptText size={19} /></span><div><p className="subscription-eyebrow">CHECKOUT</p><h2>Order summary</h2></div></div>
            <div className="subscription-summary-body">
              <div className="subscription-order-line"><div><strong>{selectedPlan === 'monthly' ? 'Monthly' : 'Annual'} subscription</strong><span>₱{pricing.base.toLocaleString()} per {selectedPlan === 'monthly' ? 'month' : 'year'}</span></div><strong>₱{orderBase.toLocaleString()}</strong></div>
              <div className="subscription-quantity-row"><span>Duration</span><div className="subscription-stepper"><button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Decrease duration" disabled={quantity === 1}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(value => Math.min(99, value + 1))} aria-label="Increase duration" disabled={quantity === 99}>+</button></div><span>{selectedPlan === 'monthly' ? 'month' : 'year'}{quantity > 1 ? 's' : ''}</span></div>
              <div className="subscription-expiry-note"><CalendarDays size={17} /><span>Estimated expiry <strong>{estimatedExpiry(selectedPlan, quantity)}</strong></span></div>
              <div className="subscription-discount"><label htmlFor="subscription-discount-code">Discount code</label><div><input id="subscription-discount-code" value={discountCode} onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError('') }} placeholder="Enter code" /><button type="button" onClick={applyDiscount}>Apply</button></div>{discountError && <p role="alert">{discountError}</p>}{appliedDiscount && <button type="button" className="subscription-discount-applied" onClick={removeDiscount}>{appliedDiscount.code} applied · Remove</button>}</div>
              <div className="subscription-total-details"><span>Subtotal</span><strong>₱{orderBase.toLocaleString()}</strong>{appliedDiscount && <><span>Discount</span><strong className="subscription-savings">−₱{orderSavings.toLocaleString()}</strong></>}</div>
              <div className="subscription-total"><span>Total due</span><strong>₱{orderTotal.toLocaleString()}</strong></div>
              {paymentError && !showPaymentFlow && <p className="subscription-payment-error" role="alert">{paymentError}</p>}
              <button type="button" onClick={startPayment} disabled={savingPayment} className="subscription-primary-button">{savingPayment ? 'Preparing payment…' : 'Proceed to payment'}<ChevronRight size={18} /></button>
              <p className="subscription-summary-footnote"><ShieldCheck size={14} />Your payment will be reviewed before activation.</p>
              <p className="subscription-summary-expiry-note">If you do not continue or submit payment, this transaction will remain Awaiting Payment for 1 hour, then it will be cancelled automatically.</p>
            </div>
          </aside>
        </div>
      )}

      {/* Payment History */}
      <section className="subscription-history">
        <div className="subscription-history-heading"><div><p className="subscription-eyebrow">YOUR TRANSACTIONS</p><h2>Payment history</h2><p>Track payments and continue unfinished transactions.</p></div><span>{myPayments.length} {myPayments.length === 1 ? 'record' : 'records'}</span></div>
        <p className="subscription-history-help">Paid already but marked Failed? Start a new transaction and upload your GCash receipt and reference so we can verify it.</p>
        <div className="payment-history-cards">
          {myPayments.length === 0 ? <p className="mobile-record-empty">No payment history yet.</p> : visiblePayments.map(h => (
            <div className="subscription-history-card" key={h.id}>
              <div><span>{h.plan} plan</span><strong>₱{Number(h.amount || 0).toLocaleString()}</strong></div>
              <div><small>{fmtDateTime(h.created_at)} · {h.method}</small><Badge status={h.status} /></div>
              <p>Transaction ID: {shortTransactionId(h.id)}</p>
              {h.status === 'pending' && <button type="button" onClick={() => setViewPayment(h)} className="subscription-history-continue">View submitted details <ChevronRight size={16} /></button>}
              {h.status === 'awaiting_payment' && <small className="subscription-awaiting-note">Awaiting payment · expires after 1 hour if payment is not completed</small>}
              {h.status === 'awaiting_payment' && <button type="button" onClick={() => continuePayment(h)}>Continue payment <ChevronRight size={16} /></button>}
            </div>
          ))}
        </div>
        <div className="payment-history-table overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Transaction ID</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myPayments.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No payment history yet.</td></tr>
              )}
              {visiblePayments.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{shortTransactionId(h.id)}</td>
                  <td className="px-6 py-3 text-gray-500">{fmtDateTime(h.created_at)}</td>
                  <td className="px-6 py-3 text-gray-700">{h.plan}</td>
                  <td className="px-6 py-3 font-semibold text-gray-800">₱{h.amount?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-500">{h.method}</td>
                  <td className="px-6 py-3"><Badge status={h.status} />{h.status === 'awaiting_payment' && <small className="subscription-awaiting-note">Expires after 1 hour if payment is not completed</small>}</td><td className="px-6 py-3 text-right">{h.status === 'awaiting_payment' ? <button type="button" onClick={() => continuePayment(h)} className="subscription-history-continue">Continue <ChevronRight size={15} /></button> : h.status === 'pending' ? <button type="button" onClick={() => setViewPayment(h)} className="subscription-history-continue">View details <ChevronRight size={15} /></button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {myPayments.length > 0 && <nav className="subscription-history-pagination" aria-label="Payment history pages">
          <span>Showing {(currentHistoryPage - 1) * PAYMENTS_PER_PAGE + 1}–{Math.min(currentHistoryPage * PAYMENTS_PER_PAGE, myPayments.length)} of {myPayments.length}</span>
          <div>
            <button type="button" aria-label="Previous page" onClick={() => setHistoryPage(currentHistoryPage - 1)} disabled={currentHistoryPage === 1}><span className="subscription-page-arrow" aria-hidden="true">‹</span><span className="subscription-page-word">Previous</span></button>
            <span>Page {currentHistoryPage} of {historyPageCount}</span>
            <button type="button" aria-label="Next page" onClick={() => setHistoryPage(currentHistoryPage + 1)} disabled={currentHistoryPage === historyPageCount}><span className="subscription-page-arrow" aria-hidden="true">›</span><span className="subscription-page-word">Next</span></button>
          </div>
        </nav>}
      </section>

      {zoomImg && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="proof zoom" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
      {viewPayment && createPortal(
        <div className="subscription-payment-backdrop subscription-page subscription-details-backdrop" role="presentation" onClick={() => setViewPayment(null)}>
          <div className="subscription-payment-modal subscription-details-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="subscription-modal-heading"><div><p className="subscription-eyebrow">SUBMITTED PAYMENT</p><h2>Transaction details</h2></div><button type="button" onClick={() => setViewPayment(null)} aria-label="Close transaction details" className="subscription-modal-close"><X size={18} /></button></div>
            <div className="subscription-payment-body subscription-details-body">
              <div className="subscription-details-grid"><span>Transaction ID</span><strong>{shortTransactionId(viewPayment.id)}</strong><span>GCash reference</span><strong>{viewPayment.reference || '—'}</strong><span>Plan</span><strong>{viewPayment.plan} · ₱{Number(viewPayment.amount || 0).toLocaleString()}</strong><span>Submitted</span><strong>{fmtDateTime(viewPayment.created_at)}</strong></div>
              {viewPayment.proof ? <img src={viewPayment.proof} alt="Submitted payment proof" className="subscription-submitted-proof" /> : <p className="subscription-payment-error">No payment proof was attached.</p>}
              <p className="subscription-details-help">Wrong photo? Cancel this transaction and create a new one. Submit only the correct photo and GCash reference.</p>
              <button type="button" onClick={cancelSubmittedPayment} disabled={savingPayment} className="subscription-cancel-button">Wrong photo? Cancel transaction</button>
              <button type="button" onClick={() => setViewPayment(null)} className="subscription-primary-button">Close</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}
