import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { Money } from './Money'
import { IconBox } from './adminIcons'

interface OnlineOrderRow {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  status: string
  total: number
  payment_method: string | null
  paid_at: string | null
  fulfilled_at: string | null
}

export default function AdminOnlineOrders() {
  const [orders, setOrders] = useState<OnlineOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFulfilled, setShowFulfilled] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('online_orders_detail')
      .select('id, order_number, customer_name, customer_phone, status, total, payment_method, paid_at, fulfilled_at')
      .in('status', ['paid', 'fulfilled'])
      .order('paid_at', { ascending: false })
      .limit(30)
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setOrders((data ?? []) as OnlineOrderRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const markFulfilled = async (id: string) => {
    const { error: updateError } = await supabase
      .from('online_orders')
      .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const visible = orders.filter((o) => showFulfilled || o.status === 'paid')

  return (
    <div className="rk-admin-card">
      <div className="rk-admin-card-head">
        <div>
          <h2 className="rk-admin-card-title"><IconBox /> Online Orders</h2>
          <p className="rk-admin-card-desc">Paid online — ready for pickup. Mark fulfilled once handed over.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showFulfilled} onChange={(e) => setShowFulfilled(e.target.checked)} />
          Show fulfilled
        </label>
      </div>

      {error && <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      {loading ? (
        <p className="rk-admin-empty">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="rk-admin-empty">No online orders waiting on pickup.</p>
      ) : (
        <div className="rk-admin-table-wrap">
          <table className="rk-admin-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Total</th><th>Paid Via</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.customer_name}{o.customer_phone ? ` — ${o.customer_phone}` : ''}</td>
                  <td><Money amount={Number(o.total)} /></td>
                  <td>{o.payment_method ?? '—'}</td>
                  <td>
                    <span className={`rk-admin-badge ${o.status === 'fulfilled' ? 'rk-admin-badge-off' : 'rk-admin-badge-ok'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    {o.status === 'paid' && (
                      <button className="rk-admin-primary-btn" onClick={() => markFulfilled(o.id)}>Mark Fulfilled</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
