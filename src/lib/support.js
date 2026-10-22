export const SUPPORT_CATEGORIES = ['Account', 'Subscription & payment', 'Booking page', 'Appointments', 'Other']

export const SUPPORT_FAQS = [
  { question: 'How do I update my booking page?', answer: 'Open Booking Page, edit the sections you need, then save. Use Preview to review the public page.' },
  { question: 'Where can I check a subscription payment?', answer: 'Open Subscription and check Payment History. Awaiting Payment means your proof has not been submitted. Pending means the receipt is waiting for verification.' },
  { question: 'What if my payment transaction failed after I paid?', answer: 'Start a new transaction from Subscription and submit the same GCash receipt and reference number. Mention the old transaction ID in a support ticket if you need help.' },
  { question: 'Why can’t I open appointments?', answer: 'Appointments are available once your provider account is approved and your trial or subscription is active.' },
  { question: 'How do I contact support?', answer: 'Create a ticket below with one clear issue. The support team can reply inside that ticket, and you can add a follow-up there.' },
]

export const supportDate = value => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const supportStatusLabel = status => ({ open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' })[status] || status
