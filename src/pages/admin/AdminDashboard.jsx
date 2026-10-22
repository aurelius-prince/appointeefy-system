import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users, CheckCircle, Clock, ChevronRight, ChevronLeft, X, PawPrint } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import PageHeader from '../../components/common/PageHeader'
import DateFilter, { getDateRange, filterByRange } from '../../components/common/DateFilter'
import { useAppointments } from '../../context/AppointmentContext'

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
const daysDiff = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000))

const STATUS_DOT  = { pending: 'bg-yellow-400', approved: 'bg-blue-400', confirmed: 'bg-blue-400', 'awaiting payment': 'bg-purple-400', paid: 'bg-green-400', completed: 'bg-green-400', cancelled: 'bg-red-400' }
const STATUS_LINE = { pending: 'bg-yellow-200 text-yellow-800', approved: 'bg-blue-200 text-blue-800', confirmed: 'bg-blue-200 text-blue-800', 'awaiting payment': 'bg-purple-200 text-purple-800', paid: 'bg-purple-200 text-purple-800', completed: 'bg-green-200 text-green-800', cancelled: 'bg-red-200 text-red-700' }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const LEGEND_STATUS = [
  { color: 'bg-blue-400',   label: 'Approved' },
  { color: 'bg-yellow-400', label: 'Pending' },
  { color: 'bg-purple-400', label: 'Awaiting payment' },
  { color: 'bg-green-400',  label: 'Paid / Completed' },
  { color: 'bg-red-500',    label: 'Cancelled' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { appointments, aptsForDay, aptsCheckInDay, upcoming, todayStr } = useAppointments()
  const today = new Date()

  const [preset, setPreset] = useState('This Month')
  const [custom, setCustom]   = useState({ start: '', end: '' })

  const [current, setCurrent]       = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedApt, setSelectedApt] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)

  const [showFullCal, setShowFullCal]     = useState(false)
  const [calCurrent, setCalCurrent]       = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [calSelectedDay, setCalSelectedDay] = useState(null)
  const [showCalDayModal, setShowCalDayModal] = useState(false)
  const [calPickerOpen, setCalPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(today.getFullYear())

  const { year, month } = current
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const { miniLaneById, miniLaneCount } = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    const monthApts = appointments
      .filter(a => a.status !== 'cancelled' && a.checkIn <= monthEnd && a.checkOut >= monthStart)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut) || String(a.id).localeCompare(String(b.id)))
    const laneEnds = []
    const lanes = {}
    monthApts.forEach(apt => {
      let lane = laneEnds.findIndex(end => end < apt.checkIn)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(apt.checkOut) }
      else laneEnds[lane] = apt.checkOut
      lanes[apt.id] = lane
    })
    return { miniLaneById: lanes, miniLaneCount: Math.max(1, laneEnds.length) }
  }, [appointments, year, month, daysInMonth])
  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })

  const getDayApts = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return aptsForDay(dateStr)
  }
  const selectedApts = selectedDay ? getDayApts(selectedDay) : []
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const calPrev = () => setCalCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  const calNext = () => setCalCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })
  const getCalDayApts = (day) => {
    const dateStr = `${calCurrent.year}-${String(calCurrent.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return aptsForDay(dateStr)
  }
  const calFirstDay    = new Date(calCurrent.year, calCurrent.month, 1).getDay()
  const calDaysInMonth = new Date(calCurrent.year, calCurrent.month + 1, 0).getDate()
  // Keep overlapping reservations on separate, stable rows across the month.
  // This makes 26–27 stay on the first line while 27–28 stays on the next line.
  const { calLaneById, calLaneCount } = useMemo(() => {
    const monthStart = `${calCurrent.year}-${String(calCurrent.month + 1).padStart(2, '0')}-01`
    const monthEnd = `${calCurrent.year}-${String(calCurrent.month + 1).padStart(2, '0')}-${String(calDaysInMonth).padStart(2, '0')}`
    const monthApts = appointments
      .filter(a => a.status !== 'cancelled' && a.checkIn <= monthEnd && a.checkOut >= monthStart)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut) || String(a.id).localeCompare(String(b.id)))
    const laneEnds = []
    const lanes = {}
    monthApts.forEach(apt => {
      let lane = laneEnds.findIndex(end => end < apt.checkIn)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(apt.checkOut) }
      else laneEnds[lane] = apt.checkOut
      lanes[apt.id] = lane
    })
    return { calLaneById: lanes, calLaneCount: Math.max(1, laneEnds.length) }
  }, [appointments, calCurrent.year, calCurrent.month, calDaysInMonth])
  const isCalToday = (day) => today.getFullYear() === calCurrent.year && today.getMonth() === calCurrent.month && today.getDate() === day
  const calSelectedApts    = calSelectedDay ? getCalDayApts(calSelectedDay) : []
  const calSelectedDateStr = calSelectedDay
    ? new Date(calCurrent.year, calCurrent.month, calSelectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const todayLabel = today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const todayApts  = aptsCheckInDay(todayStr)

  const range        = getDateRange(preset, custom)
  const filteredApts = useMemo(() => filterByRange(appointments, 'checkIn', range), [appointments, range])

  const stats = useMemo(() => ({
    count:     filteredApts.length,
    pending:   filteredApts.filter(a => a.status === 'pending').length,
    awaitingPayment: filteredApts.filter(a => a.status === 'awaiting payment').length,
    completed: filteredApts.filter(a => a.status === 'completed').length,
    customers: [...new Set(filteredApts.filter(a => a.status !== 'cancelled').map(a => a.customer).filter(Boolean))].length,
  }), [filteredApts])

  return (
    <div className="dashboard-page flex flex-col h-full overflow-hidden">
      <PageHeader title="Dashboard" subtitle={todayLabel} />

      <div className="flex items-center justify-between mb-5">
        <DateFilter preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
        <p className="text-xs text-gray-400">Showing: <span className="font-medium text-gray-600">{preset}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard title={`${preset} Appointments`} value={stats.count}     icon={CalendarDays} color="blue" />
        <StatCard title="Pending"                  value={stats.pending}   icon={Clock}        color="yellow" />
        <StatCard title="Awaiting Payment"         value={stats.awaitingPayment} icon={Clock} color="purple" />
        <StatCard title="Completed"                value={stats.completed} icon={CheckCircle}  color="green" />
        <StatCard title="Clients"                value={stats.customers} icon={Users}        color="purple" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">

        {/* ── Mini Calendar ── */}
        <div className="dashboard-calendar xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-gray-800 min-w-36 text-center">{MONTHS[month]} {year}</span>
              <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <button onClick={() => { setShowFullCal(true); setCalCurrent({ year, month }); setCalSelectedDay(null) }}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
              Full View <ChevronRight size={12} />
            </button>
          </div>

          {/* Legend */}
          <div className="calendar-legend flex flex-wrap items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
            {LEGEND_STATUS.map(({ color, label }) => (
              <div key={label} className="calendar-legend-item flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}

          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-sm font-bold text-gray-600 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="dashboard-calendar-grid grid grid-cols-7 gap-0 mx-4 mb-3 border-l border-t border-gray-200 flex-1 min-h-0">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="border-r border-b border-gray-200 min-h-20" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day  = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const apts = getDayApts(day)
              const todayDay   = isToday(day)
              return (
                <div key={day} onClick={() => { setSelectedDay(day); setShowDayModal(true) }}
                  className={`${todayDay ? 'today-cell ' : ''}relative cursor-pointer transition-all p-0 overflow-visible border-r border-b border-gray-200
                    ${todayDay ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className={`today-date w-6 h-6 ml-1.5 mt-1.5 flex items-center justify-center text-sm font-bold mb-1 shrink-0
                    ${todayDay ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  {apts.length > 0 && <PawPrint size={22} strokeWidth={2} className="absolute right-1 top-1 z-20 text-blue-300/80 pointer-events-none" />}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {Array.from({ length: Math.min(miniLaneCount, 3) }).map((_, lane) => {
                      const apt = apts.find(item => miniLaneById[item.id] === lane)
                      return apt ? (
                        <div key={apt.id} className={`calendar-status-line relative z-10 flex h-5 items-center px-1.5 text-[10px] font-medium truncate ${(apt.checkIn === dateStr || new Date(year, month, day).getDay() === 0) ? 'is-start' : ''} ${(apt.checkOut === dateStr || new Date(year, month, day).getDay() === 6) ? 'is-end' : ''} ${STATUS_LINE[apt.status] || 'bg-gray-100 text-gray-500'}`}>
                          {apt.checkIn === dateStr ? apt.customer.split(' ')[0] : '\u00a0'}
                        </div>
                      ) : <div key={`mini-empty-${lane}`} className="h-5" />
                    })}
                    {apts.length > 3 && <span className="text-[10px] font-bold leading-none text-blue-400 px-1">+{apts.length - 3}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
          {/* Today */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">Today</h2>
              <p className="text-xs text-gray-400">{todayLabel}</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
              {todayApts.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
            {todayApts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No boarders today</p>
            ) : todayApts.map(a => (
              <div key={a.id} onClick={() => setSelectedApt(a)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.customer}</p>
                  <p className="text-xs text-gray-400 truncate">{a.pet} · until {fmtDate(a.checkOut)}</p>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800 text-sm">Upcoming</h2>
            <button onClick={() => navigate('/appointments')} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No upcoming appointments</p>
            ) : upcoming.map(a => {
              const d = new Date(a.checkIn + 'T00:00:00')
              return (
                <div key={a.id} onClick={() => setSelectedApt(a)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex flex-col items-center justify-center shrink-0">
                    <p className="text-xs font-bold text-blue-700 theme-accent-strong leading-none">{d.getDate()}</p>
                    <p className="text-xs text-blue-400 theme-accent-soft leading-none mt-0.5">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.customer}</p>
                    <p className="text-xs text-gray-400 truncate">{a.pet} · until {fmtDate(a.checkOut)}</p>
                  </div>
                  <Badge status={a.status} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Day Detail Modal (mini cal) ── */}
      {showDayModal && selectedDay && createPortal((
        <div className="calendar-day-backdrop" onClick={() => setShowDayModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="Appointments for selected date" className="calendar-day-dialog" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">
                  {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <p className="text-sm text-gray-400">{selectedApts.length} appointment{selectedApts.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowDayModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {selectedApts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No appointments on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedApts.map(apt => (
                    <div key={apt.id} onClick={() => { setSelectedApt(apt); setShowDayModal(false) }}
                      className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[apt.status] || 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{apt.customer}</p>
                          <p className="text-xs text-gray-400">{apt.pet} · {apt.petType}</p>
                        </div>
                      </div>
                      <Badge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Full Calendar Modal ── */}
      {showFullCal && createPortal((
        <div className="full-calendar-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="full-calendar-dialog bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: '85vw', height: '85vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 leading-none">Full calendar</p>
                  <div className="flex items-center gap-1 mt-1">
                    <button aria-label="Previous month" onClick={calPrev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-500"><ChevronLeft size={16} /></button>
                    <p className="font-bold text-gray-800 text-lg min-w-32 text-center">{MONTHS[calCurrent.month]} {calCurrent.year}</p>
                    <button aria-label="Next month" onClick={calNext} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-500"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <div className="relative">
                    <button aria-label="Choose month" onClick={() => { setPickerYear(calCurrent.year); setCalPickerOpen(v => !v) }} className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-600 hover:bg-blue-50">Choose month</button>
                    {calPickerOpen && (
                      <div className="absolute right-0 top-10 z-30 w-64 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => setPickerYear(y => y - 1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500">‹</button>
                          <span className="text-sm font-bold text-gray-800">{pickerYear}</span>
                          <button onClick={() => setPickerYear(y => y + 1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500">›</button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {MONTHS.map((name, index) => (
                            <button key={name} onClick={() => { setCalCurrent({ year: pickerYear, month: index }); setCalPickerOpen(false) }} className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${pickerYear === calCurrent.year && index === calCurrent.month ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}>{name.slice(0, 3)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => { setShowFullCal(false); setCalSelectedDay(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            {/* Full Cal Legend */}
            <div className="calendar-legend flex flex-wrap items-center px-6 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
              {LEGEND_STATUS.map(({ color, label }) => (
                <div key={label} className="calendar-legend-item flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}

            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS_FULL.map(d => (
                  <div key={d} className="py-2 text-center text-sm font-bold text-gray-600 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-gray-200" style={{ gridAutoRows: '1fr' }}>
                {Array.from({ length: calFirstDay }).map((_, i) => (
                  <div key={`ce-${i}`} className="border-r border-b border-gray-200 bg-gray-50/50 min-h-24" />
                ))}
                {Array.from({ length: calDaysInMonth }).map((_, i) => {
                  const day  = i + 1
                  const dateStr = `${calCurrent.year}-${String(calCurrent.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const apts = getCalDayApts(day)
                  const todayDay   = isCalToday(day)
                  return (
                    <div key={day} role="button" tabIndex={0} aria-label={`View appointments for ${MONTHS[calCurrent.month]} ${day}, ${calCurrent.year}`} onClick={() => { setCalSelectedDay(day); setShowCalDayModal(true) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setCalSelectedDay(day); setShowCalDayModal(true) } }}
                      className={`${todayDay ? 'today-cell ' : ''}relative border-r border-b border-gray-200 p-0 cursor-pointer transition-colors min-h-24 overflow-visible
                        ${todayDay ? 'bg-blue-600/5' : 'hover:bg-gray-50'}`}>
                      <div className={`today-date w-7 h-7 ml-2 mt-2 flex items-center justify-center text-sm font-bold mb-1
                        ${todayDay ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
                        {day}
                      </div>
                      {apts.length > 0 && <PawPrint size={28} strokeWidth={2} className="absolute right-2 top-2 z-20 text-blue-300/60 pointer-events-none" />}
                      <div className="space-y-0.5">
                        {Array.from({ length: Math.min(calLaneCount, 4) }).map((_, lane) => {
                          const apt = apts.find(item => calLaneById[item.id] === lane)
                          return apt ? (
                            <div key={apt.id} onClick={(event) => { event.stopPropagation(); setSelectedApt(apt) }} className={`calendar-status-line relative z-10 flex h-6 items-center px-1.5 text-xs font-medium truncate ${(apt.checkIn === dateStr || new Date(calCurrent.year, calCurrent.month, day).getDay() === 0) ? 'is-start' : ''} ${(apt.checkOut === dateStr || new Date(calCurrent.year, calCurrent.month, day).getDay() === 6) ? 'is-end' : ''} ${STATUS_LINE[apt.status] || 'bg-gray-100 text-gray-500'}`}>
                              {apt.checkIn === dateStr ? apt.customer.split(' ')[0] : '\u00a0'}
                            </div>
                          ) : <div key={`empty-${lane}`} className="h-6" />
                        })}
                        {apts.length > 4 && <div className="text-xs text-blue-500 font-semibold px-1">+{apts.length - 4} more</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Cal Day Modal ── */}
      {showCalDayModal && calSelectedDay && createPortal((
        <div className="calendar-day-backdrop" onClick={() => setShowCalDayModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="Appointments for selected date" className="calendar-day-dialog" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">{calSelectedDateStr}</h2>
                <p className="text-sm text-gray-400">{calSelectedApts.length} appointment{calSelectedApts.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowCalDayModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {calSelectedApts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No appointments on this day</p>
              ) : (
                <div className="space-y-2">
                  {calSelectedApts.map(apt => (
                    <div key={apt.id} onClick={() => { setSelectedApt(apt); setShowCalDayModal(false); setShowFullCal(false) }}
                      className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[apt.status] || 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{apt.customer}</p>
                          <p className="text-xs text-gray-400">{apt.pet} ({apt.petType}) · {fmtDate(apt.checkIn)} → {fmtDate(apt.checkOut)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">₱{(daysDiff(apt.checkIn, apt.checkOut) * apt.dailyRate).toLocaleString()}</span>
                        <Badge status={apt.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* ── Appointment Detail Modal ── */}
      {selectedApt && createPortal((
        <div className="calendar-day-backdrop" style={{ zIndex: 1700 }} onClick={() => setSelectedApt(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Appointment Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedApt.customer} · {selectedApt.service || 'Pet Sitting'}</p>
              </div>
              <button onClick={() => setSelectedApt(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">Current status</span>
                <Badge status={selectedApt.status} />
              </div>
              <section className="rounded-xl border border-gray-100 p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Customer & pet</h3>
                {[
                  ['Customer', selectedApt.customer],
                  ['Address', selectedApt.address || 'Not provided'],
                  ['Pet', `${selectedApt.pet} (${selectedApt.petType})`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4"><span className="text-sm text-gray-500">{label}</span><span className="text-sm font-medium text-gray-800 text-right">{value}</span></div>
                ))}
              </section>
              <section className="rounded-xl border border-gray-100 p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Schedule</h3>
                {[
                  ['Check-in', fmtDate(selectedApt.checkIn)],
                  ['Check-out', fmtDate(selectedApt.checkOut)],
                  ['Duration', `${daysDiff(selectedApt.checkIn, selectedApt.checkOut)} day${daysDiff(selectedApt.checkIn, selectedApt.checkOut) !== 1 ? 's' : ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between"><span className="text-sm text-gray-500">{label}</span><span className="text-sm font-medium text-gray-800">{value}</span></div>
                ))}
              </section>
              <section className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">Payment summary</h3>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Daily rate</span><span className="text-sm font-medium text-gray-800">₱{selectedApt.dailyRate.toLocaleString()}</span></div>
                <div className="flex items-center justify-between border-t border-blue-100 pt-2"><span className="font-semibold text-gray-800">Total</span><span className="text-lg font-bold text-blue-700">₱{(daysDiff(selectedApt.checkIn, selectedApt.checkOut) * selectedApt.dailyRate).toLocaleString()}</span></div>
              </section>
              {selectedApt.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-600 mb-1">Notes</p>
                  <p className="text-sm text-amber-800">{selectedApt.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
