import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../supabase'
import { Money } from './Money'
import { EmptyState, Modal, Notice, Pill, StatGrid, StatTile } from './adminUi'

export type KpiKey = 'today' | 'month' | 'customers' | 'products' | 'lowstock' | 'profit' | 'stock'

const titles: Record<KpiKey, { title: string; desc: string }> = {
  today: { title: 'Sales Today', desc: 'Completed in-store sales and paid online orders since midnight, newest first.' },
  month: { title: 'Sales This Month', desc: 'Completed in-store sales and paid online orders since the 1st, newest first.' },
  customers: { title: 'Customers', desc: 'Your active customers, biggest spenders first.' },
  products: { title: 'Products on the Store', desc: 'Every product in the catalog and whether it is showing on the website.' },
  lowstock: { title: 'Running Low', desc: 'Sizes at or below their reorder level, lowest first. Add arriving stock right here.' },
  profit: { title: 'Profit This Month', desc: 'What you sold for, minus what the items cost you — in-store and online.' },
  stock: { title: 'Stock Value', desc: 'Pairs on hand × cost price, by product — what your current stock cost you.' },
}

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

interface Summary {
  label: string
  value: ReactNode
  tone?: 'alert' | 'ok'
}

interface Table {
  columns: string[]
  rows: ReactNode[][]
  empty: string
}

interface Detail {
  summary: Summary[]
  table: Table
  note?: string
}

interface OrderLine {
  number: string
  customer: string
  channel: 'In-store' | 'Online'
  method: string
  total: number
  at: string
}

// Completed POS sales + paid/fulfilled online orders since `sinceISO`.
async function loadOrders(sinceISO: string): Promise<OrderLine[]> {
  const [salesRes, onlineRes] = await Promise.all([
    supabase
      .from('sales_detail')
      .select('order_number, customer_name, payment_method, total, sale_date')
      .eq('status', 'completed')
      .gte('sale_date', sinceISO),
    supabase
      .from('online_orders')
      .select('order_number, payment_method, total, paid_at, customers(full_name)')
      .in('status', ['paid', 'fulfilled'])
      .gte('paid_at', sinceISO),
  ])
  if (salesRes.error) throw salesRes.error
  if (onlineRes.error) throw onlineRes.error
  const lines: OrderLine[] = [
    ...(salesRes.data ?? []).map((s) => ({
      number: s.order_number as string,
      customer: (s.customer_name as string | null) ?? 'Walk-in',
      channel: 'In-store' as const,
      method: (s.payment_method as string) ?? '—',
      total: Number(s.total),
      at: s.sale_date as string,
    })),
    ...(onlineRes.data ?? []).map((o) => ({
      number: o.order_number as string,
      customer: ((o.customers as unknown as { full_name: string } | null)?.full_name || 'Customer') as string,
      channel: 'Online' as const,
      method: (o.payment_method as string | null) ?? '—',
      total: Number(o.total),
      at: o.paid_at as string,
    })),
  ]
  return lines.sort((a, b) => b.at.localeCompare(a.at))
}

async function ordersDetail(sinceISO: string): Promise<Detail> {
  const orders = await loadOrders(sinceISO)
  const inStore = orders.filter((o) => o.channel === 'In-store')
  const online = orders.filter((o) => o.channel === 'Online')
  const sum = (list: OrderLine[]) => list.reduce((s, o) => s + o.total, 0)
  const total = sum(orders)
  return {
    summary: [
      { label: 'Total revenue', value: <Money amount={total} /> },
      { label: `In-store (${inStore.length})`, value: <Money amount={sum(inStore)} /> },
      { label: `Online (${online.length})`, value: <Money amount={sum(online)} /> },
      { label: 'Avg. order', value: <Money amount={orders.length ? total / orders.length : 0} /> },
    ],
    table: {
      columns: ['Order', 'Customer', 'Channel', 'Payment', 'When', 'Total'],
      rows: orders.slice(0, 100).map((o) => [
        <strong>{o.number}</strong>,
        o.customer,
        o.channel,
        <span style={{ textTransform: 'capitalize' }}>{o.method.replace('_', ' ')}</span>,
        fmtDateTime(o.at),
        <Money amount={o.total} />,
      ]),
      empty: 'No orders yet in this period.',
    },
  }
}

async function customersDetail(): Promise<Detail> {
  const { data, error } = await supabase
    .from('customers')
    .select('full_name, email, phone, loyalty_points, total_purchases, auth_user_id')
    .eq('is_active', true)
    .order('total_purchases', { ascending: false })
  if (error) throw error
  const rows = data ?? []
  const signedUp = rows.filter((c) => c.auth_user_id).length
  return {
    summary: [
      { label: 'Active customers', value: rows.length },
      { label: 'Signed up online', value: signedUp },
      { label: 'Walk-in (store only)', value: rows.length - signedUp },
      { label: 'Points outstanding', value: rows.reduce((s, c) => s + (c.loyalty_points ?? 0), 0).toLocaleString() },
    ],
    table: {
      columns: ['Name', 'Contact', 'Type', 'Points', 'Total purchases'],
      rows: rows.slice(0, 100).map((c) => [
        <strong>{c.full_name || '(no name)'}</strong>,
        c.email || c.phone || '—',
        c.auth_user_id ? 'Member' : 'Walk-in',
        (c.loyalty_points ?? 0).toLocaleString(),
        <Money amount={Number(c.total_purchases)} />,
      ]),
      empty: 'No customers yet.',
    },
  }
}

async function productsDetail(): Promise<Detail> {
  const { data, error } = await supabase
    .from('items')
    .select('name, brand, category, base_price, is_active, earns_loyalty')
    .order('sort_order', { ascending: true })
  if (error) throw error
  const rows = data ?? []
  const live = rows.filter((i) => i.is_active)
  const categories = new Set(live.map((i) => i.category))
  return {
    summary: [
      { label: 'Live on store', value: live.length, tone: 'ok' },
      { label: 'Hidden', value: rows.length - live.length },
      { label: 'Categories', value: categories.size },
      { label: 'Earn loyalty', value: rows.filter((i) => i.earns_loyalty !== false).length },
    ],
    table: {
      columns: ['Product', 'Brand', 'Category', 'Price', 'Status'],
      rows: rows.map((i) => [
        <strong>{i.name}</strong>,
        i.brand,
        <span style={{ textTransform: 'capitalize' }}>{i.category}</span>,
        <Money amount={Number(i.base_price)} />,
        <Pill tone={i.is_active ? 'ok' : 'neutral'}>{i.is_active ? 'Live' : 'Hidden'}</Pill>,
      ]),
      empty: 'No products yet.',
    },
  }
}

async function lowStockDetail(ctx: LoaderContext): Promise<Detail> {
  const { data, error } = await supabase
    .from('inventory_detail')
    .select('sku, item_name, size, color, quantity_on_hand, reorder_level')
    .eq('is_low_stock', true)
    .order('quantity_on_hand', { ascending: true })
  if (error) throw error
  const rows = data ?? []
  const outOfStock = rows.filter((r) => r.quantity_on_hand <= 0).length
  return {
    summary: [
      { label: 'Low-stock sizes', value: rows.length, tone: rows.length ? 'alert' : 'ok' },
      { label: 'Out of stock', value: outOfStock, tone: outOfStock ? 'alert' : 'ok' },
      { label: 'Products affected', value: new Set(rows.map((r) => r.item_name)).size },
    ],
    table: {
      columns: ['Product', 'Size / Color', 'SKU', 'On hand', 'Reorder at', 'Add stock'],
      rows: rows.map((r) => [
        <strong>{r.item_name}</strong>,
        [r.size, r.color].filter(Boolean).join(' · ') || '—',
        <code>{r.sku}</code>,
        <Pill tone={r.quantity_on_hand <= 0 ? 'alert' : 'warn'}>{r.quantity_on_hand <= 0 ? 'Out of stock' : `${r.quantity_on_hand} left`}</Pill>,
        r.reorder_level,
        <RestockCell
          sku={r.sku}
          label={[r.item_name, r.size && `size ${r.size}`].filter(Boolean).join(', ')}
          suggested={Math.max(r.reorder_level * 2 - r.quantity_on_hand, 1)}
          onDone={ctx.refresh}
        />,
      ]),
      empty: 'Everything is above its reorder level.',
    },
    note: rows.length
      ? 'When a delivery arrives, type how many pairs came in and press Add stock — it is saved as a restock. For damaged pairs, returns or count fixes, use the Inventory tab.'
      : undefined,
  }
}

// item_costs is one-to-one with items, so PostgREST embeds it as an object
// (typed as an array by the client); accept either.
function embeddedCost(value: unknown): number {
  const row = (Array.isArray(value) ? value[0] : value) as { cost_price?: number } | null | undefined
  return Number(row?.cost_price ?? 0)
}

interface ProfitLine {
  name: string
  units: number
  revenue: number
  cost: number
}

async function profitDetail(): Promise<Detail> {
  const monthStart = startOfMonthISO()
  const [soldRes, itemsRes, onlineOrdersRes] = await Promise.all([
    supabase.from('sold_items_detail').select('item_id, item_name, quantity, line_total').gte('sale_date', monthStart),
    supabase.from('items').select('id, name, item_costs(cost_price)'),
    supabase.from('online_orders').select('id').in('status', ['paid', 'fulfilled']).gte('paid_at', monthStart),
  ])
  if (soldRes.error) throw soldRes.error
  if (itemsRes.error) throw itemsRes.error
  if (onlineOrdersRes.error) throw onlineOrdersRes.error

  const items = new Map(
    (itemsRes.data ?? []).map((i) => [
      i.id as string,
      { name: i.name as string, cost: embeddedCost(i.item_costs) },
    ]),
  )
  const orderIds = (onlineOrdersRes.data ?? []).map((o) => o.id as string)
  let onlineLines: { item_id: string; quantity: number; line_total: number }[] = []
  if (orderIds.length) {
    const { data, error } = await supabase.from('online_order_items').select('item_id, quantity, line_total').in('order_id', orderIds)
    if (error) throw error
    onlineLines = (data ?? []) as typeof onlineLines
  }

  const byItem = new Map<string, ProfitLine>()
  const add = (itemId: string, name: string, qty: number, lineTotal: number) => {
    const row = byItem.get(itemId) ?? { name, units: 0, revenue: 0, cost: 0 }
    row.units += qty
    row.revenue += Number(lineTotal)
    row.cost += (items.get(itemId)?.cost ?? 0) * qty
    byItem.set(itemId, row)
  }
  for (const r of soldRes.data ?? []) add(r.item_id, r.item_name, r.quantity, r.line_total)
  for (const r of onlineLines) add(r.item_id, items.get(r.item_id)?.name ?? 'Unknown product', r.quantity, r.line_total)

  const lines = [...byItem.entries()].sort((a, b) => b[1].revenue - b[1].cost - (a[1].revenue - a[1].cost))
  const revenue = lines.reduce((s, [, l]) => s + l.revenue, 0)
  const cost = lines.reduce((s, [, l]) => s + l.cost, 0)
  const missingCost = lines.filter(([id]) => !(items.get(id)?.cost ?? 0)).length

  return {
    summary: [
      { label: 'Item revenue', value: <Money amount={revenue} /> },
      { label: 'Cost of goods', value: <Money amount={cost} /> },
      { label: 'Gross profit', value: <Money amount={revenue - cost} />, tone: revenue - cost >= 0 ? 'ok' : 'alert' },
      { label: 'Margin', value: `${revenue > 0 ? (((revenue - cost) / revenue) * 100).toFixed(1) : '0.0'}%` },
    ],
    table: {
      columns: ['Product', 'Units', 'Revenue', 'Cost', 'Profit'],
      rows: lines.map(([, l]) => [
        <strong>{l.name}</strong>,
        l.units,
        <Money amount={l.revenue} />,
        <Money amount={l.cost} />,
        <Money amount={l.revenue - l.cost} />,
      ]),
      empty: 'No items sold yet this month.',
    },
    note: missingCost
      ? `${missingCost} product${missingCost === 1 ? '' : 's'} sold this month ha${missingCost === 1 ? 's' : 've'} no cost price set, so their profit shows as the full sale price.`
      : undefined,
  }
}

async function stockDetail(): Promise<Detail> {
  const [invRes, itemsRes] = await Promise.all([
    supabase.from('inventory_detail').select('item_id, item_name, quantity_on_hand'),
    supabase.from('item_costs').select('item_id, cost_price'),
  ])
  if (invRes.error) throw invRes.error
  if (itemsRes.error) throw itemsRes.error
  const costs = new Map((itemsRes.data ?? []).map((c) => [c.item_id as string, Number(c.cost_price)]))
  const byItem = new Map<string, { name: string; units: number; value: number }>()
  for (const r of invRes.data ?? []) {
    const row = byItem.get(r.item_id) ?? { name: r.item_name, units: 0, value: 0 }
    row.units += r.quantity_on_hand
    row.value += r.quantity_on_hand * (costs.get(r.item_id) ?? 0)
    byItem.set(r.item_id, row)
  }
  const lines = [...byItem.entries()].sort((a, b) => b[1].value - a[1].value || b[1].units - a[1].units)
  const units = lines.reduce((s, [, l]) => s + l.units, 0)
  const value = lines.reduce((s, [, l]) => s + l.value, 0)
  const missingCost = lines.filter(([id, l]) => l.units > 0 && !(costs.get(id) ?? 0)).length
  return {
    summary: [
      { label: 'Stock value (cost)', value: <Money amount={value} /> },
      { label: 'Units on hand', value: units.toLocaleString() },
      { label: 'Products stocked', value: lines.filter(([, l]) => l.units > 0).length },
    ],
    table: {
      columns: ['Product', 'Units', 'Cost each', 'Value'],
      rows: lines.map(([id, l]) => [
        <strong>{l.name}</strong>,
        l.units,
        costs.get(id) ? <Money amount={costs.get(id) ?? 0} /> : <Pill tone="alert">Not set</Pill>,
        <Money amount={l.value} />,
      ]),
      empty: 'No inventory yet.',
    },
    note: missingCost
      ? `${missingCost} stocked product${missingCost === 1 ? ' has' : 's have'} no cost price, so ${missingCost === 1 ? 'it counts' : 'they count'} as ₱0 here.`
      : undefined,
  }
}

interface LoaderContext {
  // Reloads the popup (and the dashboard behind it); the message is shown as
  // a confirmation banner so the row disappearing isn't a mystery.
  refresh: (message?: string) => void
}

// Inline "+N" restock for one SKU — same adjust_stock RPC the Inventory tab
// uses, logged as a 'restock' movement.
function RestockCell({ sku, label, suggested, onDone }: { sku: string; label: string; suggested: number; onDone: (message?: string) => void }) {
  const [qty, setQty] = useState(String(suggested))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const change = Math.floor(Number(qty))
    if (!(change > 0)) return setError('Enter a number above 0')
    setSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('adjust_stock', {
      p_sku: sku,
      p_quantity_change: change,
      p_type: 'restock',
      p_reason: 'Restocked from dashboard low-stock alert',
    })
    setSaving(false)
    if (rpcError) return setError(rpcError.message)
    onDone(`Added ${change} ${change === 1 ? 'pair' : 'pairs'} to ${label}.`)
  }

  return (
    <div className="rk-restock">
      <input
        type="number"
        min={1}
        step={1}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        aria-label={`Pairs to add for ${label}`}
        disabled={saving}
      />
      <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={submit} disabled={saving}>
        {saving ? 'Adding…' : 'Add stock'}
      </button>
      {error && <span className="rk-restock-error">{error}</span>}
    </div>
  )
}

const loaders: Record<KpiKey, (ctx: LoaderContext) => Promise<Detail>> = {
  today: () => ordersDetail(startOfTodayISO()),
  month: () => ordersDetail(startOfMonthISO()),
  customers: customersDetail,
  products: productsDetail,
  lowstock: lowStockDetail,
  profit: profitDetail,
  stock: stockDetail,
}

// The popup itself is the shared <Modal>; these styles cover what's inside it.
export const kpiDetailStyles = `
  .rk-kpi-detail .rk-ui-stats { grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); }
  .rk-kpi-detail .rk-ui-stat-value { font-size: 1.5rem; }
  .rk-kpi-detail .rk-admin-table td,
  .rk-kpi-detail .rk-admin-table th {
    white-space: nowrap;
  }
  .rk-kpi-loading { font-size: 0.875rem; color: var(--text-muted); padding: 1.5rem 0; text-align: center; }
  .rk-restock {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }
  .rk-restock input {
    width: 4.5rem;
    padding: 0.45rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.8125rem;
  }
  .rk-restock input:focus { outline: none; border-color: var(--text-muted); }
  .rk-restock-error {
    flex-basis: 100%;
    font-size: 0.75rem;
    color: var(--accent-red);
    white-space: normal;
  }
`

export function KpiDetailModal({ kpi, onClose, onChanged }: { kpi: KpiKey; onClose: () => void; onChanged?: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped after an edit inside the popup (a restock) to reload it in place.
  const [version, setVersion] = useState(0)
  // Confirmation after an edit (e.g. "Added 6 pairs to …").
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    setDetail(null)
    setFlash(null)
  }, [kpi])

  useEffect(() => {
    let cancelled = false
    setError(null)
    const refresh = (message?: string) => {
      if (message) setFlash(message)
      setVersion((v) => v + 1)
      onChanged?.()
    }
    loaders[kpi]({ refresh })
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load.')
      })
    return () => {
      cancelled = true
    }
    // onChanged is a fresh closure each parent render; reload only on kpi/version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi, version])

  const { title, desc } = titles[kpi]

  // The shared Modal portals to <body> (the admin panels use transforms /
  // overflow that would otherwise trap a position: fixed popup), closes on
  // Esc / backdrop click and locks page scroll while open.
  return (
    <Modal
      title={title}
      subtitle={desc}
      onClose={onClose}
      width={56}
      footer={
        <button type="button" className="rk-ui-btn rk-ui-btn-lg" onClick={onClose}>
          Close
        </button>
      }
    >
      <style>{kpiDetailStyles}</style>
      <div className="rk-kpi-detail">
        {flash && (
          <Notice tone="ok" onDismiss={() => setFlash(null)}>
            {flash}
          </Notice>
        )}
        {error ? (
          <Notice tone="alert">Couldn't load details: {error}</Notice>
        ) : !detail ? (
          <p className="rk-kpi-loading">Loading…</p>
        ) : (
          <>
            <StatGrid>
              {detail.summary.map((s) => (
                <StatTile key={s.label} label={s.label} value={s.value} tone={s.tone ?? 'neutral'} />
              ))}
            </StatGrid>
            {detail.note && <Notice tone="info">{detail.note}</Notice>}
            {detail.table.rows.length === 0 ? (
              <EmptyState title={detail.table.empty} />
            ) : (
              <div className="rk-admin-table-wrap">
                <table className="rk-admin-table">
                  <thead>
                    <tr>{detail.table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {detail.table.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
