import { createContext, useContext, useState, useEffect } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────
const generateAccountId = (accounts) => {
  const nums = accounts.map((a) => parseInt(a.id?.replace('CAL-', '') || '0')).filter((n) => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `CAL-${String(next).padStart(5, '0')}`
}

const generateEmail = (name) => {
  const clean = name.trim().toLowerCase().replace(/[^a-z\s]/g, '')
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return `${parts[0]}@calendaryo.com`
  return `${parts[0]}.${parts[parts.length - 1]}@calendaryo.com`
}

const generatePassword = (accountId) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `Cal@${rand}#${accountId.replace('CAL-', '')}`
}

const today = () => new Date().toISOString().split('T')[0]

// Relative date helpers
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const monthsFromNow = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().split('T')[0] }
const monthsAgo = (n) => monthsFromNow(-n)
const daysAgo = (n) => daysFromNow(-n)

// ─── localStorage helpers ────────────────────────────────────────────────────
const DATA_VERSION = '2'

const load = (key, fallback) => {
  try {
    const version = localStorage.getItem('cal_version')
    if (version !== DATA_VERSION) {
      localStorage.clear()
      localStorage.setItem('cal_version', DATA_VERSION)
      return fallback
    }
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ─── Initial Mock Data ───────────────────────────────────────────────────────
const MOCK_PROOF = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAADICAYAAABS39xVAAAABmJLR0QA/wD/AP+gvaeTAAAA50lEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBuAABHgAAAABJRU5ErkJggg=='

const INIT_ACCOUNTS = [
  { id: 'CAL-00001', name: 'Maria Santos', email: 'maria.santos@calendaryo.com', phone: '09171234567', business_type: 'Pet Sitter', status: 'trial', trial_ends: daysFromNow(10), subscribed_until: null, registered: daysAgo(5) },
  { id: 'CAL-00002', name: 'Juan Dela Cruz', email: 'juan.delacruz@calendaryo.com', phone: '09181234567', business_type: 'Pet Sitter', status: 'active', trial_ends: null, subscribed_until: monthsFromNow(6), registered: monthsAgo(7) },
  { id: 'CAL-00003', name: 'Ana Reyes', email: 'ana.reyes@calendaryo.com', phone: '09191234567', business_type: 'Pet Sitter', status: 'expired', trial_ends: null, subscribed_until: monthsAgo(2), registered: monthsAgo(12) },
  { id: 'CAL-00004', name: 'Carlo Mendoza', email: 'carlo.mendoza@calendaryo.com', phone: '09201234567', business_type: 'Pet Sitter', status: 'suspended', trial_ends: null, subscribed_until: monthsFromNow(2), registered: monthsAgo(9) },
  { id: 'CAL-00005', name: 'Liza Gomez', email: 'liza.gomez@calendaryo.com', phone: '09211234567', business_type: 'Pet Sitter', status: 'pending', trial_ends: null, subscribed_until: null, registered: daysAgo(3) },
]

const INIT_SUBS = [
  {
    accountId: 'CAL-00002', name: 'Juan Dela Cruz', email: 'juan.delacruz@calendaryo.com', business_type: 'Pet Sitter',
    status: 'active', start: monthsAgo(7), expiry: monthsFromNow(6), plan: 'Monthly', amount: 299,
    logs: [
      { id: 1, type: 'extend', plan: 'Monthly', amount: 299, method: 'GCash', reference: 'GC-001', from: monthsAgo(1), to: monthsFromNow(6), date: monthsAgo(1) },
      { id: 2, type: 'renew', plan: 'Monthly', amount: 299, method: 'GCash', reference: 'GC-002', from: monthsAgo(7), to: monthsAgo(1), date: monthsAgo(7) },
    ],
  },
  {
    accountId: 'CAL-00003', name: 'Ana Reyes', email: 'ana.reyes@calendaryo.com', business_type: 'Pet Sitter',
    status: 'expired', start: monthsAgo(12), expiry: monthsAgo(2), plan: 'Monthly', amount: 299,
    logs: [
      { id: 1, type: 'renew', plan: 'Monthly', amount: 299, method: 'GCash', reference: 'GC-003', from: monthsAgo(12), to: monthsAgo(2), date: monthsAgo(12) },
    ],
  },
]

const INIT_PAYMENTS = [
  { id: 1, accountId: 'CAL-00001', name: 'Maria Santos', email: 'maria.santos@calendaryo.com', business_type: 'Pet Sitter', plan: 'Monthly', amount: 299, method: 'GCash', reference: 'GC-20260101-001', proof: MOCK_PROOF, status: 'pending', submitted: daysAgo(5), logs: [] },
  { id: 2, accountId: 'CAL-00005', name: 'Liza Gomez', email: 'liza.gomez@calendaryo.com', business_type: 'Pet Sitter', plan: 'Annual', amount: 2990, method: 'Bank Transfer', reference: 'BT-20260102-002', proof: MOCK_PROOF, status: 'pending', submitted: daysAgo(3), logs: [] },
  {
    id: 3, accountId: 'CAL-00002', name: 'Juan Dela Cruz', email: 'juan.delacruz@calendaryo.com', business_type: 'Pet Sitter', plan: 'Monthly', amount: 299, method: 'GCash', reference: 'GC-20260103-003', proof: MOCK_PROOF, status: 'verified', submitted: monthsAgo(1),
    logs: [
      { id: 1, action: 'Payment Submitted', date: monthsAgo(1), by: 'Juan Dela Cruz', note: 'GCash payment submitted with proof.' },
      { id: 2, action: 'Payment Verified', date: monthsAgo(1), by: 'Super Admin', note: 'Payment confirmed. Account activated.' },
    ],
  },
]

const INIT_DISCOUNTS = [
  { id: 1, code: 'WELCOME20', type: 'percentage', value: 20, applicable: 'both', limit: 50, used: 12, expiry: '2026-12-31', active: true },
  { id: 2, code: 'SAVE100', type: 'fixed', value: 100, applicable: 'monthly', limit: 20, used: 5, expiry: '2026-08-01', active: true },
  { id: 3, code: 'ANNUAL10', type: 'percentage', value: 10, applicable: 'annual', limit: 30, used: 5, expiry: '2027-01-01', active: true },
  { id: 4, code: 'LAUNCH50', type: 'fixed', value: 50, applicable: 'both', limit: 100, used: 88, expiry: '2026-07-01', active: true },
]

const INIT_REQUESTS = [
  { id: 'REQ-001', name: 'Pedro Villanueva', email: 'pedro.villanueva@gmail.com', phone: '09221234567', business_type: 'Pet Sitter', message: 'I want to offer pet sitting services in Quezon City.', submitted: daysAgo(1), status: 'pending' },
  { id: 'REQ-002', name: 'Rosa Bautista', email: 'rosa.bautista@gmail.com', phone: '09231234567', business_type: 'Pet Sitter', message: 'Experienced pet groomer looking to expand online.', submitted: daysAgo(2), status: 'pending' },
]

const PLANS = {
  Monthly: { price: 299, label: '₱299 / month' },
  Annual: { price: 2990, label: '₱2,990 / year (2 months free)' },
}

// ─── Context ─────────────────────────────────────────────────────────────────
const SuperAdminContext = createContext(null)

export function SuperAdminProvider({ children }) {
  const [accounts, setAccounts] = useState(() => load('cal_accounts', INIT_ACCOUNTS))
  const [subs, setSubs] = useState(() => load('cal_subs', INIT_SUBS))
  const [payments, setPayments] = useState(() => load('cal_payments', INIT_PAYMENTS))
  const [requests, setRequests] = useState(() => load('cal_requests', INIT_REQUESTS))
  const [discounts, setDiscounts] = useState(() => load('cal_discounts', INIT_DISCOUNTS))

  useEffect(() => { save('cal_accounts', accounts) }, [accounts])
  useEffect(() => { save('cal_subs', subs) }, [subs])
  useEffect(() => { save('cal_payments', payments) }, [payments])
  useEffect(() => { save('cal_requests', requests) }, [requests])
  useEffect(() => { save('cal_discounts', discounts) }, [discounts])

  // ── Accounts ──────────────────────────────────────────────────────────────
  const addAccount = (form) => {
    const todayStr = today()
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 15)

    const accountId = generateAccountId(accounts)
    const email = generateEmail(form.name)
    const password = generatePassword(accountId)

    const newAccount = {
      id: accountId,
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      business_type: form.business_type,
      status: form.status,
      trial_ends: form.status === 'trial' ? trialEnd.toISOString().split('T')[0] : null,
      subscribed_until: null,
      registered: todayStr,
    }

    setAccounts((prev) => [newAccount, ...prev])

    // If active, create a blank subscription record
    if (form.status === 'active') {
      setSubs((prev) => [
        {
          accountId,
          name: form.name.trim(),
          email,
          business_type: form.business_type,
          status: 'active',
          start: todayStr,
          expiry: null,
          plan: '—',
          amount: 0,
          logs: [],
        },
        ...prev,
      ])
    }

    return { accountId, email, password, name: form.name.trim() }
  }

  const updateAccountStatus = (id, status) => {
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    setSubs((prev) => prev.map((s) => s.accountId === id ? { ...s, status } : s))
  }

  // ── Registration Requests ─────────────────────────────────────────────────
  const submitRequest = (form) => {
    const req = {
      id: `REQ-${Date.now()}`,
      ...form,
      submitted: today(),
      status: 'pending',
    }
    setRequests((prev) => [req, ...prev])
  }

  const approveRequest = (reqId) => {
    const req = requests.find((r) => r.id === reqId)
    if (!req) return

    const accountId = generateAccountId(accounts)
    const email = generateEmail(req.name)
    const password = generatePassword(accountId)
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 15)

    const newAccount = {
      id: accountId,
      name: req.name,
      email,
      phone: req.phone,
      business_type: req.business_type,
      status: 'trial',
      trial_ends: trialEnd.toISOString().split('T')[0],
      subscribed_until: null,
      registered: today(),
    }
    setAccounts((prev) => [newAccount, ...prev])
    setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status: 'approved' } : r))
    return { accountId, email, password, name: req.name }
  }

  const rejectRequest = (reqId, reason) => {
    setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status: 'rejected', reason } : r))
  }

  const deleteAccount = (id) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setSubs((prev) => prev.filter((s) => s.accountId !== id))
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const getLogType = (status) => ['expired', 'trial'].includes(status) ? 'renew' : 'extend'

  const applySubscription = (subId, plan) => {
    setSubs((prev) => prev.map((s) => {
      if (s.accountId !== subId) return s
      const logType = getLogType(s.status)
      const todayStr = today()
      const fromDate = logType === 'renew' ? todayStr : s.expiry
      const base = new Date(logType === 'renew' ? new Date() : s.expiry)
      if (plan === 'Monthly') base.setMonth(base.getMonth() + 1)
      else base.setFullYear(base.getFullYear() + 1)
      const toDate = base.toISOString().split('T')[0]

      const newLog = {
        id: Date.now(),
        type: logType,
        plan,
        amount: PLANS[plan].price,
        method: 'Manual',
        reference: `MAN-${Date.now()}`,
        from: fromDate,
        to: toDate,
        date: todayStr,
      }

      const updated = { ...s, expiry: toDate, plan, amount: PLANS[plan].price, status: 'active', logs: [newLog, ...s.logs] }
      // Sync account subscribed_until
      setAccounts((prev2) => prev2.map((a) => a.id === subId ? { ...a, status: 'active', subscribed_until: toDate } : a))
      return updated
    }))
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  const verifyPayment = (paymentId) => {
    const todayStr = today()
    setPayments((prev) => prev.map((p) => {
      if (p.id !== paymentId) return p
      const newLog = { id: Date.now(), action: 'Payment Verified', date: todayStr, by: 'Super Admin', note: 'Payment confirmed. Account activated.' }
      return { ...p, status: 'verified', logs: [...p.logs, newLog] }
    }))

    // Find payment to get account info
    const payment = payments.find((p) => p.id === paymentId)
    if (!payment) return

    // Activate account
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== payment.accountId) return a
      const base = new Date()
      if (payment.plan === 'Monthly') base.setMonth(base.getMonth() + 1)
      else base.setFullYear(base.getFullYear() + 1)
      const toDate = base.toISOString().split('T')[0]
      return { ...a, status: 'active', subscribed_until: toDate }
    }))

    // Add/update subscription record
    setSubs((prev) => {
      const exists = prev.find((s) => s.accountId === payment.accountId)
      const base = new Date()
      if (payment.plan === 'Monthly') base.setMonth(base.getMonth() + 1)
      else base.setFullYear(base.getFullYear() + 1)
      const toDate = base.toISOString().split('T')[0]

      const newLog = {
        id: Date.now(),
        type: exists ? getLogType(exists.status) : 'renew',
        plan: payment.plan,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        from: todayStr,
        to: toDate,
        date: todayStr,
      }

      if (exists) {
        return prev.map((s) =>
          s.accountId === payment.accountId
            ? { ...s, status: 'active', plan: payment.plan, amount: payment.amount, expiry: toDate, logs: [newLog, ...s.logs] }
            : s
        )
      }

      return [
        {
          accountId: payment.accountId,
          name: payment.name,
          email: payment.email,
          business_type: payment.business_type,
          status: 'active',
          start: todayStr,
          expiry: toDate,
          plan: payment.plan,
          amount: payment.amount,
          logs: [newLog],
        },
        ...prev,
      ]
    })
  }

  // ── Discounts ─────────────────────────────────────────────────────────────
  const addDiscount = (form) => {
    const newDiscount = {
      id: Date.now(),
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      applicable: form.applicable,
      limit: Number(form.limit),
      used: 0,
      expiry: form.expiry,
      active: true,
    }
    setDiscounts((prev) => [newDiscount, ...prev])
  }

  const toggleDiscount = (id) => setDiscounts((prev) => prev.map((d) => d.id === id ? { ...d, active: !d.active } : d))
  const deleteDiscount = (id) => setDiscounts((prev) => prev.filter((d) => d.id !== id))
  const useDiscountCode = (code) => setDiscounts((prev) => prev.map((d) => d.code === code ? { ...d, used: d.used + 1 } : d))

  // ── Payments ──────────────────────────────────────────────────────────────
  const submitPayment = (data) => {
    const newPayment = {
      id: Date.now(),
      ...data,
      status: 'pending',
      submitted: today(),
      logs: [{ id: 1, action: 'Payment Submitted', date: today(), by: data.name, note: `${data.method} payment submitted with proof.` }],
    }
    setPayments(prev => [newPayment, ...prev])
  }

  const rejectPayment = (paymentId, note) => {
    const todayStr = today()
    setPayments((prev) => prev.map((p) => {
      if (p.id !== paymentId) return p
      const newLog = { id: Date.now(), action: 'Payment Rejected', date: todayStr, by: 'Super Admin', note: note || 'Payment rejected by Super Admin.' }
      return { ...p, status: 'rejected', logs: [...p.logs, newLog] }
    }))
  }

  return (
    <SuperAdminContext.Provider value={{
      accounts, subs, payments, requests, discounts, PLANS, getLogType,
      addAccount, updateAccountStatus, deleteAccount,
      applySubscription, submitPayment,
      verifyPayment, rejectPayment,
      submitRequest, approveRequest, rejectRequest,
      addDiscount, toggleDiscount, deleteDiscount, useDiscountCode,
      generateAccountId, generateEmail,
    }}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export const useSuperAdmin = () => useContext(SuperAdminContext)
