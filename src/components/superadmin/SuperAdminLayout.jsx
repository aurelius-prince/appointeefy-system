import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLogo from '../../assets/Logo.png'
import { LayoutDashboard, Users, CreditCard, CheckSquare, BarChart2, HeadphonesIcon, LogOut, Menu, X, Bell, Tag } from 'lucide-react'

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
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = navItems.slice(0, 2).concat(navItems.slice(3, 5))
  const secondary = navItems.filter(item => !primary.some(link => link.to === item.to))
  const selectedIndex = moreOpen ? 4 : Math.max(0, primary.findIndex(item => location.pathname.startsWith(item.to)))
  const moreActive = moreOpen || secondary.some(item => location.pathname.startsWith(item.to))
  const activeIndex = moreActive ? 4 : selectedIndex

  const handleLogout = async () => {
    await logout()
    navigate('/superadmin/login')
  }

  return (
    <div className="superadmin-shell flex min-h-dvh bg-slate-50 text-slate-800">
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <div className="min-w-0">
            <img src={AppLogo} alt="Appointeefy" className="h-10 max-w-40 object-contain object-left" />
            <p className="pl-1 text-[11px] font-medium tracking-wide text-slate-500">SUPER ADMIN</p>
          </div>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
        </div>
        <nav aria-label="Super Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
              <Icon size={18} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"><LogOut size={18} />Sign out</button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="superadmin-mobile-logo rounded-lg p-1.5 hover:bg-slate-100 lg:invisible"><img src={AppLogo} alt="Open navigation" className="h-8 w-8 object-contain" /></button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{user?.name?.[0]?.toUpperCase() || 'S'}</div>
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.name || 'Super Admin'}</p><p className="text-xs text-slate-500">Administrator</p></div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-9"><div className="mx-auto max-w-7xl"><Outlet /></div></main>
      </div>
      <nav aria-label="Super Admin mobile navigation" className="super-mobile-nav lg:hidden" style={{ '--super-nav-left': `${activeIndex * 20}%` }}>
        <span className="super-mobile-indicator" aria-hidden="true" />
        {primary.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={`super-mobile-item ${location.pathname.startsWith(to) && !moreOpen ? 'is-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}
        <button onClick={() => setMoreOpen(previous => !previous)} className={`super-mobile-item ${moreActive ? 'is-active' : ''}`} aria-expanded={moreOpen} aria-label="More pages"><Menu size={20} /><span>More</span></button>
      </nav>
      {moreOpen && <div className="super-more-backdrop lg:hidden" onClick={() => setMoreOpen(false)}><div className="super-more-sheet" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between px-5 py-4"><h2 className="font-semibold text-slate-900">More pages</h2><button aria-label="Close more pages" onClick={() => setMoreOpen(false)}><X size={19} /></button></div><div className="grid grid-cols-2 gap-2 px-4 pb-5">{secondary.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700"><Icon size={18} />{label}</NavLink>)}</div></div></div>}
    </div>
  )
}
