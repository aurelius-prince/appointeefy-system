import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const buildUser = (authUser) => {
  if (!authUser) return null
  const meta = authUser.user_metadata || {}
  const role = meta.role || null
  return {
    id: authUser.id,
    name: meta.name || meta.full_name || authUser.email,
    email: authUser.email,
    role,
    account_id: meta.account_id || null,
    // needsOnboarding only for non-superadmin users without account_id
    needsOnboarding: role !== 'superadmin' && (!role || !meta.account_id),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(buildUser(session?.user ?? null))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(buildUser(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const profile = buildUser(data.user)
    if (!profile.role) throw new Error('User role not set. Contact support.')
    setUser(profile)
    return profile
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const refreshUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) setUser(buildUser(authUser))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
