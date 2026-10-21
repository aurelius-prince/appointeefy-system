import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) {
    // Redirect to correct login page based on role required
    if (role === 'superadmin') return <Navigate to="/superadmin/login" replace />
    return <Navigate to="/login" replace />
  }

  // Only redirect to onboarding if NOT superadmin and hasn't set up account yet
  if (user.needsOnboarding && user.role !== 'superadmin') {
    return <Navigate to="/onboarding" replace />
  }

  if (role && user.role !== role) return <Navigate to="/unauthorized" replace />

  return children
}
