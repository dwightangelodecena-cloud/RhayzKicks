import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'

interface AdminContextValue {
  isAdmin: boolean
  checkingSession: boolean
  rejectedReason: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  clearRejection: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

export async function isCallerAdmin() {
  const { data, error } = await supabase.from('staff').select('role, is_active').maybeSingle()
  if (error || !data) return false
  return data.role === 'admin' && data.is_active === true
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [rejectedReason, setRejectedReason] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const syncFromSession = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!session) {
        if (!cancelled) setIsAdmin(false)
        return
      }
      const admin = await isCallerAdmin()
      if (cancelled) return
      if (admin) {
        setIsAdmin(true)
        return
      }
      setIsAdmin(false)
      setRejectedReason('This account is not an active admin.')
      await supabase.auth.signOut()
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await syncFromSession(session)
      if (!cancelled) setCheckingSession(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) return { ok: false, error: 'Incorrect email or password.' }

    const admin = await isCallerAdmin()
    if (!admin) {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account is not an active admin.' }
    }

    setIsAdmin(true)
    return { ok: true }
  }

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/admin' },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const logout = () => {
    supabase.auth.signOut()
    setIsAdmin(false)
  }

  const clearRejection = () => setRejectedReason(null)

  return (
    <AdminContext.Provider value={{ isAdmin, checkingSession, rejectedReason, login, loginWithGoogle, logout, clearRejection }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider')
  return ctx
}
