import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react'
import Badge from '../../components/common/Badge'
import { useAppointments } from '../../context/AppointmentContext'

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
const daysDiff = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000))

const STATUS_DOT = { confirmed: 'bg-green-400', pending: 'bg-yellow-400', completed: 'bg-blue-400', cancelled: 'bg-red-400' }
const STATUS_CHIP = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-400 line-through',
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const LEGEND = [
  { color: 'bg-green-400', label: 'Confirmed' },
  { color: 'bg-yellow-400', label: 'Pending' },
  { color: 'bg-blue-400', label: 'Completed' },
  { color: 'bg-red-400', label: 'Cancelled' },
]

export default function AdminCalendar() {
  const { aptsForDay } = useAppointments()
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState(null)

  const { year, month } = current
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })
  const goToday = () => { setCurrent({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDay(today.getDate()) }

  const getDayApts = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return aptsForDay(dateStr)
  }

  const selectedApts = selectedDay ? getDayApts(selectedDay) : []
  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Calendar</h1>
          <p className="text-sm text-gray-500">View boarders by date</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <CalendarDays size={14} /> Today
          </button>
          <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <span className="font-semibold text-gray-800 min-w-36 text-center">{MONTHS[month]} {year}</span>
          <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 px-1">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 border-b border-r border-gray-100 bg-gray-50/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const apts = getDayApts(day)
            const isSelected = selectedDay === day
            const todayDay = isToday(day)
            const statusCounts = apts.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})
            return (
              <div key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-24 border-b border-r border-gray-100 p-2 cursor-pointer transition-colors
                  ${isSelected ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1
                  ${todayDay ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700'}`}>
                  {day}
                </div>
                {/* Status dot row */}
                {apts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mb-1">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-0.5">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                        {count > 1 && <span className="text-[10px] text-gray-500 leading-none">{count}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-0.5">
                  {apts.slice(0, 2).map(apt => (
                    <div key={apt.id} className={`text-xs -mx-2 px-2 py-0.5 rounded-none font-medium truncate ${STATUS_CHIP[apt.status]}`}>
                      {apt.customer.split(' ')[0]} · {apt.pet}
                    </div>
                  ))}
                  {apts.length > 2 && (
                    <div className="text-xs text-blue-500 font-medium px-1">+{apts.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">{selectedDateStr}</h2>
                <p className="text-sm text-gray-400">{selectedApts.length} boarder{selectedApts.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {selectedApts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No boarders on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedApts.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${STATUS_DOT[apt.status]}`} />
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{apt.customer}</p>
                          <p className="text-xs text-gray-500">{apt.pet} ({apt.petType})</p>
                          <p className="text-xs text-gray-400">{fmtDate(apt.checkIn)} → {fmtDate(apt.checkOut)} · {daysDiff(apt.checkIn, apt.checkOut)} day{daysDiff(apt.checkIn, apt.checkOut) !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">₱{(daysDiff(apt.checkIn, apt.checkOut) * apt.dailyRate).toLocaleString()}</p>
                        <Badge status={apt.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
