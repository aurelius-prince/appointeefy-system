import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, CalendarDays,
  Users, Settings, LogOut, CalendarCheck, Menu, ChevronLeft, X, Bell, Megaphone, MessageSquare, ScrollText, Globe, CreditCard, BarChart2, Lock, AlertCircle
} from 'lucide-react'
import AppLogo from '../../assets/Logo.png'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    lockedOn: [] },
  { to: '/booking-page', icon: Globe,           label: 'Booking Page', lockedOn: [] },
  { to: '/appointments', icon: CalendarDays,    label: 'Appointments', lockedOn: ['waitlisted', 'expired', 'suspended'] },
  { to: '/customers',    icon: Users,           label: 'Customers',    lockedOn: ['waitlisted', 'expired', 'suspended'] },
  { to: '/analytics',    icon: BarChart2,       label: 'Analytics',    lockedOn: ['waitlisted', 'expired', 'suspended'] },
  { to: '/logs',         icon: ScrollText,      label: 'Logs',         lockedOn: ['waitlisted', 'expired', 'suspended'] },
  { to: '/profile',      icon: Settings,        label: 'Profile',      lockedOn: [] },
]

const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNotifs, setShowNotifs] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [accountStatus, setAccountStatus] = useState(null)
  const [accountLogo, setAccountLogo] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem(`appointeefy-theme-${user?.account_id}`) || 'ocean')
  const mainRef = useRef(null)
  const mobileNavRef = useRef(null)
  const mobileTrailRef = useRef(null)
  const mobileBallRef = useRef(null)
  const previousMobileIndex = useRef(null)

  useEffect(() => {
    const onThemeChange = (event) => setTheme(event.detail || 'ocean')
    window.addEventListener('appointeefy-theme-change', onThemeChange)
    return () => window.removeEventListener('appointeefy-theme-change', onThemeChange)
  }, [])

  useEffect(() => {
    if (user?.account_id) setTheme(localStorage.getItem(`appointeefy-theme-${user.account_id}`) || 'ocean')
  }, [user?.account_id])

  const isLocked = ['waitlisted', 'expired', 'suspended'].includes(accountStatus)
  const isPending = accountStatus === 'waitlisted'

  const accountId = user?.account_id
  const { getForAccount, getUnreadCount, markAsRead } = useNotifications()
  const notifs = accountId ? getForAccount(accountId) : []
  const unreadCount = accountId ? getUnreadCount(accountId) : 0

  // Fetch account status from Supabase
  useEffect(() => {
    if (!accountId) return
    const fetchStatus = () => {
      supabase
        .from('accounts')
        .select('status, trial_ends, subscribed_until, logo_url')
        .eq('id', accountId)
        .single()
        .then(({ data }) => {
          if (data) { setAccountStatus(data.status); setAccountLogo(data.logo_url || null) }
        })
    }
    fetchStatus()

    // Re-fetch every 30 seconds to catch approval changes
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [accountId])

  // Redirect if trying to access locked page while pending
  useEffect(() => {
    if (!isLocked) return
    const lockedPaths = ['/appointments', '/customers', '/analytics', '/logs']
    if (lockedPaths.some(p => location.pathname.startsWith(p))) {
      navigate('/dashboard', { replace: true })
    }
  }, [isLocked, location.pathname])

  const subBadge = (accountStatus === 'monthly' || accountStatus === 'annual')
    ? { label: accountStatus === 'monthly' ? 'Monthly' : 'Annual', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    : accountStatus === 'trial'
    ? { label: 'Trial',     cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' }
    : accountStatus === 'waitlisted'
    ? { label: 'Waitlisted', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' }
    : accountStatus === 'expired'
    ? { label: 'Expired',   cls: 'bg-red-100 text-red-600',       dot: 'bg-red-500' }
    : accountStatus === 'suspended'
    ? { label: 'Suspended', cls: 'bg-red-100 text-red-600',       dot: 'bg-red-500' }
    : { label: '...',       cls: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    setMobileMoreOpen(false)
    setShowNotifs(false)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  const mobilePrimary = navItems.filter(item => ['/dashboard', '/booking-page', '/appointments', '/analytics'].includes(item.to))
  const mobileSecondary = navItems.filter(item => !mobilePrimary.some(primary => primary.to === item.to))
  const mobileMoreActive = mobileMoreOpen || mobileSecondary.some(item => location.pathname.startsWith(item.to)) || location.pathname === '/subscription'
  const mobileSelectedIndex = mobileMoreActive ? 4 : Math.max(0, mobilePrimary.findIndex(item => location.pathname.startsWith(item.to)))
  const MobileSelectedIcon = mobileSelectedIndex === 4 ? Menu : mobilePrimary[mobileSelectedIndex].icon
  const mobileNavPositions = ['calc(10% + 8px)', 'calc(30% + 4px)', '50%', 'calc(70% - 4px)', 'calc(90% - 8px)']

  useEffect(() => {
    const previous = previousMobileIndex.current
    previousMobileIndex.current = mobileSelectedIndex
    if (previous === null || previous === mobileSelectedIndex || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = mobileNavRef.current
    const trail = mobileTrailRef.current
    const ball = mobileBallRef.current
    if (!nav || !trail || !ball || !nav.clientWidth) return
    const sidePadding = 10
    const step = (nav.clientWidth - sidePadding * 2) / 5
    const start = sidePadding + previous * step + step / 2
    const end = sidePadding + mobileSelectedIndex * step + step / 2
    trail.animate([
      { left: `${start - 8}px`, width: '16px', opacity: 1, offset: 0 },
      { left: `${Math.min(start, end) - 8}px`, width: `${Math.abs(end - start) + 16}px`, opacity: 1, offset: .38 },
      { left: `${end - 8}px`, width: '16px', opacity: 1, offset: .8 },
      { left: `${end - 8}px`, width: '16px', opacity: 0, offset: 1 },
    ], { duration: 720, easing: 'ease-in-out' })
    ball.animate([
      { transform: 'scale(.8)' }, { transform: 'scale(1.02,.66)', offset: .3 },
      { transform: 'scale(.74,.9)', offset: .7 }, { transform: 'scale(.8)' },
    ], { duration: 720 })
  }, [mobileSelectedIndex])

  return (
    <div className={`admin-shell admin-theme-${theme} ${sidebarOpen ? 'admin-sidebar-open' : 'admin-sidebar-closed'} flex h-screen bg-gray-100`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-md flex flex-col transition-all duration-300 shrink-0 relative`}>
        {/* Toggle button — centered on sidebar right edge */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-md"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
        </button>
        <div className="flex items-center justify-center px-4 py-4 bg-white">
          <img src={AppLogo} alt="Appointeefy" className="object-contain shrink-0" style={{ height: '64px' }} />

        </div>
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, lockedOn }, index) => {
            const isLocked = lockedOn.includes(accountStatus)
            return isLocked ? (
              <div key={to}>
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 cursor-not-allowed select-none"
                  title="Locked — pending approval"
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{label}</span>
                      <Lock size={12} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              </div>
            )
          })}
        </nav>

        {/* Bottom: Subscription + Logout */}
        <div className="p-3 border-t space-y-1">
          <NavLink
            to="/subscription"
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <CreditCard size={18} className="shrink-0" />
            {sidebarOpen ? (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span>Subscription</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${subBadge.cls}`}>
                  {subBadge.label}
                </span>
              </div>
            ) : (
              <span className={`absolute top-1.5 left-7 w-2 h-2 rounded-full ${subBadge.dot}`} />
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="admin-topbar bg-white shadow-sm px-6 py-3 flex items-center justify-end">
          <div className="mobile-brand"><img src={AppLogo} alt="Appointeefy" /></div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="admin-notifications absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-800 text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => notifs.forEach((n) => markAsRead(n.id, accountId))}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifs.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
                    )}
                    {notifs.map((n) => {
                      const isUnread = !n.readBy.includes(accountId)
                      return (
                        <div
                          key={n.id}
                          onClick={() => { markAsRead(n.id, accountId); setSelectedNotif(n); setShowNotifs(false) }}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.type === 'announcement' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                            {n.type === 'announcement' ? <Megaphone size={14} /> : <MessageSquare size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-medium truncate ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                              {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            {n.image && (
                              <img src={n.image} alt="attachment" className="mt-1.5 rounded-lg w-full max-h-24 object-cover border border-gray-100" />
                            )}
                            <p className="text-xs text-gray-400 mt-1">{fmtDate(n.sentAt)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
              {accountLogo ? <img src={accountLogo} alt="Profile" className="w-full h-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            <div className="mobile-account-actions items-center gap-1">
              <NavLink to="/subscription" className={`text-xs font-semibold px-2 py-1 rounded-full ${subBadge.cls}`}>
                {subBadge.label}
              </NavLink>
              <button onClick={handleLogout} aria-label="Logout" className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main ref={mainRef} className="admin-main flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Pending Banner */}
          {isPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <AlertCircle size={18} className="text-yellow-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">⏳ Account Pending Approval</p>
                <p className="text-xs text-yellow-600 mt-0.5">Your account is under review. You can set up your booking page while waiting. Once approved, you'll get 30-day full trial access.</p>
              </div>
            </div>
          )}
          {accountStatus === 'expired' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">⚠️ Subscription Expired</p>
                <p className="text-xs text-red-600 mt-0.5">Your subscription has ended. Please renew to regain full access.</p>
              </div>
            </div>
          )}
          {accountStatus === 'suspended' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">🚫 Account Suspended</p>
                <p className="text-xs text-red-600 mt-0.5">Your account has been suspended. Please contact support for assistance.</p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <nav ref={mobileNavRef} className="mobile-bottom-nav" aria-label="Main navigation" style={{ '--mobile-left': mobileNavPositions[mobileSelectedIndex] }}>
        <svg className="mobile-nav-filter" aria-hidden="true"><defs><filter id="mobile-nav-goo" x="-10%" y="-120%" width="120%" height="340%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="7" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0 0  0 0 0 22 -10" /></filter><filter id="mobile-nav-trail-filter" x="-20%" y="-100%" width="140%" height="300%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="4" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 0 18 -7" /></filter></defs></svg>
        <div className="mobile-nav-shadow" aria-hidden="true" />
        <div className="mobile-nav-goo" aria-hidden="true"><div className="mobile-nav-bar" /><div className="mobile-nav-blob" /><div className="mobile-nav-blob mobile-nav-blob-delayed" /></div>
        <div className="mobile-nav-trail-wrap" aria-hidden="true"><div ref={mobileTrailRef} className="mobile-nav-trail" /></div>
        <div ref={mobileBallRef} className="mobile-nav-ball" aria-hidden="true"><svg className="mobile-nav-paw" viewBox="0 0 60 58"><ellipse cx="10" cy="24" rx="5.5" ry="7" transform="rotate(-25 10 24)" /><ellipse cx="22" cy="11" rx="6" ry="8" transform="rotate(-10 22 11)" /><ellipse cx="38" cy="11" rx="6" ry="8" transform="rotate(10 38 11)" /><ellipse cx="50" cy="24" rx="5.5" ry="7" transform="rotate(25 50 24)" /><path d="M30 26C20 26 12 36 12 44c0 7 5 10 10 10 4 0 5-2 8-2s4 2 8 2c5 0 10-3 10-10 0-8-8-18-18-18z" /></svg><MobileSelectedIcon className="mobile-nav-ball-icon" size={22} /></div>
        <div className="mobile-nav-items">
          {mobilePrimary.map(({ to, icon: Icon, label, lockedOn }, index) => {
            const locked = lockedOn.includes(accountStatus)
            const mobileLabel = label === 'Booking Page' ? 'Booking' : label
            return locked ? <span key={to} className="mobile-nav-item mobile-nav-locked"><Icon size={22} /><span>{mobileLabel}</span></span> :
              <NavLink key={to} to={to} className={`mobile-nav-item ${mobileSelectedIndex === index ? 'mobile-nav-active' : ''}`}><Icon size={22} /><span>{mobileLabel}</span></NavLink>
          })}
          <button type="button" className={`mobile-nav-item ${mobileSelectedIndex === 4 ? 'mobile-nav-active' : ''}`} aria-expanded={mobileMoreOpen} aria-controls="mobile-more-menu" onClick={() => setMobileMoreOpen(open => !open)}><Menu size={22} /><span>More</span></button>
        </div>
      </nav>

      {mobileMoreOpen && <div className="mobile-more-backdrop" onClick={() => setMobileMoreOpen(false)}>
        <div id="mobile-more-menu" className="mobile-more-sheet" onClick={event => event.stopPropagation()}>
          <div className="mobile-more-heading"><strong>More pages</strong><button type="button" aria-label="Close menu" onClick={() => setMobileMoreOpen(false)}><X size={20} /></button></div>
          <div className="mobile-more-grid">
            {mobileSecondary.map(({ to, icon: Icon, label, lockedOn }) => lockedOn.includes(accountStatus) ? <span key={to} className="mobile-more-link mobile-more-locked"><Icon size={19} />{label}<Lock size={14} /></span> : <NavLink key={to} to={to} className="mobile-more-link theme-hover-action" onClick={() => setMobileMoreOpen(false)}><Icon size={19} />{label}</NavLink>)}
            <NavLink to="/subscription" className="mobile-more-link theme-hover-action" onClick={() => setMobileMoreOpen(false)}><CreditCard size={19} />Subscription<span className={`mobile-more-badge ${subBadge.cls}`}>{subBadge.label}</span></NavLink>
          </div>
        </div>
      </div>}

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNotif(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedNotif.type === 'announcement' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedNotif.type === 'announcement' ? <Megaphone size={16} /> : <MessageSquare size={16} />}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedNotif.title}</p>
                  <p className="text-xs text-gray-400">{fmtDate(selectedNotif.sentAt)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">{selectedNotif.message}</p>
              {selectedNotif.image && (
                <img src={selectedNotif.image} alt="attachment" className="rounded-xl w-full object-cover border border-gray-100" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
