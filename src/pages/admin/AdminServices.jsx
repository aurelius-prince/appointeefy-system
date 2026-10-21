import { useState } from 'react'
import { X, Clock, PhilippinePeso } from 'lucide-react'
import { useService } from '../../context/ServiceContext'
import PageHeader from '../../components/common/PageHeader'

// Pet Sitting is the ONLY service type — name is fixed
const SERVICE_NAME = 'Pet Sitting'

const EMPTY_FORM = { price: '', duration: '', desc: '', pricingType: 'per_hour', max: '10', mixedTypes: true }

const fmtPricing = (s) => s.pricingType === 'per_day'
  ? `₱${s.price.toLocaleString()} / day`
  : `₱${s.price.toLocaleString()} / hr`

const fmtDuration = (s) => s.pricingType === 'per_day'
  ? `${s.duration} day${s.duration > 1 ? 's' : ''}`
  : `${s.duration} hr${s.duration > 1 ? 's' : ''}`

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

export default function AdminServices() {
  const { services, petTypes, setPetTypes, updateService } = useService()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [newType, setNewType] = useState('')
  const [petTypeError, setPetTypeError] = useState('')

  // Only one Pet Sitting service allowed
  const petSittingService = services.find(s => s.name === SERVICE_NAME)

  const openEdit = (s) => {
    setForm({
      price: String(s.price),
      duration: String(s.duration),
      desc: s.desc || '',
      pricingType: s.pricingType || 'per_hour',
      max: String(s.max || 10),
      mixedTypes: s.mixedTypes ?? true,
    })
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const e = {}
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Enter a valid price.'
    if (!form.duration || isNaN(form.duration) || Number(form.duration) <= 0) e.duration = 'Enter a valid duration.'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    const data = { ...form, name: SERVICE_NAME }
    updateService(petSittingService.id, data)
    setShowModal(false)
  }

  const addPetType = () => {
    const trimmed = newType.trim()
    if (!trimmed) return
    if (petTypes.map(p => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setPetTypeError('Already exists.'); return
    }
    setPetTypes(prev => [...prev, trimmed])
    setNewType('')
    setPetTypeError('')
  }

  return (
    <div className="service-panel">
      <PageHeader title="Services" subtitle="Manage pricing and accepted pet types" />

      <div className="services-content-grid">
      {/* Pet Sitting Service Card */}
      <div>
        {!petSittingService ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-400 text-sm">No Pet Sitting service set up yet. Contact support to configure.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800 text-lg">{petSittingService.name}</p>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Fixed Service</span>
              </div>
              <button onClick={() => openEdit(petSittingService)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                Edit Pricing
              </button>
            </div>
            {petSittingService.desc && <p className="text-sm text-gray-400 mb-3">{petSittingService.desc}</p>}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                <PhilippinePeso size={14} />
                <span>{fmtPricing(petSittingService)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock size={13} />
                <span>{fmtDuration(petSittingService)}</span>
              </div>
              <span className="text-gray-400 text-xs">Max {petSittingService.max} pets</span>
            </div>
          </div>
        )}
      </div>

      {/* Pet Types */}
      <div className="pet-types-panel bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Accepted Pet Types</p>
          <p className="text-xs text-gray-400 mt-0.5">Clients will choose from these when booking</p>
        </div>
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
          <input value={newType}
            onChange={e => { setNewType(e.target.value); setPetTypeError('') }}
            onKeyDown={e => e.key === 'Enter' && addPetType()}
            placeholder="e.g. Bird, Rabbit, Hamster..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addPetType}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Add
          </button>
        </div>
        {petTypeError && <p className="px-6 text-xs text-red-500 pt-2">{petTypeError}</p>}
        <div className="p-5 flex flex-wrap gap-2">
          {petTypes.length === 0
            ? <p className="text-sm text-gray-400 italic">No pet types added yet.</p>
            : petTypes.map(type => (
                <span key={type} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {type}
                  <button onClick={() => setPetTypes(prev => prev.filter(p => p !== type))} className="hover:text-red-500">
                    <X size={13} />
                  </button>
                </span>
              ))
          }
        </div>
      </div>
      </div>

      {/* Edit Modal — no service name field */}
      {showModal && (
        <div className="service-edit-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="service-edit-dialog bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Pet Sitting Service</h3>
                <p className="text-xs text-gray-400">Set your pricing and availability</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (₱)" error={errors.price}>
                  <input type="number" min={1} value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
                <Field label="Duration" error={errors.duration}>
                  <div className="flex gap-1.5">
                    <input type="number" min={1} value={form.duration}
                      onChange={e => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 2"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden text-xs font-medium shrink-0">
                      <button type="button" onClick={() => setForm({ ...form, pricingType: 'per_hour' })}
                        className={`px-2 py-2.5 transition-colors ${form.pricingType === 'per_hour' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        hrs
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, pricingType: 'per_day' })}
                        className={`px-2 py-2.5 transition-colors ${form.pricingType === 'per_day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        days
                      </button>
                    </div>
                  </div>
                </Field>
              </div>

              {/* Max Pets */}
              <Field label="Max Pets per Booking">
                <input type="number" min={1} value={form.max}
                  onChange={e => setForm({ ...form, max: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </Field>

              {/* Mixed Types Toggle */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer"
                onClick={() => setForm({ ...form, mixedTypes: !form.mixedTypes })}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow Mixed Pet Types</p>
                  <p className="text-xs text-gray-400">{form.mixedTypes ? 'Cat + Dog allowed together' : 'One pet type only per booking'}</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${form.mixedTypes ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.mixedTypes ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              {/* Description */}
              <Field label="Description (optional)">
                <input type="text" value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                  placeholder="Short description..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
