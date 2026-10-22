import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, PawPrint, Clock, PhilippinePeso } from 'lucide-react'
import AppLogo from '../../assets/Logo.png'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const SERVICE_TYPES = [
  { value: 'Pet Sitting', label: 'Pet Sitting' },
]

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const steps = ['Account Info', 'Your Service', 'Review']

export default function Onboarding() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    service_type: 'Pet Sitting',
    // Service details
    price: '',
    duration: '',
    pricingType: 'per_day',
    max: '10',
    mixedTypes: true,
    desc: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    if (!user.needsOnboarding) {
      navigate(user.role === 'superadmin' ? '/superadmin/dashboard' : '/dashboard', { replace: true })
    }
  }, [user, navigate])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validateStep0 = () => {
    const e = {}
    if (!form.business_name.trim()) e.business_name = 'Business name is required.'
    if (!form.phone.trim()) e.phone = 'Phone number is required.'
    else if (!/^09\d{9}$/.test(form.phone.trim())) e.phone = 'Invalid PH number (e.g. 09171234567).'
    return e
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Enter a valid price.'
    if (!form.duration || isNaN(form.duration) || Number(form.duration) <= 0) e.duration = 'Enter a valid duration.'
    return e
  }

  const nextStep = () => {
    if (step === 0) {
      const e = validateStep0()
      if (Object.keys(e).length > 0) { setErrors(e); return }
    }
    if (step === 1) {
      const e = validateStep1()
      if (Object.keys(e).length > 0) { setErrors(e); return }
    }
    setErrors({})
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const slug = form.business_name.trim().toLowerCase()
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const accountCode = 'APF-' + String(Date.now()).slice(-5)

      // Create account
      const { data: account, error: accErr } = await supabase
        .from('accounts')
        .insert({
          account_code: accountCode,
          name: form.business_name.trim(),
          email: user.email,
          phone: form.phone.trim(),
          business_type: 'Pet Sitting',
          slug,
          status: 'waitlisted',
        })
        .select().single()

      if (accErr) throw accErr

      // Create user profile
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          account_id: account.id,
          name: user.name || user.email,
          email: user.email,
          role: 'admin',
        })
      if (userErr) throw userErr

      // Create Pet Sitting service
      await supabase.from('services').insert({
        account_id: account.id,
        name: 'Pet Sitting',
        price: Number(form.price),
        duration: Number(form.duration),
        description: form.desc?.trim() || '',
        pricing_type: form.pricingType,
        max_pets: Number(form.max) || 10,
        mixed_types: true,
      })

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { role: 'admin', account_id: account.id, name: user.name || user.email }
      })

      if (refreshUser) await refreshUser()
      navigate('/profile?setup=1') // redirect to profile setup after onboarding
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Top bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center gap-2.5 mb-4">
            <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '52px' }} />
          </div>
          <h1 className="text-2xl font-extrabold mb-1">Set up your account</h1>
          <p className="text-blue-100 text-sm">Just {steps.length} quick steps and you're ready to go.</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-green-400 text-white' : i === step ? 'bg-white text-blue-600' : 'bg-white/20 text-white/60'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-white/60'}`}>{s}</span>
                {i < steps.length - 1 && <div className="w-6 h-px bg-white/30 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">

          {/* Step 0 — Account Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="font-bold text-gray-800 text-lg">Business Details</h2>
                <p className="text-sm text-gray-400">Tell us about your pet sitting business.</p>
              </div>

              <Field label="Business Name" error={errors.business_name}>
                <input type="text" value={form.business_name}
                  onChange={e => set('business_name', e.target.value)}
                  placeholder="e.g. Juan's Pet Care"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.business_name ? 'border-red-400' : 'border-gray-200'}`} />
              </Field>

              <Field label="Phone Number" error={errors.phone}>
                <input type="text" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="09171234567"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
              </Field>

              <Field label="Service Type">
                <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <PawPrint size={16} className="text-blue-600 shrink-0" />
                <p className="text-xs text-blue-600">Currently available for pet service businesses only.</p>
              </div>
            </div>
          )}

          {/* Step 1 — Service Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="font-bold text-gray-800 text-lg">{form.service_type} Service</h2>
                <p className="text-sm text-gray-400">Set your pricing for clients to see when booking.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (₱)" error={errors.price}>
                  <input type="number" min={1} value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="e.g. 500"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? 'border-red-400' : 'border-gray-200'}`} />
                </Field>
                <Field label="Duration" error={errors.duration}>
                  <div className="flex gap-1.5">
                    <input type="number" min={1} value={form.duration}
                      onChange={e => set('duration', e.target.value)}
                      placeholder="e.g. 1"
                      className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.duration ? 'border-red-400' : 'border-gray-200'}`} />
                    <div className="flex border border-gray-200 rounded-xl overflow-hidden text-xs font-medium shrink-0">
                      <button type="button" onClick={() => set('pricingType', 'per_hour')}
                        className={`px-2 py-3 transition-colors ${form.pricingType === 'per_hour' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>hrs</button>
                      <button type="button" onClick={() => set('pricingType', 'per_day')}
                        className={`px-2 py-3 transition-colors ${form.pricingType === 'per_day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>days</button>
                    </div>
                  </div>
                </Field>
              </div>

              <Field label="Max Pets per Booking">
                <input type="number" min={1} value={form.max}
                  onChange={e => set('max', e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>

              {/* Mixed Pets Toggle */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer"
                onClick={() => set('mixedTypes', !form.mixedTypes)}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow Mixed Pet Types</p>
                  <p className="text-xs text-gray-400">{form.mixedTypes ? 'Cat + Dog allowed in one booking' : 'One pet type only per booking'}</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.mixedTypes ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.mixedTypes ? 'left-6' : 'left-1'}`} />
                </div>
              </div>

              <Field label="Description (optional)">
                <input type="text" value={form.desc}
                  onChange={e => set('desc', e.target.value)}
                  placeholder="e.g. Professional pet sitting in your home"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="font-bold text-gray-800 text-lg">Review & Confirm</h2>
                <p className="text-sm text-gray-400">Everything look good? Let's go!</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Business Name</span>
                  <span className="font-semibold text-gray-800">{form.business_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="font-semibold text-gray-800">{form.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Service Type</span>
                  <span className="font-semibold text-gray-800">Pet Sitting</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <PhilippinePeso size={13} />
                    {Number(form.price).toLocaleString()} / {form.pricingType === 'per_day' ? 'day' : 'hr'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <Clock size={13} />
                    {form.duration} {form.pricingType === 'per_day' ? 'day(s)' : 'hr(s)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Pets</span>
                  <span className="font-semibold text-gray-800">{form.max}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-xs text-yellow-700">
                ⏳ Your account will be reviewed before getting full access. You can still set up your booking page right away!
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={nextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                {loading ? 'Setting up your account...' : '🚀 Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
