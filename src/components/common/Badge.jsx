const STATUS_STYLES = {
  // Account statuses
  waitlisted: 'bg-yellow-100 text-yellow-700',
  trial:      'bg-purple-100 text-purple-700',
  monthly:    'bg-blue-100 text-blue-700',
  annual:     'bg-indigo-100 text-indigo-700',
  expired:    'bg-gray-100 text-gray-600',
  suspended:  'bg-red-100 text-red-700',
  // Legacy
  active:     'bg-green-100 text-green-700',
  pending:    'bg-yellow-100 text-yellow-700',
  inactive:   'bg-orange-100 text-orange-600',
  // Payment statuses
  verified:   'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
  // Appointment statuses
  approved:          'bg-blue-100 text-blue-700',
  confirmed:         'bg-blue-100 text-blue-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-700',
  'awaiting payment':'bg-purple-100 text-purple-700',
  // Support
  open:       'bg-blue-100 text-blue-700',
  resolved:   'bg-gray-100 text-gray-600',
}

export default function Badge({ status }) {
  const label = status?.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}
