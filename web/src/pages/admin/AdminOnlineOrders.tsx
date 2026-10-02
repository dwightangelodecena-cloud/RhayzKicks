import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { Money } from './Money'
import { IconPackageCheck, IconRefresh } from './adminIcons'
import { adminCardStyles } from './adminCardStyles'
import { EmptyState, Modal, Notice, Pill, SearchInput, SectionHead, Segmented, StatGrid, StatTile, Toolbar, type Tone } from './adminUi'
import { useAdmin } from '../../context/AdminContext'
import DeliveryStepper from '../../components/DeliveryStepper'
import { deliveryStages, nextDeliveryStage, type DeliveryStage } from '../../data/deliveryStages'

interface OnlineOrderRow {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  status: string
  subtotal: number
  total: number
  payment_method: string | null
  paid_at: string | null
  fulfilled_at: string | null
  delivery_stage: DeliveryStage
  packed_at: string | null
  picked_up_at: string | null
  received_at: string | null
  // Added to online_orders_detail in 024_archive_products_and_delivery_view.sql.
  discount: number | null
  customer_street: string | null
  customer_city: string | null
  customer_province: string | null
  customer_zip_code: string | null
}

// "Street, City, Province ZIP" from the customer's saved address (Account →
// Profile). Empty when they haven't filled it in.
function addressOf(o: OnlineOrderRow) {
  const cityLine = [o.customer_city, [o.customer_province, o.customer_zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [o.customer_street, cityLine].filter(Boolean).join(', ')
}

interface OrderItemRow {
  id: string
  quantity: number
  unit_price: number
  sku: string
  items: { name: string } | null
  item_variants: { size: string; color: string } | null
}

// The query below only loads paid + fulfilled orders, so the queue buckets are
// the three in-progress delivery stages plus "delivered" (status fulfilled —
// set by the DB trigger when the stage reaches 'received').
type Bucket = 'pack' | 'courier' | 'out' | 'delivered'
type Filter = 'active' | 'all' | Bucket

const LOAD_LIMIT = 30

const bucketOfStage: Record<Exclude<DeliveryStage, 'received'>, Bucket> = {
  preparing: 'pack',
  packed: 'courier',
  picked_up: 'out',
}

function bucketOf(o: OnlineOrderRow): Bucket {
  // An order can be fulfilled without reaching 'received' (older "Mark
  // Fulfilled" flow), so status wins over the stage.
  if (o.status === 'fulfilled' || o.delivery_stage === 'received') return 'delivered'
  return bucketOfStage[o.delivery_stage]
}

const bucketInfo: Record<Bucket, { label: string; tone: Tone; sub: string; emptyTitle: string; emptyHint: string }> = {
  pack: { label: 'To pack', tone: 'warn', sub: 'Paid — get the pairs ready', emptyTitle: 'Nothing to pack', emptyHint: 'New paid orders show up here first.' },
  courier: { label: 'Waiting for courier', tone: 'info', sub: 'Packed, not picked up yet', emptyTitle: 'No packages waiting for a courier', emptyHint: 'Orders you mark as packed wait here until the courier collects them.' },
  out: { label: 'Out for delivery', tone: 'info', sub: 'With the courier now', emptyTitle: 'Nothing out for delivery', emptyHint: 'Once a courier picks up a package, it shows here until it’s delivered.' },
  delivered: { label: 'Delivered', tone: 'ok', sub: 'Completed orders', emptyTitle: 'No delivered orders yet', emptyHint: 'Orders move here after you mark them as delivered.' },
}

// The one next step for each in-progress stage, in plain words, plus what the
// confirmation dialog says. Moving forward can't be undone from this screen.
const nextStep: Record<Exclude<DeliveryStage, 'received'>, { button: string; title: string; body: string; confirm: string }> = {
  preparing: {
    button: 'Mark as packed',
    title: 'Mark as packed?',
    body: 'Check that every pair below is boxed and labeled. The order will move to “Waiting for courier”.',
    confirm: 'Yes, it’s packed',
  },
  packed: {
    button: 'Courier picked it up',
    title: 'Courier picked it up?',
    body: 'Only confirm once the courier has actually collected the package from the store. The order will move to “Out for delivery”.',
    confirm: 'Yes, courier has it',
  },
  picked_up: {
    button: 'Mark as delivered',
    title: 'Mark as delivered?',
    body: 'Confirm the customer has received the package. This completes the order and moves it to “Delivered”.',
    confirm: 'Yes, it was delivered',
  },
}

function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform var(--duration-fast) var(--ease-out)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// "3 hours ago" style age, so staff can spot orders that have waited too long.
function fmtAgo(iso: string | null) {
  if (!iso) return null
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function ItemsList({ items, loading }: { items: OrderItemRow[] | undefined; loading: boolean }) {
  return (
    <div className="rk-dlv-items">
      {loading && !items ? (
        <span className="rk-dlv-items-empty">Loading items…</span>
      ) : items && items.length > 0 ? (
        items.map((item) => (
          <div className="rk-dlv-item-row" key={item.id}>
            <span>
              <strong>{item.quantity}×</strong> {item.items?.name ?? item.sku}
              {item.item_variants && (
                <span className="rk-dlv-item-variant">
                  {' '}— {[item.item_variants.color, item.item_variants.size ? `Size ${item.item_variants.size}` : ''].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <Money amount={Number(item.unit_price) * item.quantity} />
          </div>
        ))
      ) : (
        <span className="rk-dlv-items-empty">No items found.</span>
      )}
    </div>
  )
}

export default function AdminOnlineOrders() {
  const { role } = useAdmin()
  const canUpdate = role === 'staff'

  const [orders, setOrders] = useState<OnlineOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<OnlineOrderRow | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItemRow[]>>({})
  const [loadingItems, setLoadingItems] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('online_orders_detail')
      .select('id, order_number, customer_name, customer_phone, status, subtotal, discount, total, payment_method, paid_at, fulfilled_at, delivery_stage, packed_at, picked_up_at, received_at, customer_street, customer_city, customer_province, customer_zip_code')
      .in('status', ['paid', 'fulfilled'])
      .order('paid_at', { ascending: false })
      .limit(LOAD_LIMIT)
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

  // Lazy-loads an order's line items once, then caches them.
  const fetchItems = async (id: string) => {
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

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    fetchItems(id)
  }

  const advanceStage = async (order: OnlineOrderRow) => {
    const next = nextDeliveryStage(order.delivery_stage)
    if (!next) return false
    setUpdatingId(order.id)
    const { error: updateError } = await supabase.from('online_orders').update({ delivery_stage: next }).eq('id', order.id)
    setUpdatingId(null)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    load()
    return true
  }

  const openConfirm = (order: OnlineOrderRow) => {
    setSuccess(null)
    setConfirming(order)
    // The packing step shows the pairs to box up, so load them now.
    if (order.delivery_stage === 'preparing') fetchItems(order.id)
  }

  const confirmAdvance = async () => {
    const order = confirming
    if (!order) return
    setConfirming(null)
    const next = nextDeliveryStage(order.delivery_stage)
    const ok = await advanceStage(order)
    if (ok && next) {
      const movedTo = next === 'received' ? 'Delivered' : bucketInfo[bucketOfStage[next]].label
      setSuccess(`${order.order_number} moved to “${movedTo}”.`)
    }
  }

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { pack: 0, courier: 0, out: 0, delivered: 0 }
    for (const o of orders) c[bucketOf(o)] += 1
    return c
  }, [orders])
  const activeCount = counts.pack + counts.courier + counts.out

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = orders.filter((o) => {
      const b = bucketOf(o)
      if (filter === 'active' && b === 'delivered') return false
      if (filter !== 'active' && filter !== 'all' && b !== filter) return false
      if (!q) return true
      return [o.order_number, o.customer_name, o.customer_phone].some((v) => v?.toLowerCase().includes(q))
    })
    // Work queue: in-progress orders oldest-paid first so nothing gets
    // forgotten; delivered orders stay newest first.
    if (filter !== 'delivered' && filter !== 'all') {
      return [...list].sort((a, b) => (a.paid_at ?? '').localeCompare(b.paid_at ?? ''))
    }
    return list
  }, [orders, filter, search])

  // Tiles toggle their bucket; tapping the active one goes back to "In progress".
  const pickBucket = (b: Bucket) => setFilter((f) => (f === b ? (b === 'delivered' ? 'all' : 'active') : b))

  const segValue: 'active' | 'delivered' | 'all' = filter === 'delivered' || filter === 'all' ? filter : 'active'

  const empty = (() => {
    if (search.trim()) return { title: 'No orders match your search', hint: 'Try an order number like RK-ON-1234, or part of the customer’s name or phone.' }
    if (filter === 'active') return { title: 'All caught up!', hint: 'No online orders need packing or delivery right now.' }
    if (filter === 'all') return { title: 'No paid online orders yet', hint: 'Orders appear here once the customer has paid.' }
    return { title: bucketInfo[filter].emptyTitle, hint: bucketInfo[filter].emptyHint }
  })()

  const confirmStep = confirming && confirming.delivery_stage !== 'received' ? nextStep[confirming.delivery_stage] : null
  const confirmNext = confirming ? nextDeliveryStage(confirming.delivery_stage) : null
  const confirmCustomerLabel = deliveryStages.find((s) => s.key === confirmNext)?.customerLabel

  return (
    <div className="rk-admin-card">
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-dlv-list { display: flex; flex-direction: column; gap: 0.875rem; }
        .rk-dlv-card {
          border: 1px solid var(--border);
          border-left: 4px solid var(--border);
          border-radius: var(--radius-card, 0.875rem);
          padding: 1rem 1.125rem;
          background: var(--bg);
        }
        .rk-dlv-card-pack { border-left-color: #f5a400; }
        .rk-dlv-card-courier, .rk-dlv-card-out { border-left-color: #3b82f6; }
        .rk-dlv-card-delivered { border-left-color: #0ca30c; }
        .rk-dlv-head {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem 1rem;
        }
        .rk-dlv-id-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .rk-dlv-id {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          font-size: 1.125rem;
          letter-spacing: 0.01em;
          color: var(--text);
        }
        .rk-dlv-customer { font-size: 0.875rem; font-weight: 700; color: var(--text); margin-top: 0.25rem; }
        .rk-dlv-address {
          max-width: 34rem;
          line-height: 1.45;
        }
        .rk-dlv-address-missing {
          color: #d98f00;
          font-weight: 700;
        }
        .rk-dlv-contact { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.125rem; }
        .rk-dlv-contact a { color: inherit; }
        .rk-dlv-money { text-align: right; flex-shrink: 0; }
        .rk-dlv-total { font-weight: 800; font-size: 1.125rem; color: var(--text); }
        .rk-dlv-money-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem; }
        .rk-dlv-voucher { color: #0a8f0a; font-weight: 700; }
        [data-theme='dark'] .rk-dlv-voucher { color: #2fd12f; }
        .rk-dlv-paid { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.625rem; }
        .rk-dlv-paid strong { color: var(--text); }
        .rk-dlv-stepper { margin-top: 1rem; padding: 0.875rem 0.5rem 0.625rem; border-radius: 0.625rem; background: var(--bg-secondary); }
        .rk-dlv-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.875rem;
        }
        .rk-dlv-viewonly { font-size: 0.75rem; color: var(--text-faint); }
        .rk-dlv-items {
          margin-top: 0.75rem;
          padding: 0.75rem 0.875rem;
          border-radius: 0.625rem;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .rk-dlv-item-row { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.8125rem; color: var(--text); }
        .rk-dlv-item-variant { color: var(--text-muted); }
        .rk-dlv-items-empty { font-size: 0.8125rem; color: var(--text-muted); font-style: italic; }
        .rk-dlv-note { font-size: 0.75rem; color: var(--text-faint); margin: 1rem 0 0; text-align: center; }
        .rk-dlv-modal-body { font-size: 0.875rem; color: var(--text); line-height: 1.5; margin: 0; }
        .rk-dlv-modal-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0.75rem 0 0; }
        @media (max-width: 40rem) {
          .rk-dlv-money { text-align: left; width: 100%; }
          .rk-dlv-foot .rk-ui-btn-primary { width: 100%; }
        }
      `}</style>

      <SectionHead
        icon={<IconPackageCheck />}
        title="Delivery"
        desc={
          canUpdate
            ? 'Paid online orders, step by step: pack the pairs, hand them to the courier, then mark them delivered. Press the button on each order when its next step is done.'
            : 'View only — staff accounts update packing, courier pickup, and delivery.'
        }
        actions={
          <button type="button" className="rk-ui-btn" onClick={() => load()} disabled={loading}>
            <IconRefresh size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
      {success && <Notice tone="ok" onDismiss={() => setSuccess(null)}>{success}</Notice>}

      <StatGrid>
        {(['pack', 'courier', 'out', 'delivered'] as Bucket[]).map((b) => (
          <StatTile
            key={b}
            label={bucketInfo[b].label}
            value={loading ? '—' : counts[b]}
            sub={bucketInfo[b].sub}
            tone={b === 'pack' && counts.pack > 0 ? 'warn' : bucketInfo[b].tone === 'warn' ? 'neutral' : bucketInfo[b].tone}
            active={filter === b}
            onClick={() => pickBucket(b)}
          />
        ))}
      </StatGrid>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order number, customer name or phone" />
        <Segmented
          label="Which orders to show"
          value={segValue}
          onChange={(v) => setFilter(v)}
          options={[
            { value: 'active', label: 'In progress', count: activeCount },
            { value: 'delivered', label: 'Delivered', count: counts.delivered },
            { value: 'all', label: 'All', count: orders.length },
          ]}
        />
      </Toolbar>

      {filter !== 'active' && filter !== 'all' && filter !== 'delivered' && (
        <Notice tone="info" onDismiss={() => setFilter('active')}>
          Showing only “{bucketInfo[filter].label}”. Tap the tile again or × to see all in-progress orders.
        </Notice>
      )}

      {loading && orders.length === 0 ? (
        <EmptyState title="Loading orders…" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={empty.title}
          hint={empty.hint}
          action={
            search.trim() ? (
              <button type="button" className="rk-ui-btn" onClick={() => setSearch('')}>Clear search</button>
            ) : filter !== 'active' && filter !== 'all' && activeCount > 0 ? (
              <button type="button" className="rk-ui-btn" onClick={() => setFilter('active')}>Show all in-progress orders</button>
            ) : undefined
          }
        />
      ) : (
        <div className="rk-dlv-list">
          {visible.map((o) => {
            const bucket = bucketOf(o)
            const info = bucketInfo[bucket]
            const step = bucket !== 'delivered' && o.delivery_stage !== 'received' ? nextStep[o.delivery_stage] : null
            const discount = Number(o.discount ?? 0)
            const address = addressOf(o)
            const isExpanded = expandedId === o.id
            const isUpdating = updatingId === o.id
            const waited = bucket !== 'delivered' ? fmtAgo(o.paid_at) : null
            return (
              <div className={`rk-dlv-card rk-dlv-card-${bucket}`} key={o.id}>
                <div className="rk-dlv-head">
                  <div>
                    <div className="rk-dlv-id-row">
                      <span className="rk-dlv-id">{o.order_number}</span>
                      <Pill tone={info.tone}>{info.label}</Pill>
                    </div>
                    <div className="rk-dlv-customer">{o.customer_name}</div>
                    {o.customer_phone && (
                      <div className="rk-dlv-contact">
                        <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
                      </div>
                    )}
                    <div className="rk-dlv-contact rk-dlv-address">
                      {address ? (
                        <>Deliver to: {address}</>
                      ) : (
                        <span className="rk-dlv-address-missing">No delivery address saved — call the customer to confirm</span>
                      )}
                    </div>
                  </div>
                  <div className="rk-dlv-money">
                    <div className="rk-dlv-total"><Money amount={Number(o.total)} /></div>
                    {discount > 0 && (
                      <div className="rk-dlv-money-meta">
                        <span className="rk-dlv-voucher">Voucher −<Money amount={discount} /></span> (was <Money amount={Number(o.subtotal)} />)
                      </div>
                    )}
                    <div className="rk-dlv-money-meta">{o.payment_method ? `Paid via ${o.payment_method.toUpperCase()}` : 'Paid'}</div>
                  </div>
                </div>

                <div className="rk-dlv-paid">
                  Paid <strong>{fmtDateTime(o.paid_at)}</strong>
                  {waited && <> · waiting {waited}</>}
                  {bucket === 'delivered' && o.fulfilled_at && <> · completed {fmtDateTime(o.fulfilled_at)}</>}
                </div>

                <div className="rk-dlv-stepper">
                  <DeliveryStepper
                    stage={o.delivery_stage}
                    variant="staff"
                    timestamps={{ packed: o.packed_at, picked_up: o.picked_up_at, received: o.received_at }}
                  />
                </div>

                {isExpanded && <ItemsList items={itemsByOrder[o.id]} loading={loadingItems} />}

                <div className="rk-dlv-foot">
                  <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => toggleExpand(o.id)} aria-expanded={isExpanded}>
                    {isExpanded ? 'Hide items' : 'Show items'} <ChevronIcon open={isExpanded} />
                  </button>
                  {step && canUpdate ? (
                    <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={() => openConfirm(o)} disabled={isUpdating}>
                      {isUpdating ? 'Saving…' : <>{step.button} <ArrowRightIcon /></>}
                    </button>
                  ) : step ? (
                    <span className="rk-dlv-viewonly">Next step: {step.button.toLowerCase()} (staff only)</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && orders.length >= LOAD_LIMIT && (
        <p className="rk-dlv-note">Showing the latest {LOAD_LIMIT} paid online orders. Counts above cover these orders only.</p>
      )}

      {confirming && confirmStep && (
        <Modal
          title={confirmStep.title}
          subtitle={`${confirming.order_number} · ${confirming.customer_name}`}
          onClose={() => setConfirming(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={() => setConfirming(null)}>Not yet</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={confirmAdvance}>{confirmStep.confirm}</button>
            </>
          }
        >
          <p className="rk-dlv-modal-body">{confirmStep.body}</p>
          {confirming.delivery_stage === 'preparing' && <ItemsList items={itemsByOrder[confirming.id]} loading={loadingItems} />}
          <p className="rk-dlv-modal-hint">
            {confirmCustomerLabel && <>The customer will see “{confirmCustomerLabel}” on their order. </>}
            This step can’t be undone here.
          </p>
        </Modal>
      )}
    </div>
  )
}
