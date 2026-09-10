import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import type { StaffRole } from '../types/database.types'

interface AdminContextValue {
  isAdmin: boolean
  isStaff: boolean
  role: StaffRole | null
  checkingSession: boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

// Any active staff row (role 'staff' or 'admin') counts as staff — used to
// gate the whole /admin/dashboard shell. isAdmin (below) narrows further for
// admin-only tabs/actions.
//
// Must filter to the caller's own row explicitly — the staff_select RLS
// policy (`using (is_active_staff())`) is a table-wide gate ("can this user
// see staff rows at all"), not a per-row filter, since the roster page needs
// every active staff member to see everyone else's row too. Without the
// .eq('id', ...) filter, this query returns every staff row once there's
// more than one, and .maybeSingle() throws on "multiple rows returned" —
// which silently worked while there was only one staff member and broke the
// moment a second one was added.
async function getCallerStaffInfo(): Promise<{ role: StaffRole } | null> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null
  const { data, error } = await supabase.from('staff').select('role, is_active').eq('id', userId).maybeSingle()
  if (error || !data || data.is_active !== true) return null
  return { role: data.role as StaffRole }
}

export async function isCallerAdmin() {
  const info = await getCallerStaffInfo()
  return info?.role === 'admin'
}

// Any active staff row (admin or staff role) — used to route a sign-in on
// the regular customer form straight to the admin dashboard, the same way
// isCallerAdmin() does for the admin-only case.
export async function isCallerStaff() {
  const info = await getCallerStaffInfo()
  return info !== null
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<StaffRole | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Admin/staff sign in through the same form and session as everyone
    // else (AuthPage.tsx) — this just reflects whatever staff role (if any)
    // the current session's user has. A signed-in customer with no staff row
    // simply gets role: null here; RequireStaff (App.tsx) is what keeps them
    // out of /admin/dashboard, not this listener.
    const syncFromSession = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!session) {
        if (!cancelled) setRole(null)
        return
      }
      const info = await getCallerStaffInfo()
      if (!cancelled) setRole(info?.role ?? null)
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

  const logout = () => {
    supabase.auth.signOut()
    setRole(null)
  }

  return (
    <AdminContext.Provider
      value={{
        isAdmin: role === 'admin',
        isStaff: role !== null,
        role,
        checkingSession,
        logout,
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
