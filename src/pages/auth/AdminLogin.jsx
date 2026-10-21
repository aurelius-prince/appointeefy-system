import { Link, useSearchParams } from 'react-router-dom'
import AppLogo from '../../assets/Logo.png'
import { supabase } from '../../lib/supabase'

const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/onboarding`
    }
  })
}

export default function AdminLogin() {
  const [searchParams] = useSearchParams()
  const alreadyExists = searchParams.get('already') === '1'
  return (
    <div className="min-h-screen flex">

      {/* Left Panel (Form) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-50 p-12">
        <div className="flex items-center gap-2.5">
          <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '65px' }} />
        </div>
        <div>
          <p className="text-3xl font-bold leading-snug mb-6 text-gray-800">
            "The easiest way to manage appointments and grow your business."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-700">M</div>
            <div>
              <p className="font-semibold text-sm text-gray-800">Maria Santos</p>
              <p className="text-gray-500 text-xs">Fur & Paws Grooming</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '500+', label: 'Businesses' },
            { value: '50k+', label: 'Appointments' },
            { value: '99.9%', label: 'Uptime' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-800">{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '52px' }} />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-white mb-1">Welcome back</h1>
            <p className="text-blue-200 text-sm">Sign in to your provider account</p>
          </div>

          {alreadyExists && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-xl px-4 py-3 mb-5">
              ⚠️ This Google account is already registered. Please sign in instead.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl text-sm transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.09 0-3.86-1.4-4.5-3.29H1.8v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.48 10.52A4.8 4.8 0 0 1 4.23 9c0-.52.09-1.02.25-1.52V5.41H1.8A8 8 0 0 0 .98 9c0 1.29.31 2.51.82 3.59l2.68-2.07z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.18 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1 8 8 0 0 0 1.8 5.41l2.68 2.11c.64-1.9 2.41-3.94 4.5-3.94z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-blue-200 text-center mt-4">
            By signing in, you agree to our{' '}
            <a href="#" className="underline hover:text-white">Terms</a> and{' '}
            <a href="#" className="underline hover:text-white">Privacy Policy</a>.
          </p>

          <div className="mt-6 pt-6 border-t border-blue-500 text-center">
            <p className="text-sm text-blue-200">
              Don't have an account?{' '}
              <Link to="/register" className="text-white font-semibold hover:underline">
                Start free trial
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
