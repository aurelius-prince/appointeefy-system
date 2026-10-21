import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

// Auth
import AdminLogin from '../pages/auth/AdminLogin'
import AdminRegister from '../pages/auth/AdminRegister'
import ForgotPassword from '../pages/auth/ForgotPassword'
import Onboarding from '../pages/auth/Onboarding'
import SuperAdminLogin from '../pages/auth/SuperAdminLogin'

// Client (Public)
import ClientLayout from '../components/client/ClientLayout'
import ClientHome from '../pages/client/ClientHome'
import ClientBook from '../pages/client/ClientBook'
import ClientTrack from '../pages/client/ClientTrack'

// Provider
import AdminLayout from '../components/admin/AdminLayout'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminAppointments from '../pages/admin/AdminAppointments'
import AdminCustomers from '../pages/admin/AdminCustomers'
import AdminProfile from '../pages/admin/AdminProfile'
import AdminSubscription from '../pages/admin/AdminSubscription'
import AdminAnalytics from '../pages/admin/AdminAnalytics'
import AdminLogs from '../pages/admin/AdminLogs'
import AdminBookingPage from '../pages/admin/AdminBookingPage'
import AdminServices from '../pages/admin/AdminServices'

// Super Admin
import SuperAdminLayout from '../components/superadmin/SuperAdminLayout'
import SuperDashboard from '../pages/superadmin/SuperDashboard'
import SuperAccounts from '../pages/superadmin/SuperAccounts'
import SuperSubscriptions from '../pages/superadmin/SuperSubscriptions'
import SuperPayments from '../pages/superadmin/SuperPayments'
import SuperAnalytics from '../pages/superadmin/SuperAnalytics'
import SuperDiscounts from '../pages/superadmin/SuperDiscounts'
import SuperSupport from '../pages/superadmin/SuperSupport'
import SuperNotifications from '../pages/superadmin/SuperNotifications'
import { NotificationProvider } from '../context/NotificationContext'
import { SuperAdminProvider } from '../context/SuperAdminContext'
import { AppointmentProvider } from '../context/AppointmentContext'
import { ServiceProvider } from '../context/ServiceContext'
import { BookingProvider } from '../context/BookingContext'

import BookingPage from '../pages/public/BookingPage'
import Unauthorized from '../pages/Unauthorized'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <SuperAdminProvider>
      <NotificationProvider>
      <AuthProvider>
        <Routes>
          {/* Public Booking Page */}
          <Route path="/book/:slug" element={<BookingPage />} />

          {/* Public Client Routes */}
          <Route path="/" element={<ClientLayout />}>
            <Route index element={<ClientHome />} />
            <Route path="book" element={<ClientBook />} />
            <Route path="track" element={<ClientTrack />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login"          element={<AdminLogin />} />
          <Route path="/register"       element={<AdminRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding"     element={<Onboarding />} />
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />

          {/* Legacy redirects */}
          <Route path="/admin/login"        element={<Navigate to="/login" replace />} />
          <Route path="/admin/register"     element={<Navigate to="/register" replace />} />
          <Route path="/login"     element={<Navigate to="/login" replace />} />
          <Route path="/register"  element={<Navigate to="/register" replace />} />
          <Route path="/admin/dashboard"    element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/appointments" element={<Navigate to="/appointments" replace />} />
          <Route path="/admin/*"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/provider/*"         element={<Navigate to="/dashboard" replace />} />

          {/* Provider Routes */}
          <Route element={
            <ProtectedRoute role="admin">
              <ServiceProvider><BookingProvider><AppointmentProvider>
                <AdminLayout />
              </AppointmentProvider></BookingProvider></ServiceProvider>
            </ProtectedRoute>
          }>
            <Route path="/dashboard"    element={<AdminDashboard />} />
            <Route path="/booking-page" element={<AdminBookingPage />} />
            <Route path="/services"     element={<Navigate to="/profile" replace />} />
            <Route path="/appointments" element={<AdminAppointments />} />
            <Route path="/customers"    element={<AdminCustomers />} />
            <Route path="/analytics"    element={<AdminAnalytics />} />
            <Route path="/logs"         element={<AdminLogs />} />
            <Route path="/subscription" element={<AdminSubscription />} />
            <Route path="/profile"      element={<AdminProfile />} />
          </Route>

          {/* Super Admin Routes */}
          <Route path="/superadmin" element={<ProtectedRoute role="superadmin"><SuperAdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<SuperDashboard />} />
            <Route path="accounts"      element={<SuperAccounts />} />
            <Route path="subscriptions" element={<SuperSubscriptions />} />
            <Route path="payments"      element={<SuperPayments />} />
            <Route path="analytics"     element={<SuperAnalytics />} />
            <Route path="discounts"     element={<SuperDiscounts />} />
            <Route path="notifications" element={<SuperNotifications />} />
            <Route path="support"       element={<SuperSupport />} />
          </Route>

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </NotificationProvider>
      </SuperAdminProvider>
    </BrowserRouter>
  )
}
