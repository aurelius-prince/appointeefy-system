import { useState } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_HOURS = {
  Monday:    { open: true,  start: '09:00', end: '17:00' },
  Tuesday:   { open: true,  start: '09:00', end: '17:00' },
  Wednesday: { open: true,  start: '09:00', end: '17:00' },
  Thursday:  { open: true,  start: '09:00', end: '17:00' },
  Friday:    { open: true,  start: '09:00', end: '17:00' },
  Saturday:  { open: true,  start: '10:00', end: '15:00' },
  Sunday:    { open: false, start: '09:00', end: '17:00' },
}

const MOCK_BLOCKED = [
  { id: 1, date: '2024-06-25', reason: 'Holiday' },
  { id: 2, date: '2024-07-04', reason: 'Personal leave' },
]

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })

export default function AdminAvailability() {
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [blocked, setBlocked] = useState(MOCK_BLOCKED)
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' })
  const [saved, setSaved] = useState(false)

  const toggleDay = (day) => setHours(h => ({ ...h, [day]: { ...h[day], open: !h[day].open } }))
  const updateTime = (day, field, val) => setHours(h => ({ ...h, [day]: { ...h[day], [field]: val } }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addBlock = () => {
    if (!newBlock.date) return
    setBlocked(prev => [...prev, { id: Date.now(), ...newBlock }])
    setNewBlock({ date: '', reason: '' })
  }

  const removeBlock = (id) => setBlocked(prev => prev.filter(b => b.id !== id))

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Availability</h1>
          <p className="text-sm text-gray-500">Set your working hours and blocked dates</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <Save size={15} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Working Hours</h2>
          <p className="text-xs text-gray-400 mt-0.5">Set your available hours for each day</p>
        </div>
        <div className="divide-y divide-gray-100">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-28 shrink-0">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div onClick={() => toggleDay(day)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${hours[day].open ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hours[day].open ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className={`text-sm font-medium ${hours[day].open ? 'text-gray-800' : 'text-gray-400'}`}>{day}</span>
                </label>
              </div>
              {hours[day].open ? (
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={hours[day].start}
                    onChange={e => updateTime(day, 'start', e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-gray-400">to</span>
                  <input type="time" value={hours[day].end}
                    onChange={e => updateTime(day, 'end', e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Blocked Dates</h2>
          <p className="text-xs text-gray-400 mt-0.5">Dates when you are unavailable for appointments</p>
        </div>

        {/* Add new block */}
        <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
          <input type="date" value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={newBlock.reason} onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))}
            placeholder="Reason (optional)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addBlock}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Blocked list */}
        <div className="divide-y divide-gray-100">
          {blocked.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No blocked dates</p>
          ) : blocked.map(b => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{fmtDate(b.date)}</p>
                {b.reason && <p className="text-xs text-gray-400">{b.reason}</p>}
              </div>
              <button onClick={() => removeBlock(b.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
