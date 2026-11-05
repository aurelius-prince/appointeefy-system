import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return null

  // Do not reveal the superadmin area to anyone else.
  if (role === 'superadmin' && user?.role !== 'superadmin') return <Navigate to="/" replace />

  if (!user) return <Navigate to="/login" replace />

  // Only redirect to onboarding if NOT superadmin and hasn't set up account yet
  if (user.needsOnboarding && user.role !== 'superadmin') {
    return <Navigate to="/onboarding" replace />
  }

  if (role && user.role !== role) return <Navigate to="/unauthorized" replace />

  return children
}
