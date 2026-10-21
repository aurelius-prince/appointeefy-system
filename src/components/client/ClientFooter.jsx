import { Link } from 'react-router-dom'
import AppLogo from '../../assets/Logo.png'

export default function ClientFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img src={AppLogo} alt="Appointeefy" className="object-contain" style={{ height: '52px' }} />
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              The smart appointment scheduling platform for Philippine businesses. Book more, stress less.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="font-semibold text-white text-sm mb-4">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="font-semibold text-white text-sm mb-4">Support</p>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:support@appointeefy.com" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <span>© {new Date().getFullYear()} Appointeefy. All rights reserved.</span>
          <span className="text-gray-600">Made with ❤️ in the Philippines</span>
        </div>
      </div>
    </footer>
  )
}
