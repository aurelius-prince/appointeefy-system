import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import AppLogo from '../../assets/Logo.png'
import { supabase } from '../../lib/supabase'

const STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  PASSWORD: 'password',
  SUCCESS: 'success',
}

export default function ForgotPassword() {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false }
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep(STEPS.OTP)
  }

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    // Auto-focus next
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  // Step 2 — Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length < 6) { setError('Please enter the complete 6-digit code.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (err) { setError('Invalid or expired code. Please try again.'); return }
    setStep(STEPS.PASSWORD)
  }

  // Step 3 — Set new password
  const handleSetPassword = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep(STEPS.SUCCESS)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '52px' }} />
        </div>

        {/* Step 1 — Email */}
        {step === STEPS.EMAIL && (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Mail size={22} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Forgot Password</h1>
              <p className="text-gray-500 text-sm">Enter your email and we'll send a 6-digit code to reset your password.</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
                {loading ? 'Sending code...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === STEPS.OTP && (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <KeyRound size={22} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Enter Code</h1>
              <p className="text-gray-500 text-sm">We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span></p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* OTP Inputs */}
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: digit ? '#2563eb' : '#e5e7eb' }}
                  />
                ))}
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Didn't receive it?{' '}
                <button type="button" onClick={() => { setStep(STEPS.EMAIL); setOtp(['','','','','','']); setError('') }}
                  className="text-blue-600 font-medium hover:underline">
                  Try again
                </button>
              </p>
            </form>
          </>
        )}

        {/* Step 3 — New Password */}
        {step === STEPS.PASSWORD && (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <KeyRound size={22} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">New Password</h1>
              <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'} required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          </>
        )}

        {/* Step 4 — Success */}
        {step === STEPS.SUCCESS && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Password Updated!</h1>
            <p className="text-gray-500 text-sm mb-8">Your password has been successfully changed. You can now sign in with your new password.</p>
            <Link to="/login"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors text-center">
              Back to Sign In
            </Link>
          </div>
        )}

        {/* Back link */}
        {step !== STEPS.SUCCESS && (
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
