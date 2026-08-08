import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { isCallerAdmin } from './AdminContext'
import type { Customer } from '../types/database.types'

interface AuthContextValue {
  user: User | null
  customer: Customer | null
  isAuthenticated: boolean
  checkingSession: boolean
  refreshCustomer: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    authUserId: (row.auth_user_id as string | null) ?? null,
    fullName: (row.full_name as string) ?? '',
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? '',
    street: (row.street as string) ?? '',
    city: (row.city as string) ?? '',
    province: (row.province as string) ?? '',
    zipCode: (row.zip_code as string) ?? '',
    loyaltyPoints: (row.loyalty_points as number) ?? 0,
    totalPurchases: (row.total_purchases as number) ?? 0,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// A shopper who signs up doesn't automatically get a `customers` row (no DB
// trigger for it) — this finds their row by auth_user_id, or creates one on
// the spot the first time they're seen as a signed-in shopper. Relies on the
// customers_select_self/customers_insert_self RLS policies (policies.sql).
async function ensureCustomerRow(user: User): Promise<Customer | null> {
  const { data: existing, error: selectError } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (selectError) return null
  if (existing) return toCustomer(existing)

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const { data: created, error: insertError } = await supabase
    .from('customers')
    .insert({ auth_user_id: user.id, email: user.email ?? '', full_name: fullName })
    .select()
    .single()
  if (insertError || !created) return null
  return toCustomer(created)
}

// Admin and shopper accounts share the same Supabase Auth session — the
// `staff` table is what distinguishes them. A staff session should not also
// count as a signed-in shopper, so we exclude it here.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isShopper, setIsShopper] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    const syncFromSession = async (session: import('@supabase/supabase-js').Session | null) => {
      if (!session) {
        if (!cancelled) {
          setUser(null)
          setCustomer(null)
          setIsShopper(false)
        }
        return
      }
      const staff = await isCallerAdmin()
      if (cancelled) return
      setUser(session.user)
      setIsShopper(!staff)
      if (staff) {
        setCustomer(null)
        return
      }
      const row = await ensureCustomerRow(session.user)
      if (!cancelled) setCustomer(row)
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

  const refreshCustomer = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from('customers').select('*').eq('auth_user_id', user.id).maybeSingle()
    if (!error && data) setCustomer(toCustomer(data))
  }, [user])

  return (
    <AuthContext.Provider value={{ user, customer, isAuthenticated: isShopper, checkingSession, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
