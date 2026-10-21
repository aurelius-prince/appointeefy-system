import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogIn, Menu, X } from 'lucide-react'
import AppLogo from '../../assets/Logo.png'

export default function ClientNavbar() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/#how-it-works', label: 'How It Works' },
    { to: '/#pricing', label: 'Pricing' },
  ]

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '65px' }} />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(({ to, label }) => (
            <a
              key={to}
              href={to}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-2">
            Sign In
          </Link>
          <Link to="/register"
            className="flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            Get Started Free
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {links.map(({ to, label }) => (
            <a key={to} href={to} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-blue-600 py-2">
              {label}
            </a>
          ))}
          <hr className="border-gray-100" />
          <Link to="/login" onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-gray-600 py-2">
            Sign In
          </Link>
          <Link to="/register" onClick={() => setMenuOpen(false)}
            className="block text-center text-sm font-bold px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  )
}
