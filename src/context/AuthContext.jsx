import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const buildUser = (authUser, profile = null) => {
  if (!authUser) return null
  const meta = authUser.user_metadata || {}
  const role = profile?.role || meta.role || null
  const accountId = profile?.account_id || meta.account_id || null
  return {
    id: authUser.id,
    name: profile?.name || meta.name || meta.full_name || authUser.email,
    email: authUser.email,
    role,
    account_id: accountId,
    // needsOnboarding only for non-superadmin users without account_id
    needsOnboarding: role !== 'superadmin' && (!role || !accountId),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const hydrateUser = async (authUser) => {
    if (!authUser) return null
    const { data: profile } = await supabase
      .from('users')
      .select('account_id, role, name')
      .eq('email', authUser.email)
      .maybeSingle()
    return buildUser(authUser, profile)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(await hydrateUser(session?.user ?? null))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null
      setUser(buildUser(authUser))
      // Run the profile lookup after the auth callback returns; Supabase warns
      // against awaiting another Supabase request inside this callback.
      Promise.resolve().then(async () => setUser(await hydrateUser(authUser)))
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const profile = await hydrateUser(data.user)
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
    setUser(await hydrateUser(authUser))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
