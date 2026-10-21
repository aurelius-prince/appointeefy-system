import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function SuperAdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form)
      if (user.role === 'superadmin') navigate('/superadmin/dashboard')
      else setError('Access denied. Super Admin only.')
    } catch (err) {
      setError(err.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">Super Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Appointeefy Control Panel</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="superadmin@appointeefy.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 pr-11"
                placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 mt-2">
            {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Provider?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  )
}
