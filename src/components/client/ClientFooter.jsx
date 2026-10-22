import { Link } from 'react-router-dom'
import AppLogo from '../../assets/Logo.png'

export default function ClientFooter() {
  return (
    <footer className="border-t border-blue-100 bg-[#f4f8ff] text-slate-500">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '52px' }} />
            </div>
            <p className="text-sm leading-relaxed max-w-xs">A clear, welcoming space for Pet Sitting bookings and business management.</p>
          </div>

          {/* Product */}
          <div>
            <p className="font-semibold text-slate-800 text-sm mb-4">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-blue-600 transition-colors">Features</a></li>
              <li><a href="/#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-blue-600 transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="font-semibold text-slate-800 text-sm mb-4">Support</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Sign in for support</Link></li>
              <li><Link to="/register" className="hover:text-blue-600 transition-colors">Create account</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <span>© {new Date().getFullYear()} Appointeefy. All rights reserved.</span>
          <span className="text-slate-400">Built for growing service businesses</span>
        </div>
      </div>
    </footer>
  )
}
