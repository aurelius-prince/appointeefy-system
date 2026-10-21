import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Calendar, X } from 'lucide-react'

const PRESETS = ['Today', 'This Week', 'This Month', 'This Year', 'All Time', 'Custom']

export function getDateRange(preset, custom) {
  const now = new Date()
  if (preset === 'Custom') {
    return { start: custom.start || null, end: custom.end || null }
  }
  const start = new Date(now)
  if (preset === 'Today') {
    start.setHours(0,0,0,0)
    return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
  } else if (preset === 'This Week') {
    start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  } else if (preset === 'This Month') {
    start.setDate(1); start.setHours(0,0,0,0)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
  } else if (preset === 'This Year') {
    start.setMonth(0,1); start.setHours(0,0,0,0)
    return { start: start.toISOString().split('T')[0], end: `${start.getFullYear()}-12-31` }
  }
  return { start: null, end: null }
}

export function filterByRange(items, dateKey, range) {
  if (!range.start && !range.end) return items
  return items.filter(a => {
    const d = a[dateKey]
    if (range.start && d < range.start) return false
    if (range.end && d > range.end) return false
    return true
  })
}

export default function DateFilter({ preset, onPresetChange, custom, onCustomChange }) {
  const [open, setOpen] = useState(false)
  const [localCustom, setLocalCustom] = useState(custom || { start: '', end: '' })
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePreset = (p) => {
    onPresetChange(p)
    if (p !== 'Custom') setOpen(false)
  }

  const handleApplyCustom = () => {
    onCustomChange(localCustom)
    setOpen(false)
  }

  const label = preset === 'Custom' && (custom?.start || custom?.end)
    ? `${custom.start || '...'} → ${custom.end || '...'}`
    : preset

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Calendar size={14} className="text-gray-400" />
        <span>{label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-10 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 w-56 overflow-hidden">
          <div className="py-1">
            {PRESETS.filter(p => p !== 'Custom').map(p => (
              <button key={p} onClick={() => handlePreset(p)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  preset === p ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {p}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100">
            <button onClick={() => handlePreset('Custom')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                preset === 'Custom' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              Custom Range
            </button>
            {preset === 'Custom' && (
              <div className="px-4 pb-4 space-y-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">From</label>
                  <input type="date" value={localCustom.start}
                    onChange={e => setLocalCustom(p => ({ ...p, start: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">To</label>
                  <input type="date" value={localCustom.end}
                    onChange={e => setLocalCustom(p => ({ ...p, end: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <button onClick={handleApplyCustom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
