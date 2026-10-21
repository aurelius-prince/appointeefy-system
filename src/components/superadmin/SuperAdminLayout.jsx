import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, CreditCard, CheckSquare,
  BarChart2, HeadphonesIcon, LogOut, ShieldCheck, Menu, X, Bell, Tag
} from 'lucide-react'

const navItems = [
  { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/superadmin/accounts', icon: Users, label: 'Accounts' },
  { to: '/superadmin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/superadmin/payments', icon: CheckSquare, label: 'Payments' },
  { to: '/superadmin/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/superadmin/discounts', icon: Tag, label: 'Discounts' },
  { to: '/superadmin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/superadmin/support', icon: HeadphonesIcon, label: 'Support' },
]

export default function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 flex flex-col transition-all duration-300`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700">
          <ShieldCheck size={24} className="text-yellow-400 shrink-0" />
          {sidebarOpen && <span className="font-bold text-white truncate">Calendaryo</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
