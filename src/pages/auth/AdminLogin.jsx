import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import AppLogo from '../../assets/Logo.png'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const alreadyExists = searchParams.get('already') === '1'
  if (user) return <Navigate to={user.needsOnboarding ? '/onboarding' : user.role === 'superadmin' ? '/superadmin/dashboard' : '/dashboard'} replace />
  const handleGoogleLogin = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/onboarding` } })
      if (signInError) throw signInError
    } catch (cause) {
      setError(cause?.message || 'Could not start Google sign-in. Please try again.')
      setBusy(false)
    }
  }
  return (
    <div className="auth-login min-h-screen flex flex-col lg:flex-row">

      <div className="bg-white px-6 py-4 lg:hidden"><img src={AppLogo} alt="Appointeefy" className="h-12 w-auto object-contain" /></div>

      {/* Left Panel (Form) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-white p-12">
        <div className="flex items-center gap-2.5">
          <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '65px' }} />
        </div>
        <div><p className="mb-4 text-xs font-bold uppercase tracking-[.17em] text-blue-600">One workspace for your business</p><p className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-slate-900">Make room for the work you love.</p><p className="mt-5 max-w-md leading-relaxed text-slate-500">Manage appointments, share your business booking page, and keep customer details in one place.</p></div>
        <p className="border-t border-blue-100 pt-5 text-sm text-slate-500">Booking page · Calendar · Customer records</p>
      </div>

      {/* Right Panel (Form) */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-6 sm:p-8">
        <div className="w-full max-w-md py-8">

          {/* Mobile Logo */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-extrabold text-white">Welcome back</h1>
            <p className="text-sm text-blue-100">Sign in to your provider account</p>
          </div>

          {alreadyExists && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-xl px-4 py-3 mb-5">
              This Google account is already registered. Please sign in instead.
            </div>
          )}

          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            onClick={handleGoogleLogin}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 border border-white bg-white hover:bg-blue-50 text-slate-700 font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.09 0-3.86-1.4-4.5-3.29H1.8v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.48 10.52A4.8 4.8 0 0 1 4.23 9c0-.52.09-1.02.25-1.52V5.41H1.8A8 8 0 0 0 .98 9c0 1.29.31 2.51.82 3.59l2.68-2.07z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.18 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1 8 8 0 0 0 1.8 5.41l2.68 2.11c.64-1.9 2.41-3.94 4.5-3.94z"/>
            </svg>
            {busy ? 'Opening Google sign-in…' : 'Continue with Google'}
          </button>

          <p className="mt-4 text-center text-xs text-blue-100">Use the Google account linked to your Appointeefy business.</p>

          <div className="mt-6 border-t border-blue-400 pt-6 text-center">
            <p className="text-sm text-blue-100">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-white hover:underline">
                Create an account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
