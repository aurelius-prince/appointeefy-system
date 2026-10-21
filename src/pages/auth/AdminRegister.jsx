import { Link } from 'react-router-dom'
import AppLogo from '../../assets/Logo.png'
import { supabase } from '../../lib/supabase'

const handleGoogleRegister = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/onboarding`
    }
  })
}

export default function AdminRegister() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <img src={AppLogo} alt="Appointeefy" className="object-contain mx-auto mb-4" style={{ height: '65px' }} />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Get Started Free</h1>
          <p className="text-gray-500 text-sm">Create your Appointeefy provider account</p>
        </div>

        {/* Trial badge */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-center">
          <p className="text-sm font-semibold text-blue-700">🎉 30-Day Free Trial</p>
          <p className="text-xs text-blue-500 mt-0.5">Full access · No credit card required</p>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleRegister}
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

        <p className="text-xs text-gray-400 text-center mt-4">
          By signing up, you agree to our{' '}
          <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
