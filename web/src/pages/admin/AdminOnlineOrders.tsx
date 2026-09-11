import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { Money } from './Money'
import { IconPackageCheck } from './adminIcons'
import { useAdmin } from '../../context/AdminContext'
import DeliveryStepper from '../../components/DeliveryStepper'
import { deliveryStages, nextDeliveryStage, type DeliveryStage } from '../../data/deliveryStages'

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
  delivery_stage: DeliveryStage
  packed_at: string | null
  picked_up_at: string | null
  received_at: string | null
}

interface OrderItemRow {
  id: string
  quantity: number
  unit_price: number
  sku: string
  items: { name: string } | null
  item_variants: { size: string; color: string } | null
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform var(--duration-fast) var(--ease-out)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export default function AdminOnlineOrders() {
  const { role } = useAdmin()
  const canUpdate = role === 'staff'

  const [orders, setOrders] = useState<OnlineOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItemRow[]>>({})
  const [loadingItems, setLoadingItems] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('online_orders_detail')
      .select('id, order_number, customer_name, customer_phone, status, total, payment_method, paid_at, fulfilled_at, delivery_stage, packed_at, picked_up_at, received_at')
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

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (itemsByOrder[id]) return
    setLoadingItems(true)
    const { data, error: itemsError } = await supabase
      .from('online_order_items')
      // online_order_items has two FKs into item_variants (variant_id and
      // sku), so PostgREST can't infer which to embed on without a hint —
      // "more than one relationship was found for online_order_items and
      // item_variants" without the `!variant_id` disambiguator.
      .select('id, quantity, unit_price, sku, items(name), item_variants!variant_id(size, color)')
      .eq('order_id', id)
    setLoadingItems(false)
    if (itemsError) {
      setError(itemsError.message)
      return
    }
    setItemsByOrder((prev) => ({ ...prev, [id]: (data ?? []) as unknown as OrderItemRow[] }))
  }

  const advanceStage = async (order: OnlineOrderRow) => {
    const next = nextDeliveryStage(order.delivery_stage)
    if (!next) return
    setUpdatingId(order.id)
    const { error: updateError } = await supabase.from('online_orders').update({ delivery_stage: next }).eq('id', order.id)
    setUpdatingId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  const visible = orders.filter((o) => showCompleted || o.status !== 'fulfilled')

  return (
    <div className="rk-admin-card">
      <style>{`
        .rk-delivery-order-card {
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 1.125rem 1.25rem;
          margin-bottom: 0.875rem;
          transition: box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out);
        }
        .rk-delivery-order-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--chip-border);
        }
        .rk-delivery-order-head {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .rk-delivery-order-id {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text);
          font-family: 'Barlow Condensed', sans-serif;
          letter-spacing: 0.01em;
        }
        .rk-delivery-order-customer {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: 0.1875rem;
        }
        .rk-delivery-order-summary {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .rk-delivery-order-total {
          font-weight: 800;
          font-size: 1.0625rem;
          color: var(--text);
        }
        .rk-delivery-order-payment {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-faint);
          margin-top: 0.1875rem;
        }
        .rk-delivery-order-actions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .rk-delivery-view-items {
          display: inline-flex;
          align-items: center;
          gap: 0.3125rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-top: 0.625rem;
          transition: color var(--duration-fast) var(--ease-out);
        }
        .rk-delivery-view-items:hover {
          color: var(--text);
        }
        .rk-delivery-stepper-wrap {
          margin-top: 1.125rem;
        }
        .rk-delivery-items {
          margin-top: 0.875rem;
          padding: 0.875rem 1rem;
          border-radius: 0.625rem;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          animation: rk-fade-in var(--duration-base) var(--ease-out) both;
        }
        .rk-delivery-item-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.8125rem;
          color: var(--text);
        }
        .rk-delivery-item-variant {
          color: var(--text-muted);
        }
        .rk-delivery-item-empty {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .rk-delivery-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4375rem;
          background: var(--accent-red);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 0.625rem 1.25rem;
          font-weight: 800;
          font-size: 0.8125rem;
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(254, 0, 0, 0.22);
          transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);
        }
        .rk-delivery-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(254, 0, 0, 0.32);
        }
        .rk-delivery-action-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .rk-delivery-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
      <div className="rk-admin-card-head">
        <div>
          <h2 className="rk-admin-card-title"><IconPackageCheck /> Delivery Tracking</h2>
          <p className="rk-admin-card-desc">
            {canUpdate
              ? 'Mark each paid order as it gets packed, picked up, and delivered.'
              : 'View-only — staff update packing, pickup, and delivery status.'}
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Show completed
        </label>
      </div>

      {error && <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      {loading ? (
        <p className="rk-admin-empty">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="rk-admin-empty">No online orders in progress.</p>
      ) : (
        visible.map((o) => {
          const stageInfo = deliveryStages.find((s) => s.key === o.delivery_stage)
          const next = nextDeliveryStage(o.delivery_stage)
          const isExpanded = expandedId === o.id
          const items = itemsByOrder[o.id]
          return (
            <div className="rk-delivery-order-card" key={o.id}>
              <div className="rk-delivery-order-head">
                <div>
                  <div className="rk-delivery-order-id">{o.order_number}</div>
                  <div className="rk-delivery-order-customer">{o.customer_name}{o.customer_phone ? ` — ${o.customer_phone}` : ''}</div>
                </div>
                <div className="rk-delivery-order-summary">
                  <span className="rk-delivery-order-total"><Money amount={Number(o.total)} /></span>
                  <span className="rk-delivery-order-payment">{o.payment_method ?? '—'}</span>
                </div>
                <div className="rk-delivery-order-actions">
                  {o.status === 'fulfilled' ? (
                    <span className="rk-admin-badge rk-admin-badge-off">Completed</span>
                  ) : canUpdate && next ? (
                    <button className="rk-delivery-action-btn" onClick={() => advanceStage(o)} disabled={updatingId === o.id}>
                      {updatingId === o.id ? 'Updating…' : <>{stageInfo?.staffActionLabel} <ArrowRightIcon /></>}
                    </button>
                  ) : null}
                </div>
              </div>

              <button type="button" className="rk-delivery-view-items" onClick={() => toggleExpand(o.id)}>
                {isExpanded ? 'Hide items' : 'View items'} <ChevronIcon open={isExpanded} />
              </button>

              <div className="rk-delivery-stepper-wrap">
                <DeliveryStepper
                  stage={o.delivery_stage}
                  variant="staff"
                  timestamps={{ packed: o.packed_at, picked_up: o.picked_up_at, received: o.received_at }}
                />
              </div>

              {isExpanded && (
                <div className="rk-delivery-items">
                  {loadingItems && !items ? (
                    <span className="rk-delivery-item-empty">Loading items…</span>
                  ) : items && items.length > 0 ? (
                    items.map((item) => (
                      <div className="rk-delivery-item-row" key={item.id}>
                        <span>
                          {item.quantity}× {item.items?.name ?? item.sku}
                          {item.item_variants && (
                            <span className="rk-delivery-item-variant">
                              {' '}({[item.item_variants.color, item.item_variants.size].filter(Boolean).join(' · ')})
                            </span>
                          )}
                        </span>
                        <Money amount={Number(item.unit_price) * item.quantity} />
                      </div>
                    ))
                  ) : (
                    <span className="rk-delivery-item-empty">No items found.</span>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
