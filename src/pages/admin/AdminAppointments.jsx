import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, PawPrint, ChevronDown, FileText, RotateCcw, Clock, Trash2 } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import { useBookings } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const splitCustomerNotes = (notes = '') => {
  const lines = String(notes).split('\n').map(line => line.trim()).filter(Boolean)
  const addressLine = lines.find(line => /^Address:\s*/i.test(line)) || ''
  return {
    address: addressLine.replace(/^Address:\s*/i, '').trim(),
    notes: lines.filter(line => !/^Address:\s*/i.test(line)).join('\n'),
  }
}

const fmtDate = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'

const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

const fmtDuration = (hrs) => `${hrs} hr${hrs > 1 ? 's' : ''}`
const fmtServiceDuration = (a) => {
  if (a.pricingType === 'per_day' || a.pricingType === 'daily') {
    const dateDays = a.checkIn && a.checkOut
      ? Math.round((new Date(`${a.checkOut}T00:00:00`) - new Date(`${a.checkIn}T00:00:00`)) / (1000 * 60 * 60 * 24)) + 1
      : 0
    const days = Math.max(1, dateDays || Math.ceil(Number(a.duration || 24) / 24))
    return `${days} day${days > 1 ? 's' : ''}`
  }
  return fmtDuration(Number(a.duration || 0))
}

const bookingOverlaps = (a, b) => {
  const aStart = new Date(`${a.checkIn || a.date}T${a.time || '00:00'}`)
  const aEnd = new Date(`${a.checkOut || a.checkIn || a.date}T${a.endTime || a.time || '23:59'}`)
  const bStart = new Date(`${b.checkIn || b.date}T${b.time || '00:00'}`)
  const bEnd = new Date(`${b.checkOut || b.checkIn || b.date}T${b.endTime || b.time || '23:59'}`)
  return aStart < bEnd && bStart < aEnd
}
const isoDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const now = () => new Date().toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const receiptPrefix = (name) => {
  const words = String(name || 'Business').trim().split(/\s+/).filter(Boolean)
  const prefix = words.length > 1
    ? words.map((word) => word[0]).join('')
    : words[0].length >= 3 ? words[0].slice(0, 2) + words[0].slice(-1) : words[0]
  return prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(3, 'X')
}
const shortAccountCode = (accountId) => {
  let hash = 0
  for (const char of String(accountId || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash).toString(36).toUpperCase().padStart(2, '0').slice(-2)
}
const receiptNumber = (businessName, accountId, id) => {
  let hash = 0
  for (const char of String(id || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  const sequence = String(Math.abs(hash) % 100000).padStart(5, '0')
  return `${receiptPrefix(businessName)}-${shortAccountCode(accountId)}-${sequence}`
}

const STATUS_OPTIONS = ['active', 'all', 'pending', 'approved', 'awaiting payment', 'paid', 'completed', 'cancelled']
const STATUS_LABELS = {
  pending: 'Pending Review',
  reschedule: 'For Reschedule',
  approved: 'Approved',
  'awaiting payment': 'Awaiting Payment',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const ACTION_LABELS = {
  approved: 'Approve',
  'awaiting payment': 'Awaiting Payment',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancel Booking',
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  reschedule: 'bg-orange-100 text-orange-700',
  approved: 'bg-blue-100 text-blue-700',
  'awaiting payment': 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ACTION_COLORS = {
  pending: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200',
  approved: 'bg-blue-600 hover:bg-blue-700 text-white',
  'awaiting payment': 'bg-purple-600 hover:bg-purple-700 text-white',
  paid: 'bg-green-600 hover:bg-green-700 text-white',
  completed: 'bg-green-600 hover:bg-green-700 text-white',
  cancelled: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
}

const STATUS_ACTIONS = {
  pending: ['approved', 'cancelled'],
  approved: ['awaiting payment', 'cancelled'],
  'awaiting payment': ['paid', 'cancelled'],
  paid: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
const STATUS_REVERSE = {
  approved: 'pending',
  'awaiting payment': 'approved',
  paid: 'awaiting payment',
  completed: 'paid',
}

export default function AdminAppointments() {
  function ls(key, fallback) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
  }
  const general = ls('bp_general', { businessName: 'Calendaryo', logo: null })
  const { bookings: appointments, setBookings: setAppointments, updateBooking } = useBookings()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editNote, setEditNote] = useState('')
  const [priceEditing, setPriceEditing] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [downpaymentInput, setDownpaymentInput] = useState('')
  const [fullPaymentInput, setFullPaymentInput] = useState('')
  const [paymentMode, setPaymentMode] = useState('full')
  const [editingPayment, setEditingPayment] = useState({ downpayment: false, full: false })
  const [confirmStatus, setConfirmStatus] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletingAppointment, setDeletingAppointment] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [resetAppointmentsOpen, setResetAppointmentsOpen] = useState(false)
  const [resettingAppointments, setResettingAppointments] = useState(false)
  const [resetError, setResetError] = useState('')
  const [overpayModal, setOverpayModal] = useState(null) // { type, amt, excess, clearFn }
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDates, setRescheduleDates] = useState({ start: '', end: '' })
  const [rescheduleMonth, setRescheduleMonth] = useState(new Date())
  const historyRef = useRef([])
  const [hasHistory, setHasHistory] = useState(false)
  const invoiceRef = useRef()
  const appointmentDialogRef = useRef(null)

  useEffect(() => {
    if (!selected || deleteConfirm) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      if (!showInvoice && appointmentDialogRef.current) appointmentDialogRef.current.scrollTop = 0
    })
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [selected, showInvoice, deleteConfirm])

  const displayStatus = (appointment) => {
    const conflict = appointment?.status === 'pending' && appointments.some(a => a.id !== appointment.id && ['approved', 'confirmed', 'awaiting payment', 'paid'].includes(a.status) && bookingOverlaps(appointment, a))
    return conflict ? 'reschedule' : appointment?.status
  }

  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase()
    return (a.customer.toLowerCase().includes(q) || a.service.toLowerCase().includes(q) || a.pet.toLowerCase().includes(q)) &&
      (statusFilter === 'active'
        ? !['completed', 'cancelled'].includes(a.status)
        : statusFilter === 'all' || a.status === statusFilter)
  })
  const pageSize = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 10 : 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search, statusFilter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const openModal = (a) => {
    setStatusFilterOpen(false)
    setSelected(a)
    setEditPrice(String(a.finalPrice))
    setEditNote(a.priceNote)
    setPriceEditing(false)
    setShowInvoice(false)
    setDownpaymentInput('')
    setFullPaymentInput('')
    setPaymentMode('full')
    setEditingPayment({ downpayment: false, full: false })
    historyRef.current = []
    setHasHistory(false)
    setRescheduleOpen(false)
    setRescheduleDates({ start: a.checkIn || a.date || '', end: a.checkOut || a.date || '' })
    setRescheduleMonth(new Date(`${a.checkIn || a.date || new Date().toISOString().slice(0, 10)}T00:00:00`))
  }

  const closeModal = () => {
    setSelected(null)
    setConfirmStatus(null)
    setOverpayModal(null)
    setRescheduleOpen(false)
    setPriceEditing(false)
    setShowInvoice(false)
    historyRef.current = []
    setHasHistory(false)
    setDownpaymentInput('')
    setFullPaymentInput('')
    setEditingPayment({ downpayment: false, full: false })
  }

  const hasApprovedConflict = selected?.status === 'pending' && appointments.some(a => a.id !== selected.id && ['approved', 'confirmed', 'awaiting payment', 'paid'].includes(a.status) && bookingOverlaps(selected, a))
  const isApprovalBlocked = selected?.status === 'pending' && hasApprovedConflict
  const isCompletedBlocked = (() => {
    if (!selected || selected.status !== 'paid') return false
    const date = selected.checkOut || selected.date
    const time = selected.endTime || selected.time || '23:59'
    const checkOutAt = date ? new Date(`${date}T${time}`) : null
    return !checkOutAt || Number.isNaN(checkOutAt.getTime()) || new Date() < checkOutAt
  })()
  const saveReschedule = () => {
    if (!rescheduleDates.start || !rescheduleDates.end || rescheduleDates.end < rescheduleDates.start) return
    pushHistory(selected)
    const updated = addLog({ ...selected, date: rescheduleDates.start, checkIn: rescheduleDates.start, checkOut: rescheduleDates.end, status: 'pending' }, `Rescheduled to ${rescheduleDates.start} – ${rescheduleDates.end}`)
    updateBooking(updated)
    setSelected(updated)
    setRescheduleOpen(false)
  }

  const calendarDays = (() => {
    const monthStart = new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth(), 1)
    const gridStart = new Date(monthStart)
    gridStart.setDate(1 - monthStart.getDay())
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      const key = isoDate(date)
      const bookings = appointments.filter(a => a.id !== selected?.id && (a.checkIn || a.date) <= key && (a.checkOut || a.checkIn || a.date) >= key && a.status !== 'cancelled')
      const active = bookings.some(a => ['approved', 'confirmed', 'awaiting payment', 'paid'].includes(a.status))
      const pending = bookings.some(a => a.status === 'pending')
      return { date, key, active, pending, inMonth: date.getMonth() === rescheduleMonth.getMonth() }
    })
  })()

  const pushHistory = (snap) => {
    historyRef.current = [...historyRef.current, snap]
    setHasHistory(true)
  }

  const undo = () => {
    const stack = historyRef.current
    if (stack.length === 0) return
    const prev = stack[stack.length - 1]
    historyRef.current = stack.slice(0, -1)
    setHasHistory(historyRef.current.length > 0)
    updateBooking(prev)
    setSelected(prev)
  }

  const addLog = (appt, msg) => ({
    ...appt,
    logs: [{ id: Date.now(), msg, at: now() }, ...appt.logs],
  })

  const savePrice = () => {
    const val = parseFloat(editPrice)
    if (isNaN(val) || val < 0) return
    pushHistory(selected)
    const updated = addLog({ ...selected, finalPrice: val, priceNote: editNote }, `Price adjusted to ₱${val.toLocaleString()}${editNote ? ` — ${editNote}` : ''}`)
    updateBooking(updated)
    setSelected(updated)
    setPriceEditing(false)
  }

  const recordPayment = (type, amount, clearFn) => {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    const otherPaid = (selected.payments || []).filter((p) => p.type !== type).reduce((s, p) => s + p.amount, 0)
    const excess = amt + otherPaid - selected.finalPrice
    if (excess > 0) {
      setOverpayModal({ type, amt, excess, clearFn })
      return
    }
    commitPayment(type, amt, clearFn, 0)
  }

  const commitPayment = (type, amt, clearFn, additional) => {
    pushHistory(selected)
    const existing = (selected.payments || []).find((p) => p.type === type)
    const payments = existing
      ? selected.payments.map((p) => p.type === type ? { ...p, amount: amt, at: now() } : p)
      : [...(selected.payments || []), { id: Date.now(), type, amount: amt, at: now() }]
    let updated = addLog({ ...selected, payments, additional: additional > 0 ? additional : undefined }, type === 'downpayment'
      ? (existing ? 'Downpayment updated: ₱' + amt.toLocaleString() : 'Downpayment recorded: ₱' + amt.toLocaleString())
      : (existing ? 'Full payment updated: ₱' + amt.toLocaleString() : 'Full payment recorded: ₱' + amt.toLocaleString())
    )
    if (additional > 0) updated = addLog(updated, 'Additional recorded: ₱' + additional.toLocaleString())
    const final = { ...updated, payments, additional: additional > 0 ? additional : undefined }
    updateBooking(final)
    setSelected(final)
    clearFn()
    setEditingPayment((v) => ({ ...v, [type]: false }))
    setOverpayModal(null)
  }

  const updateStatus = (newStatus) => {
    if (newStatus === 'approved' && selected?.status === 'pending' && isApprovalBlocked) return
    if (newStatus === 'completed') {
      const checkOutDate = selected?.checkOut || selected?.date
      const checkOutTime = selected?.endTime || selected?.time || '23:59'
      const checkOutAt = checkOutDate ? new Date(`${checkOutDate}T${checkOutTime}`) : null
      if (!checkOutAt || Number.isNaN(checkOutAt.getTime()) || new Date() < checkOutAt) return
    }
    if (newStatus === 'paid' || newStatus === 'completed') {
      const totalPaid = (selected.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      if ((newStatus === 'paid' && selected.status !== 'awaiting payment') ||
          (newStatus === 'completed' && selected.status !== 'paid') ||
          totalPaid < Number(selected.finalPrice || 0)) return
    }
    setConfirmStatus(newStatus)
  }

  const confirmStatusChange = () => {
    if (!confirmStatus) return
    if (confirmStatus === 'approved' && selected?.status === 'pending' && isApprovalBlocked) {
      setConfirmStatus(null)
      return
    }
    const newStatus = confirmStatus
    pushHistory(selected)
    const updated = addLog({ ...selected, status: newStatus }, `Status changed to ${newStatus}`)
    updateBooking(updated)
    setSelected(updated)
    setConfirmStatus(null)
  }

  const resetAppointments = async () => {
    if (!user?.account_id) return
    setResettingAppointments(true)
    setResetError('')
    const { error } = await supabase.from('appointments').delete().eq('account_id', user.account_id)
    if (error) {
      setResetError(error.message || 'Unable to reset appointments.')
    } else {
      setAppointments([])
      setSelected(null)
      setResetAppointmentsOpen(false)
    }
    setResettingAppointments(false)
  }

  const deleteAppointment = async () => {
    if (!selected?.id || !user?.account_id) return
    setDeletingAppointment(true)
    setDeleteError('')
    const { error } = await supabase.from('appointments').delete().eq('id', selected.id).eq('account_id', user.account_id)
    if (error) {
      setDeleteError(error.message || 'Unable to delete appointment.')
    } else {
      setAppointments(appointments.filter(a => a.id !== selected.id))
      setDeleteConfirm(false)
      setSelected(null)
    }
    setDeletingAppointment(false)
  }

  const buildInvoiceHTML = () => {
    const receiptNo = receiptNumber(general.businessName, selected.accountId, selected.txnCode || selected.id)
    const logoHtml = general.logo
      ? '<img src="' + general.logo + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #e5e7eb;" />'
      : '<div style="width:72px;height:72px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:bold;">' + general.businessName.charAt(0) + '</div>'

    const diff = Math.abs(selected.finalPrice - selected.basePrice)
    const adjColor = selected.finalPrice > selected.basePrice ? '#ef4444' : '#16a34a'
    const adjSign = selected.finalPrice > selected.basePrice ? '+' : '-'
    const adjustmentRow = selected.finalPrice !== selected.basePrice
      ? '<tr><td class="lbl">Adjustment</td><td class="val" style="color:' + adjColor + '">' + adjSign + '&#8369;' + diff.toLocaleString() + (selected.priceNote ? '<br/><span style="font-size:11px;color:#9ca3af">(' + selected.priceNote + ')</span>' : '') + '</td></tr>'
      : ''

    const tipRow = selected.additional > 0
      ? '<tr><td class="lbl">Additional</td><td class="val" style="color:#16a34a">+&#8369;' + selected.additional.toLocaleString() + '</td></tr>'
      : ''

    return '<!DOCTYPE html><html><head><title>' + selected.customer + ' - Invoice</title>' +
      '<style>' +
      '@page{size:A4;margin:0}' +
      '*{box-sizing:border-box;margin:0;padding:0}' +
      'body{font-family:Arial,sans-serif;background:#f3f4f6;width:210mm;min-height:297mm;display:flex;align-items:flex-start;justify-content:center;padding:16mm}' +
      '.card{background:#fff;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}' +
      '.hdr{background:#1e40af;padding:32px 40px;display:flex;align-items:center;gap:20px}' +
      '.hdr-text{color:#fff}.hdr-text h1{font-size:22px;font-weight:800}' +
      '.hdr-text p{font-size:12px;color:rgba(255,255,255,.65);margin-top:3px}' +
      '.hdr-right{margin-left:auto;text-align:right;color:#fff}' +
      '.hdr-right .inv{font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px}' +
      '.hdr-right .inv-no{font-size:20px;font-weight:800;letter-spacing:1px}' +
      '.hdr-right .inv-date{font-size:12px;color:rgba(255,255,255,.7);margin-top:2px}' +
      '.body{padding:32px 40px}' +
      '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}' +
      '.ibox{background:#f9fafb;border-radius:10px;padding:16px 20px}' +
      '.ibox .blbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px}' +
      '.irow{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}' +
      '.irow .lbl{color:#6b7280}.irow .val{font-weight:600;color:#111827;text-align:right;max-width:55%}' +
      '.slbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px}' +
      'table.items{width:100%;border-collapse:collapse}' +
      'table.items thead tr{background:#f3f4f6}' +
      'table.items thead td{padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280}' +
      'table.items tbody tr{border-bottom:1px solid #f3f4f6}' +
      'table.items tbody td{padding:12px 14px;font-size:13px;color:#374151}' +
      'table.items tbody td.right{text-align:right}' +
      '.totals{border-top:2px solid #f3f4f6}' +
      '.totals table{width:100%}' +
      '.totals td{padding:7px 14px;font-size:13px}' +
      '.totals td.lbl{color:#6b7280}.totals td.val{text-align:right;font-weight:600;color:#111827}' +
      '.tf td{padding:12px 14px;font-size:17px;font-weight:800;border-top:2px solid #e5e7eb}' +
      '.tf td.lbl{color:#111827}.tf td.val{color:#1d4ed8;text-align:right}' +
      '.srow{display:flex;align-items:center;justify-content:space-between;margin-top:24px;padding:14px 20px;background:#f9fafb;border-radius:10px}' +
      '.sbadge{display:inline-block;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase}' +
      '.b-completed{background:#dcfce7;color:#166534}.b-pending{background:#fef9c3;color:#854d0e}' +
      '.b-cancelled{background:#fee2e2;color:#991b1b}.b-awaiting-payment{background:#f3e8ff;color:#6b21a8}' +
      '.b-approved{background:#dbeafe;color:#1d4ed8}' +
      '.ftr{background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;display:flex;align-items:center;justify-content:space-between}' +
      '.ftr p{font-size:11px;color:#9ca3af}.ftr .thank{font-size:13px;font-weight:600;color:#374151}' +
      '</style></head><body>' +
      '<div class="card">' +
        '<div class="hdr">' +
          '<div style="display:flex;align-items:center;gap:16px">' + logoHtml +
            '<div class="hdr-text"><h1>' + general.businessName + '</h1><p>Acknowledgement Receipt</p></div>' +
          '</div>' +
          '<div class="hdr-right"><div class="inv">Receipt</div><div class="inv-no">' + receiptNo + '</div><div class="inv-date">' + fmtDate(selected.date) + '</div></div>' +
        '</div>' +
        '<div class="body">' +
          '<div class="grid2">' +
            '<div class="ibox"><div class="blbl">Customer</div>' +
              '<div class="irow"><span class="lbl">Name</span><span class="val">' + selected.customer + '</span></div>' +
              '<div class="irow"><span class="lbl">Contact</span><span class="val">' + selected.phone + '</span></div>' +
              '<div class="irow"><span class="lbl">Email</span><span class="val">' + selected.email + '</span></div>' +
            '</div>' +
            '<div class="ibox"><div class="blbl">Pet</div>' +
              '<div class="irow"><span class="lbl">Name</span><span class="val">' + selected.pet + '</span></div>' +
              '<div class="irow"><span class="lbl">Breed</span><span class="val">' + selected.petType + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="slbl">Service Details</div>' +
          '<table class="items"><thead><tr><td>Service</td><td>Check-in / Check-out</td><td>Duration</td><td class="right">Base Price</td></tr></thead>' +
          '<tbody><tr>' +
            '<td><strong>' + selected.service + '</strong></td>' +
            '<td>' + fmtDate(selected.checkIn || selected.date) + ', ' + fmtTime(selected.time) + '<br/>→ ' + fmtDate(selected.checkOut || selected.date) + ', ' + fmtTime(selected.endTime || selected.time) + '</td>' +
            '<td>' + fmtServiceDuration(selected) + '</td>' +
            '<td class="right">&#8369;' + selected.basePrice.toLocaleString() + '</td>' +
          '</tr></tbody></table>' +
          '<div class="totals"><table>' +
            '<tr><td class="lbl">Base Price</td><td class="val">&#8369;' + selected.basePrice.toLocaleString() + '</td></tr>' +
            adjustmentRow +
            tipRow +
          '</table><table><tr class="tf"><td class="lbl">Total Amount</td><td class="val">&#8369;' + selected.finalPrice.toLocaleString() + '</td></tr></table></div>' +
        '</div>' +
        '<div class="ftr"><p class="thank">Thank you for choosing ' + general.businessName + '! &#128062;</p><p>Printed ' + now() + '</p></div>' +
      '</div></body></html>'
  }

  const printInvoice = () => {
    const html = buildInvoiceHTML()
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      const prevTitle = document.title
      document.title = selected.customer + ' - Acknowledgement Receipt'
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      document.title = prevTitle
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 300)
  }

  return (
    <div className="appointments-page h-full min-h-0 flex flex-col overflow-hidden">
      <PageHeader title="Appointments" subtitle="Manage and track all your appointments" action={
        <button type="button" onClick={() => setResetAppointmentsOpen(true)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
          Reset Test Appointments
        </button>
      } />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-none w-72 max-w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search customer, service, pet..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <div className="appointments-status-filter relative">
          <button type="button" onClick={() => setStatusFilterOpen(value => !value)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <span>{statusFilter === 'active' ? 'Active Appointments' : statusFilter === 'all' ? 'All Status' : STATUS_LABELS[statusFilter]}</span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusFilterOpen && <div className="appointments-status-menu absolute left-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            {STATUS_OPTIONS.map(s => <button key={s} type="button" onClick={() => { setStatusFilter(s); setStatusFilterOpen(false) }} className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{s === 'active' ? 'Active Appointments' : s === 'all' ? 'All Status' : STATUS_LABELS[s]}</button>)}
          </div>}
        </div>
      </div>

      <div className="status-process mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">Appointment status process</p>
        <p className="status-process-hint">Swipe to see every step →</p>
        <div className="status-process-steps mt-2 flex items-center gap-1.5 text-xs">
          {[
            ['pending', 'Pending Review'], ['approved', 'Approved'],
            ['awaiting payment', 'Awaiting Payment'], ['paid', 'Paid'], ['completed', 'Completed'],
          ].map(([status, label], index, steps) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_COLORS[status]}`}>{label}</span>
              {index < steps.length - 1 && <span className="text-blue-300">→</span>}
            </span>
          ))}
        </div>
        <p className="process-description mt-2 text-[11px] text-blue-700">Pending, approved, and payment-stage bookings may be cancelled. Paid means the full amount is received.</p>
      </div>

      {/* Table */}
      <div className="appointments-list bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="mobile-record-list">
          {filtered.length === 0 && <p className="mobile-record-empty">No appointments found.</p>}
          {paginated.map(a => <button type="button" key={a.id} className="mobile-record-card" onClick={() => openModal(a)}>
            <span className="mobile-record-top"><strong>{a.customer}</strong><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[displayStatus(a)]}`}>{STATUS_LABELS[displayStatus(a)] || displayStatus(a)}</span></span>
            <span className="mobile-record-sub">{receiptNumber(general.businessName, a.accountId, a.txnCode || a.id)}</span>
            <span className="mobile-record-details"><span>{a.service} · {a.pet}</span><strong>₱{(a.finalPrice || 0).toLocaleString()}</strong></span>
            <span className="mobile-record-sub">{fmtDate(a.date)} · {fmtTime(a.time)} · {fmtServiceDuration(a)}</span>
          </button>)}
        </div>
        <div className="desktop-record-table flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">Pet</th>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No appointments found.</td></tr>
              )}
              {paginated.map((a) => (
                <tr key={a.id} onClick={() => openModal(a)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-gray-800">{a.customer}</p>
                    <p className="text-xs text-gray-400">{receiptNumber(general.businessName, a.accountId, a.txnCode || a.id)}</p>
                  </td>
                  <td className="px-6 py-3.5 text-gray-700">{a.service}</td>
                  <td className="px-6 py-3.5">
                    <p className="text-gray-700">{a.pet}</p>
                    <p className="text-xs text-gray-400">{a.petType}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-gray-700">{fmtDate(a.date)}</p>
                    <p className="text-xs text-gray-400">{fmtTime(a.time)} · {fmtServiceDuration(a)}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-gray-800">₱{(a.finalPrice || 0).toLocaleString()}</p>
                    {a.finalPrice !== a.basePrice && a.basePrice && <p className="text-xs text-gray-400 line-through">₱{a.basePrice.toLocaleString()}</p>}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[displayStatus(a)]}`}>{STATUS_LABELS[displayStatus(a)] || displayStatus(a)}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button type="button" title="Delete appointment" aria-label={`Delete appointment for ${a.customer}`} onClick={(e) => { e.stopPropagation(); setSelected(a); setDeleteError(''); setDeleteConfirm(true) }} className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>{filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`} of {filtered.length} appointments</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-16 text-center">Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && !showInvoice && !deleteConfirm && createPortal((
        <div className="appointment-detail-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div ref={appointmentDialogRef} role="dialog" aria-modal="true" aria-labelledby="appointment-details-title" className="appointment-detail-dialog bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-purple-50">
              <div className="flex items-center gap-3">
                <div className="appointment-icon w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200 ring-4 ring-white">
                  <PawPrint size={20} strokeWidth={2.2} className="text-white" />
                </div>
                <div>
                  <p id="appointment-details-title" className="text-base font-bold text-gray-900">Appointment Details</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.service} · {selected.customer}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold px-5 py-2 rounded-full shadow-sm ${STATUS_COLORS[displayStatus(selected)]}`}>{STATUS_LABELS[displayStatus(selected)] || displayStatus(selected)}</span>
                </span>
                </div>
                <button type="button" aria-label="Close appointment details" onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>

            <div className="appointment-detail-body px-6 py-5 space-y-5">
              {/* Customer & Pet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Customer</p>
                  <p className="text-sm font-medium text-gray-800">{selected.customer}</p>
                  <p className="text-xs text-gray-500">{selected.phone}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                  {splitCustomerNotes(selected.notes).address && (
                    <p className="text-xs text-gray-500 mt-1">{splitCustomerNotes(selected.notes).address}</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Pet</p>
                  <p className="text-sm font-medium text-gray-800">{selected.pet}</p>
                  <p className="text-xs text-gray-500">{selected.petType}</p>
                </div>
              </div>

              {/* Service Details */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Service</p>
                  <p className="font-medium text-gray-800">{selected.service}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                  <p className="font-medium text-gray-800">{fmtServiceDuration(selected)}</p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Check-in</p>
                    <p className="font-medium text-gray-800">{fmtDate(selected.checkIn || selected.date)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmtTime(selected.time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Check-out</p>
                    <p className="font-medium text-gray-800">{fmtDate(selected.checkOut || selected.date)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmtTime(selected.endTime || selected.time)}</p>
                  </div>
                </div>
                {selected.status !== 'completed' && !hasApprovedConflict && (
                  <p className="col-span-2 pl-1 text-left text-xs text-gray-500">Want to reschedule? <span role="button" tabIndex={0} onClick={() => setRescheduleOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRescheduleOpen(true) }} className="cursor-pointer font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-800">click here to choose a new schedule</span>.</p>
                )}
              </div>

              {/* Editable Price */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">Total Price</p>
                  {!priceEditing && selected.status !== 'completed' && selected.status !== 'cancelled' && (
                    <button onClick={() => setPriceEditing(true)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  )}
                </div>
                {priceEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Amount (₱)</label>
                      <input type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Reason for adjustment</label>
                      <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)}
                        placeholder="e.g. Extra charge for matted fur"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPriceEditing(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                      <button onClick={savePrice} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">Save</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-gray-800">₱{(selected.finalPrice || 0).toLocaleString()}</p>
                    {selected.finalPrice !== selected.basePrice && selected.basePrice != null && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Base: <span className="line-through">₱{(selected.basePrice || 0).toLocaleString()}</span>
                        {' '}· {selected.finalPrice > selected.basePrice ? '+' : '-'}₱{Math.abs((selected.finalPrice || 0) - (selected.basePrice || 0)).toLocaleString()}
                      </p>
                    )}
                    {selected.priceNote && <p className="text-xs text-gray-500 mt-1 italic">"{selected.priceNote}"</p>}
                    {selected.additional > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-1">Additional: ₱{selected.additional.toLocaleString()}</p>
                    )}
                    {(selected.payments?.length > 0 || selected.additional > 0) && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Total Received: ₱{((selected.payments || []).reduce((s, p) => s + p.amount, 0)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Recording — awaiting payment only */}
              {selected.status === 'awaiting payment' && (() => {
                const payments = selected.payments || []
                const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
                const remaining = Math.max(0, selected.finalPrice - totalPaid)
                const hasDownpayment = payments.some((p) => p.type === 'downpayment')
                const hasFullPayment = payments.some((p) => p.type === 'full')
                return (
                  <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-purple-800">Record Payment</p>
                      {payments.length > 0 && (
                        <span className="text-xs text-purple-600 font-medium">Paid: ₱{totalPaid.toLocaleString()} / ₱{selected.finalPrice.toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex gap-2 rounded-lg bg-white p-1 border border-purple-100">
                      <button onClick={() => setPaymentMode('full')} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${paymentMode === 'full' ? 'bg-purple-600 text-white' : 'text-purple-700'}`}>Full Payment</button>
                      <button onClick={() => setPaymentMode('downpayment')} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${paymentMode === 'downpayment' ? 'bg-purple-600 text-white' : 'text-purple-700'}`}>Downpayment</button>
                    </div>

                    {/* Downpayment row */}
                    {paymentMode === 'downpayment' && <div className="space-y-1">
                      <label className="text-xs font-medium text-purple-700">Downpayment</label>
                      {hasDownpayment && !editingPayment.downpayment ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-800">
                            ₱{payments.find((p) => p.type === 'downpayment').amount.toLocaleString()}
                          </div>
                          <button onClick={() => { setDownpaymentInput(String(payments.find((p) => p.type === 'downpayment').amount)); setEditingPayment((v) => ({ ...v, downpayment: true })) }}
                            className="border border-purple-300 text-purple-700 hover:bg-purple-100 px-3 py-2 rounded-lg text-sm font-medium">Edit</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} placeholder="Amount" value={downpaymentInput} onChange={(e) => setDownpaymentInput(e.target.value)}
                            className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          <button onClick={() => recordPayment('downpayment', downpaymentInput, () => setDownpaymentInput(''))}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium">Paid</button>
                        </div>
                      )}
                    </div>}

                    {/* Full Payment row */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-purple-700">Full Payment</label>
                      {hasFullPayment && !editingPayment.full ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-800">
                            ₱{payments.find((p) => p.type === 'full').amount.toLocaleString()}
                          </div>
                          <button onClick={() => { setFullPaymentInput(String(payments.find((p) => p.type === 'full').amount)); setEditingPayment((v) => ({ ...v, full: true })) }}
                            className="border border-purple-300 text-purple-700 hover:bg-purple-100 px-3 py-2 rounded-lg text-sm font-medium">Edit</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} placeholder="Amount" value={fullPaymentInput} onChange={(e) => setFullPaymentInput(e.target.value)}
                            className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          <button onClick={() => recordPayment('full', fullPaymentInput, () => setFullPaymentInput(''))}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium">Paid</button>
                        </div>
                      )}
                    </div>

                    {/* Remaining balance */}
                    {payments.length > 0 && (
                      <div className="flex justify-between items-center pt-1 border-t border-purple-200">
                        <span className="text-xs text-gray-500">Remaining balance</span>
                        <span className={`text-sm font-semibold ${remaining === 0 ? 'text-purple-600' : 'text-red-500'}`}>
                          ₱{remaining.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Address is shown in the Customer card; keep only the actual notes here. */}
              {(() => {
                const customerInfo = splitCustomerNotes(selected.notes)
                return customerInfo.notes ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Customer Notes</p>
                    <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 whitespace-pre-line">{customerInfo.notes}</p>
                  </div>
                ) : null
              })()}

              {selected.status !== 'completed' && (
                <div className={hasApprovedConflict ? 'rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 space-y-2' : 'space-y-2'}>
                  {hasApprovedConflict && <>
                    <p className="text-sm font-semibold text-orange-800">Schedule conflict</p>
                    <p className="text-xs text-orange-700">This request overlaps an approved appointment. Choose a new available schedule.</p>
                  </>}
                  {rescheduleOpen ? (
                    <div className="space-y-2 pt-1">
                      <div className="rounded-lg border border-orange-200 bg-white p-2">
                        <div className="flex items-center justify-between mb-2">
                          <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() - 1, 1))} className="px-2 text-orange-700">‹</button>
                          <span className="text-xs font-semibold text-gray-700">{rescheduleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                          <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() + 1, 1))} className="px-2 text-orange-700">›</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-gray-400 mb-1">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map(({ date, key, active, pending, inMonth }) => {
                            const selectedStart = key === rescheduleDates.start
                            const selectedEnd = key === rescheduleDates.end
                            return <button key={key} type="button" disabled={active || !inMonth} onClick={() => setRescheduleDates(v => !v.start || (v.start && v.end) ? ({ start: key, end: '' }) : ({ ...v, end: key }))} className={`h-7 rounded text-[10px] ${!inMonth ? 'text-gray-300' : active ? 'bg-red-100 text-red-700 cursor-not-allowed' : pending ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} ${selectedStart || selectedEnd ? 'ring-2 ring-orange-500 font-bold' : ''}`}>{date.getDate()}</button>
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500"><span><i className="inline-block w-2 h-2 rounded bg-emerald-200 mr-1" />Open</span><span><i className="inline-block w-2 h-2 rounded bg-orange-200 mr-1" />Pending</span><span><i className="inline-block w-2 h-2 rounded bg-red-200 mr-1" />Blocked</span></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={rescheduleDates.start} onChange={e => setRescheduleDates(v => ({ ...v, start: e.target.value }))} className="rounded-lg border border-orange-200 px-2 py-2 text-xs" />
                        <input type="date" value={rescheduleDates.end} onChange={e => setRescheduleDates(v => ({ ...v, end: e.target.value }))} className="rounded-lg border border-orange-200 px-2 py-2 text-xs" />
                      </div>
                      <button type="button" onClick={saveReschedule} className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600">Save Reschedule</button>
                    </div>
                  ) : hasApprovedConflict ? (
                    <span role="button" tabIndex={0} onClick={() => setRescheduleOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRescheduleOpen(true) }} className="inline-block cursor-pointer text-xs font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-800">Reschedule this appointment</span>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              <div className="-mx-6 px-6 pt-4 pb-3 bg-white border-t border-gray-100 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowInvoice(true)}
                  className="basis-[calc(50%-0.375rem)] sm:flex-1 min-w-0 min-h-12 inline-flex items-center justify-center gap-1.5 px-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-[clamp(.68rem,1.6vw,.875rem)] font-medium text-center leading-tight transition-colors"
                >
                  <FileText size={15} /> Receipt
                </button>
                {STATUS_REVERSE[selected.status] && (
                  <button
                    type="button"
                    title={`Return this appointment to ${STATUS_LABELS[STATUS_REVERSE[selected.status]]}`}
                    onClick={() => setConfirmStatus(STATUS_REVERSE[selected.status])}
                    className="theme-hover-action basis-[calc(50%-0.375rem)] sm:flex-1 min-w-0 min-h-12 inline-flex items-center justify-center gap-1 px-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 text-[clamp(.68rem,1.6vw,.875rem)] font-medium text-center leading-tight transition-colors"
                  >
                    <RotateCcw size={14} />
                    Back to {STATUS_LABELS[STATUS_REVERSE[selected.status]]?.replace(' / Confirmed', '').replace('Pending Review', 'Pending').replace('Awaiting Payment', 'Payment')}
                  </button>
                )}
                    {STATUS_ACTIONS[selected.status]
                  .filter((action) => (action !== 'paid' && action !== 'completed') || ((selected.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) >= Number(selected.finalPrice || 0) && !(action === 'completed' && isCompletedBlocked)))
                  .map((action) => (
                  <button key={action} onClick={() => updateStatus(action)} disabled={action === 'approved' && isApprovalBlocked}
                    title={action === 'approved' && isApprovalBlocked ? 'Cannot approve while this schedule overlaps an approved appointment.' : undefined}
                    className={`basis-[calc(50%-.375rem)] sm:flex-1 min-w-0 min-h-12 px-2 rounded-xl text-[clamp(.68rem,1.6vw,.875rem)] font-medium text-center leading-tight transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 ${ACTION_COLORS[action]}`}>
                    {action === 'approved' && isApprovalBlocked ? 'Approval Blocked' : (ACTION_LABELS[action] || action)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Invoice Modal */}
      {selected && showInvoice && createPortal((
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowInvoice(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Acknowledgement Receipt</p>
              <div className="flex items-center gap-2">
                <button onClick={printInvoice} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <FileText size={14} /> Print / Save PDF
                </button>
                <button onClick={() => setShowInvoice(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>

            {/* Invoice Content */}
            <div ref={invoiceRef} className="px-8 py-6">
              <div className="header text-center mb-6">
                {general.logo
                  ? <img src={general.logo} alt="logo" className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border border-gray-100" />
                  : <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">{general.businessName.charAt(0)}</div>
                }
                <h1 className="text-xl font-bold text-gray-800">{general.businessName}</h1>
                <p className="text-xs text-gray-400 mt-1">Acknowledgement Receipt</p>
              </div>

              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>Transaction ID: {receiptNumber(general.businessName, selected.accountId, selected.txnCode || selected.id)}</span>
                <span>{fmtDate(selected.date)}</span>
              </div>

              <hr className="border-gray-100 mb-4" />

              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-800">{selected.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact</span>
                  <span className="text-gray-700">{selected.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pet</span>
                  <span className="text-gray-700">{selected.pet} ({selected.petType})</span>
                </div>
              </div>

              <hr className="border-gray-100 mb-4" />

              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-gray-800">{selected.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-in</span>
                  <span className="text-gray-700">{fmtDate(selected.checkIn || selected.date)}, {fmtTime(selected.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-out</span>
                  <span className="text-gray-700">{fmtDate(selected.checkOut || selected.date)}, {fmtTime(selected.endTime || selected.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-700">{fmtServiceDuration(selected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Price</span>
                  <span className="text-gray-700">₱{selected.basePrice.toLocaleString()}</span>
                </div>
                {selected.finalPrice !== selected.basePrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adjustment</span>
                    <span className={selected.finalPrice > selected.basePrice ? 'text-red-500' : 'text-green-600'}>
                      {selected.finalPrice > selected.basePrice ? '+' : '-'}₱{Math.abs(selected.finalPrice - selected.basePrice).toLocaleString()}
                      {selected.priceNote ? ` (${selected.priceNote})` : ''}
                    </span>
                  </div>
                )}
              </div>

              <hr className="border-gray-100 mb-4" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Total Amount</span>
                <span className="text-xl font-bold text-blue-600">₱{selected.finalPrice.toLocaleString()}</span>
              </div>

              {selected.additional > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-green-600">Additional</span>
                  <span className="text-sm font-semibold text-green-600">+₱{selected.additional.toLocaleString()}</span>
                </div>
              )}

              <p className="text-center text-xs text-gray-400 mt-6">Thank you for choosing {general.businessName}! 🐾</p>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Reset Appointments Confirmation Modal */}
      {resetAppointmentsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div>
              <p className="font-semibold text-gray-900">Reset test appointments?</p>
              <p className="text-sm text-gray-500 mt-1">This will permanently delete all appointments for this business account. This cannot be undone.</p>
            </div>
            {resetError && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{resetError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setResetAppointmentsOpen(false); setResetError('') }} disabled={resettingAppointments} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={resetAppointments} disabled={resettingAppointments} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">{resettingAppointments ? 'Resetting…' : 'Delete All'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div>
              <p className="font-semibold text-gray-900">Delete this appointment?</p>
              <p className="text-sm text-gray-500 mt-1">This will permanently remove <span className="font-medium text-gray-700">{selected.customer}'s</span> appointment.</p>
              <p className="text-sm text-red-600 mt-2">The booking will also be removed from Analytics and cannot be restored.</p>
            </div>
            {deleteError && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{deleteError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deletingAppointment} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">Keep Appointment</button>
              <button type="button" onClick={deleteAppointment} disabled={deletingAppointment} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">{deletingAppointment ? 'Deleting…' : 'Delete Permanently'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {confirmStatus && selected && createPortal((
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">?</div>
              <div>
                <p className="font-semibold text-gray-900">Confirm status change</p>
                <p className="text-sm text-gray-500 mt-1">Are you sure you want to update this appointment?</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-700">{STATUS_LABELS[selected.status] || selected.status}</span>
              <span className="text-gray-400">→</span>
              <span className="theme-modal-accent font-semibold text-blue-700">{STATUS_LABELS[confirmStatus] || confirmStatus}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmStatus(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={confirmStatusChange} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium">Confirm</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Overpayment Confirmation Modal */}
      {overpayModal && createPortal((
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Overpayment Detected</p>
                <p className="text-xs text-gray-400 mt-0.5">Payment exceeds the total amount</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment entered</span>
                <span className="font-medium text-gray-800">₱{overpayModal.amt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total due</span>
                <span className="font-medium text-gray-800">₱{selected.finalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-500">Additional</span>
                <span className="font-semibold text-green-600">+₱{overpayModal.excess.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Record <span className="font-semibold text-green-600">₱{overpayModal.excess.toLocaleString()}</span> as additional payment?</p>
            <div className="flex gap-2">
              <button onClick={() => setOverpayModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => commitPayment(overpayModal.type, overpayModal.amt, overpayModal.clearFn, overpayModal.excess)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium">Confirm</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
