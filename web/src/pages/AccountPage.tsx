import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface OrderRow {
  id: string
  orderNumber: string
  date: string
  total: number
  status: string
  source: 'In-Store' | 'Online'
}

const statusLabel: Record<string, string> = {
  completed: 'Completed',
  refunded: 'Refunded',
  voided: 'Voided',
  pending: 'Pending Payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  fulfilled: 'Fulfilled',
}

export default function AccountPage() {
  const { checkingSession, isAuthenticated, user, customer, refreshCustomer } = useAuth()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    if (!customer) return
    let cancelled = false
    ;(async () => {
      const [salesRes, onlineRes] = await Promise.all([
        supabase.from('sales').select('id, order_number, sale_date, total, status').eq('customer_id', customer.id).order('sale_date', { ascending: false }).limit(20),
        supabase.from('online_orders').select('id, order_number, created_at, total, status').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(20),
      ])
      if (cancelled) return
      const combined: OrderRow[] = [
        ...(salesRes.data ?? []).map((s) => ({ id: s.id, orderNumber: s.order_number, date: s.sale_date, total: Number(s.total), status: s.status, source: 'In-Store' as const })),
        ...(onlineRes.data ?? []).map((o) => ({ id: o.id, orderNumber: o.order_number, date: o.created_at, total: Number(o.total), status: o.status, source: 'Online' as const })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setOrders(combined)
      setOrdersLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [customer])

  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' })
  const [addressForm, setAddressForm] = useState({ street: '', city: '', province: '', zipCode: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [addressMessage, setAddressMessage] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) return
    setProfileForm({ fullName: customer.fullName, phone: customer.phone })
    setAddressForm({ street: customer.street, city: customer.city, province: customer.province, zipCode: customer.zipCode })
  }, [customer])

  if (checkingSession) return null
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: '/account' }} replace />

  const saveProfile = async () => {
    if (!customer) return
    setSavingProfile(true)
    setProfileMessage(null)
    const { error } = await supabase
      .from('customers')
      .update({ full_name: profileForm.fullName.trim(), phone: profileForm.phone.trim() })
      .eq('id', customer.id)
    setSavingProfile(false)
    if (error) return setProfileMessage(error.message)
    await refreshCustomer()
    setProfileMessage('Saved.')
  }

  const saveAddress = async () => {
    if (!customer) return
    setSavingAddress(true)
    setAddressMessage(null)
    const { error } = await supabase
      .from('customers')
      .update({
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        province: addressForm.province.trim(),
        zip_code: addressForm.zipCode.trim(),
      })
      .eq('id', customer.id)
    setSavingAddress(false)
    if (error) return setAddressMessage(error.message)
    await refreshCustomer()
    setAddressMessage('Saved.')
  }

  const changePassword = async () => {
    setPasswordError(null)
    setPasswordMessage(null)
    if (passwordForm.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("Passwords don't match.")
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
    setSavingPassword(false)
    if (error) return setPasswordError(error.message)
    setPasswordForm({ password: '', confirm: '' })
    setPasswordMessage('Password updated.')
  }

  return (
    <div>
      <style>{`
        .rk-account-body {
          max-width: 40rem;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
        }
        .rk-account-card {
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .rk-account-card-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 1.125rem;
          color: var(--text);
          margin: 0 0 0.25rem;
        }
        .rk-account-card-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0 0 1.25rem;
        }
        .rk-account-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.875rem;
        }
        .rk-account-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .rk-account-field-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-account-field input {
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: var(--bg);
          color: var(--text);
        }
        .rk-account-field input:disabled {
          color: var(--text-faint);
          cursor: not-allowed;
        }
        .rk-account-save-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .rk-account-save-btn {
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: 999px;
          padding: 0.625rem 1.5rem;
          font-size: 0.8125rem;
          font-weight: 800;
          cursor: pointer;
        }
        .rk-account-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rk-account-message {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-account-message-error {
          color: var(--accent-red);
        }
        .rk-account-loyalty {
          display: flex;
          gap: 2rem;
        }
        .rk-account-loyalty-stat {
          display: flex;
          flex-direction: column;
        }
        .rk-account-loyalty-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.75rem;
          color: var(--text);
        }
        .rk-account-loyalty-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-account-orders {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .rk-account-order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
        }
        .rk-account-order-number {
          font-weight: 800;
          font-size: 0.875rem;
          color: var(--text);
        }
        .rk-account-order-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
        }
        .rk-account-order-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .rk-account-order-total {
          font-weight: 800;
          font-size: 0.875rem;
          color: var(--text);
        }
        .rk-account-order-badge {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
          background: var(--bg);
          color: var(--text-muted);
        }
        .rk-account-order-badge-completed,
        .rk-account-order-badge-paid,
        .rk-account-order-badge-fulfilled {
          background: rgba(12, 163, 12, 0.12);
          color: #0ca30c;
        }
        .rk-account-order-badge-pending {
          background: rgba(250, 178, 25, 0.16);
          color: #8a5a00;
        }
        .rk-account-order-badge-refunded,
        .rk-account-order-badge-voided,
        .rk-account-order-badge-cancelled {
          background: rgba(254, 0, 0, 0.08);
          color: var(--accent-red);
        }
        .rk-account-signout {
          background: none;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.625rem 1.5rem;
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--text);
          cursor: pointer;
        }
        @media (min-width: 640px) {
          .rk-account-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <PageHero title="My Account" subtitle="Manage your profile, address, and security settings." />

      <div className="rk-account-body">
        <div className="rk-account-card">
          <h2 className="rk-account-card-title">Profile</h2>
          <p className="rk-account-card-desc">Your name and contact number.</p>
          <div className="rk-account-grid">
            <label className="rk-account-field">
              <span className="rk-account-field-label">Full name</span>
              <input value={profileForm.fullName} onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))} />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">Email</span>
              <input value={user?.email ?? ''} disabled />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">Phone</span>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
          </div>
          <div className="rk-account-save-row">
            <button className="rk-account-save-btn" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
            {profileMessage && <span className="rk-account-message">{profileMessage}</span>}
          </div>
        </div>

        <div className="rk-account-card">
          <h2 className="rk-account-card-title">Shipping Address</h2>
          <p className="rk-account-card-desc">Used to pre-fill delivery details at checkout.</p>
          <div className="rk-account-grid">
            <label className="rk-account-field">
              <span className="rk-account-field-label">Street</span>
              <input value={addressForm.street} onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))} />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">City</span>
              <input value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">Province</span>
              <input value={addressForm.province} onChange={(e) => setAddressForm((f) => ({ ...f, province: e.target.value }))} />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">ZIP Code</span>
              <input value={addressForm.zipCode} onChange={(e) => setAddressForm((f) => ({ ...f, zipCode: e.target.value }))} />
            </label>
          </div>
          <div className="rk-account-save-row">
            <button className="rk-account-save-btn" onClick={saveAddress} disabled={savingAddress}>
              {savingAddress ? 'Saving…' : 'Save Address'}
            </button>
            {addressMessage && <span className="rk-account-message">{addressMessage}</span>}
          </div>
        </div>

        <div className="rk-account-card">
          <h2 className="rk-account-card-title">My Orders</h2>
          <p className="rk-account-card-desc">Purchases made online or in-store.</p>
          {ordersLoading ? (
            <p className="rk-account-message">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="rk-account-message">No orders yet.</p>
          ) : (
            <div className="rk-account-orders">
              {orders.map((o) => (
                <div key={`${o.source}-${o.id}`} className="rk-account-order-row">
                  <div>
                    <div className="rk-account-order-number">{o.orderNumber}</div>
                    <div className="rk-account-order-meta">{o.source} · {new Date(o.date).toLocaleDateString()}</div>
                  </div>
                  <div className="rk-account-order-right">
                    <span className="rk-account-order-total">{formatPeso(o.total)}</span>
                    <span className={`rk-account-order-badge rk-account-order-badge-${o.status}`}>{statusLabel[o.status] ?? o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rk-account-card">
          <h2 className="rk-account-card-title">Rewards</h2>
          <p className="rk-account-card-desc">Earned from purchases made in-store or online.</p>
          <div className="rk-account-loyalty">
            <div className="rk-account-loyalty-stat">
              <span className="rk-account-loyalty-value">{customer?.loyaltyPoints ?? 0}</span>
              <span className="rk-account-loyalty-label">Loyalty Points</span>
            </div>
            <div className="rk-account-loyalty-stat">
              <span className="rk-account-loyalty-value">{formatPeso(customer?.totalPurchases ?? 0)}</span>
              <span className="rk-account-loyalty-label">Total Purchases</span>
            </div>
          </div>
        </div>

        <div className="rk-account-card">
          <h2 className="rk-account-card-title">Privacy &amp; Security</h2>
          <p className="rk-account-card-desc">Change the password used to sign in.</p>
          <div className="rk-account-grid">
            <label className="rk-account-field">
              <span className="rk-account-field-label">New password</span>
              <input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            <label className="rk-account-field">
              <span className="rk-account-field-label">Confirm new password</span>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} />
            </label>
          </div>
          <div className="rk-account-save-row">
            <button className="rk-account-save-btn" onClick={changePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
            {passwordMessage && <span className="rk-account-message">{passwordMessage}</span>}
            {passwordError && <span className="rk-account-message rk-account-message-error">{passwordError}</span>}
          </div>
        </div>

        <button className="rk-account-signout" onClick={() => supabase.auth.signOut()}>Sign Out</button>
      </div>
    </div>
  )
}
