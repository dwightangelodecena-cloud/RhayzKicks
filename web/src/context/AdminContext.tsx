import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import type { StaffRole } from '../types/database.types'

interface AdminContextValue {
  isAdmin: boolean
  isStaff: boolean
  role: StaffRole | null
  checkingSession: boolean
  rejectedReason: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: StaffRole }>
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  clearRejection: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

// Any active staff row (role 'staff' or 'admin') counts as staff — used to
// gate the whole /admin/dashboard shell. isAdmin (below) narrows further for
// admin-only tabs/actions.
async function getCallerStaffInfo(): Promise<{ role: StaffRole } | null> {
  const { data, error } = await supabase.from('staff').select('role, is_active').maybeSingle()
  if (error || !data || data.is_active !== true) return null
  return { role: data.role as StaffRole }
}

export async function isCallerAdmin() {
  const info = await getCallerStaffInfo()
  return info?.role === 'admin'
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<StaffRole | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [rejectedReason, setRejectedReason] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const syncFromSession = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!session) {
        if (!cancelled) setRole(null)
        return
      }
      const info = await getCallerStaffInfo()
      if (cancelled) return
      if (info) {
        setRole(info.role)
        return
      }
      setRole(null)
      // Not staff isn't an error for 99% of sessions — this fires for every
      // regular shopper too, since AdminProvider wraps the whole app, not
      // just /admin routes. Only reject + sign out when we're actually on an
      // admin route (the OAuth "Continue with Google" login redirects back
      // to /admin, landing here instead of the login() function below) —
      // otherwise this was silently signing every customer back out the
      // moment their session loaded or refreshed.
      if (window.location.pathname.startsWith('/admin')) {
        setRejectedReason('This account is not an active staff member.')
        await supabase.auth.signOut()
      }
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

    const info = await getCallerStaffInfo()
    if (!info) {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account is not an active staff member.' }
    }

    setRole(info.role)
    return { ok: true, role: info.role }
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
    setRole(null)
  }

  const clearRejection = () => setRejectedReason(null)

  return (
    <AdminContext.Provider
      value={{
        isAdmin: role === 'admin',
        isStaff: role !== null,
        role,
        checkingSession,
        rejectedReason,
        login,
        loginWithGoogle,
        logout,
        clearRejection,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider')
  return ctx
}
