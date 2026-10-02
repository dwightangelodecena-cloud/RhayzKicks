import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { formatPeso } from '../../data/catalog'
import { Money, formatCompactPeso } from './Money'
import {
  IconAlertTriangle,
  IconChartBar,
  IconClock,
  IconLayers,
  IconMedal,
  IconPackageCheck,
  IconPercent,
  IconReceipt,
  IconRefresh,
  IconTags,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from './adminIcons'
import { EmptyState, Notice, Pill, SectionHead, StatGrid, StatTile } from './adminUi'
import type { Tone } from './adminUi'
import { KpiDetailModal, kpiDetailStyles } from './AdminKpiDetails'
import type { KpiKey } from './AdminKpiDetails'

interface SaleRow {
  total: number
  sale_date: string
  status: string
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string | null
  staff_name: string | null // null for online orders
  channel: 'In-store' | 'Online'
  total: number
  status: string
  payment_method: string
  sale_date: string
}

interface LowStockRow {
  sku: string
  item_name: string
  size: string
  color: string
  quantity_on_hand: number
  reorder_level: number
}

interface SoldItemRow {
  item_id: string
  item_name: string
  quantity: number
  line_total: number
}

interface ItemCostRow {
  id: string
  item_costs: { cost_price: number } | { cost_price: number }[] | null
  brand: string
}

interface InventoryValRow {
  sku: string
  quantity_on_hand: number
  item_id: string
}

interface ShiftRow {
  staff_name: string
  clock_in: string
  duration_hours: number | null
}

interface Stats {
  todayRevenue: number
  todayOrders: number
  monthRevenue: number
  monthOrders: number
  activeCustomers: number
  activeProducts: number
  lowStockCount: number
  grossProfit: number
  grossMargin: number
  stockValue: number
}

interface WeekCompare {
  thisWeekRevenue: number
  thisWeekOrders: number
  lastWeekRevenue: number
  lastWeekOrders: number
}

interface TrendDay {
  key: string
  label: string
  total: number
}

interface RankedRow {
  name: string
  value: number
}

interface StatusCounts {
  completed: number
  pending: number
  refunded: number
  cancelled: number
}

// Rounds up to a tidy axis value: 12,069 → 15,000; 3,400 → 4,000; 0 → 1,000.
function niceCeil(n: number) {
  if (n <= 0) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(n))
  const step = n / magnitude <= 2 ? magnitude / 4 : magnitude / 2
  return Math.ceil(n / step) * step
}

function startOfTodayLocal() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonthLocal() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfTodayISO() {
  return startOfTodayLocal().toISOString()
}

function startOfMonthISO() {
  return startOfMonthLocal().toISOString()
}

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastNDays(n: number): Date[] {
  const today = startOfTodayLocal()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (n - 1 - i))
    return d
  })
}

function startOfWeekLocal() {
  const d = new Date()
  const dayIndex = (d.getDay() + 6) % 7 // days since Monday
  d.setDate(d.getDate() - dayIndex)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStock, setLowStock] = useState<LowStockRow[]>([])
  const [trend, setTrend] = useState<TrendDay[]>([])
  const [topProducts, setTopProducts] = useState<RankedRow[]>([])
  const [topBrands, setTopBrands] = useState<RankedRow[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ completed: 0, pending: 0, refunded: 0, cancelled: 0 })
  const [weekCompare, setWeekCompare] = useState<WeekCompare | null>(null)
  const [hoursThisWeek, setHoursThisWeek] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null)
  // Bumped after a restock from the Low Stock popup so the cards refresh.
  const [reloadKey, setReloadKey] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const monthStart = startOfMonthISO()
      const todayStart = startOfTodayISO()
      const days = lastNDays(7)
      const fourteenDays = lastNDays(14)
      const trendStart = [days[0].toISOString(), fourteenDays[0].toISOString(), monthStart].sort()[0]

      const [
        salesRes,
        customersRes,
        productsRes,
        lowStockCountRes,
        recentOrdersRes,
        lowStockListRes,
        soldItemsRes,
        monthStatusRes,
        itemCostsRes,
        inventoryValRes,
        shiftsRes,
        onlineOrdersRes,
        recentOnlineRes,
        monthOnlineStatusRes,
      ] = await Promise.all([
        supabase.from('sales').select('total, sale_date, status').gte('sale_date', trendStart).eq('status', 'completed'),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // inventory_detail skips archived products (024), so they never count as low stock.
        supabase.from('inventory_detail').select('sku', { count: 'exact', head: true }).eq('is_low_stock', true),
        supabase.from('sales_detail').select('*').order('sale_date', { ascending: false }).limit(6),
        supabase.from('inventory_detail').select('*').eq('is_low_stock', true).order('quantity_on_hand', { ascending: true }).limit(6),
        supabase.from('sold_items_detail').select('item_id, item_name, quantity, line_total').gte('sale_date', monthStart),
        supabase.from('sales').select('status').gte('sale_date', monthStart),
        supabase.from('items').select('id, brand, item_costs(cost_price)'),
        supabase.from('inventory_detail').select('sku, quantity_on_hand, item_id'),
        supabase.from('staff_shifts_detail').select('staff_name, clock_in, duration_hours').gte('clock_in', startOfWeekLocal().toISOString()),
        // Paid online orders count toward revenue too — same shape as a sale row.
        supabase.from('online_orders').select('id, total, paid_at').in('status', ['paid', 'fulfilled']).gte('paid_at', trendStart),
        supabase
          .from('online_orders')
          .select('id, order_number, total, status, payment_method, created_at, paid_at, customers(full_name)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('online_orders').select('status').gte('created_at', monthStart),
      ])

      if (cancelled) return

      const firstError =
        salesRes.error ||
        customersRes.error ||
        productsRes.error ||
        lowStockCountRes.error ||
        recentOrdersRes.error ||
        lowStockListRes.error ||
        soldItemsRes.error ||
        monthStatusRes.error ||
        itemCostsRes.error ||
        inventoryValRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      const onlineRows = (onlineOrdersRes.error ? [] : onlineOrdersRes.data ?? []) as { id: string; total: number; paid_at: string }[]
      const salesRows = [
        ...((salesRes.data ?? []) as SaleRow[]),
        ...onlineRows.map((o) => ({ total: Number(o.total), sale_date: o.paid_at, status: 'completed' })),
      ]

      // Online order items this month, for gross profit / top products / brands.
      const monthOnlineIds = onlineRows.filter((o) => o.paid_at >= monthStart).map((o) => o.id)
      const onlineItemsRes = monthOnlineIds.length
        ? await supabase.from('online_order_items').select('item_id, quantity, line_total, items(name)').in('order_id', monthOnlineIds)
        : { data: [], error: null }
      if (cancelled) return
      const onlineSoldRows: SoldItemRow[] = (onlineItemsRes.error ? [] : onlineItemsRes.data ?? []).map((r) => ({
        item_id: r.item_id as string,
        item_name: ((r.items as unknown as { name: string } | null)?.name ?? 'Unknown product') as string,
        quantity: r.quantity as number,
        line_total: Number(r.line_total),
      }))
      const monthRows = salesRows.filter((r) => r.sale_date >= monthStart)
      const monthRevenue = monthRows.reduce((sum, r) => sum + Number(r.total), 0)
      const todayRows = salesRows.filter((r) => r.sale_date >= todayStart)
      const todayRevenue = todayRows.reduce((sum, r) => sum + Number(r.total), 0)

      const thisWeekStartISO = days[0].toISOString()
      const lastWeekStart = new Date(days[0])
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekStartISO = lastWeekStart.toISOString()
      const thisWeekRows = salesRows.filter((r) => r.sale_date >= thisWeekStartISO)
      const lastWeekRows = salesRows.filter((r) => r.sale_date >= lastWeekStartISO && r.sale_date < thisWeekStartISO)
      setWeekCompare({
        thisWeekRevenue: thisWeekRows.reduce((sum, r) => sum + Number(r.total), 0),
        thisWeekOrders: thisWeekRows.length,
        lastWeekRevenue: lastWeekRows.reduce((sum, r) => sum + Number(r.total), 0),
        lastWeekOrders: lastWeekRows.length,
      })

      const costByItemId = new Map<string, number>()
      const brandByItemId = new Map<string, string>()
      for (const item of (itemCostsRes.data ?? []) as unknown as ItemCostRow[]) {
        // One-to-one embed: PostgREST returns an object, but tolerate an array.
        const cost = Array.isArray(item.item_costs) ? item.item_costs[0] : item.item_costs
        costByItemId.set(item.id, Number(cost?.cost_price ?? 0))
        brandByItemId.set(item.id, item.brand)
      }

      let grossRevenue = 0
      let grossCost = 0
      const productTotals = new Map<string, number>()
      const brandTotals = new Map<string, number>()
      for (const row of [...((soldItemsRes.data ?? []) as SoldItemRow[]), ...onlineSoldRows]) {
        const lineTotal = Number(row.line_total)
        grossRevenue += lineTotal
        grossCost += (costByItemId.get(row.item_id) ?? 0) * row.quantity
        productTotals.set(row.item_name, (productTotals.get(row.item_name) ?? 0) + row.quantity)
        const brand = brandByItemId.get(row.item_id) ?? 'Other'
        brandTotals.set(brand, (brandTotals.get(brand) ?? 0) + row.quantity)
      }
      const grossProfit = grossRevenue - grossCost
      const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0

      const stockValue = ((inventoryValRes.data ?? []) as InventoryValRow[]).reduce(
        (sum, row) => sum + row.quantity_on_hand * (costByItemId.get(row.item_id) ?? 0),
        0,
      )

      setStats({
        todayRevenue,
        todayOrders: todayRows.length,
        monthRevenue,
        monthOrders: monthRows.length,
        activeCustomers: customersRes.count ?? 0,
        activeProducts: productsRes.count ?? 0,
        lowStockCount: lowStockCountRes.count ?? 0,
        grossProfit,
        grossMargin,
        stockValue,
      })
      // In-store sales and online orders, newest first.
      const recentInStore: RecentOrder[] = ((recentOrdersRes.data ?? []) as Omit<RecentOrder, 'channel'>[]).map((o) => ({
        ...o,
        channel: 'In-store',
      }))
      const recentOnline: RecentOrder[] = (recentOnlineRes.error ? [] : recentOnlineRes.data ?? []).map((o) => ({
        id: o.id as string,
        order_number: o.order_number as string,
        customer_name: (o.customers as unknown as { full_name: string } | null)?.full_name || null,
        staff_name: null,
        channel: 'Online',
        total: Number(o.total),
        status: o.status as string,
        payment_method: (o.payment_method as string | null) ?? '—',
        sale_date: ((o.paid_at as string | null) ?? (o.created_at as string)) as string,
      }))
      setRecentOrders([...recentInStore, ...recentOnline].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 6))
      setLowStock((lowStockListRes.data ?? []) as LowStockRow[])
      setTopProducts(
        [...productTotals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      )
      setTopBrands(
        [...brandTotals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      )

      const dayTotals = new Map(days.map((d) => [localDateKey(d), 0]))
      for (const row of salesRows) {
        const key = localDateKey(new Date(row.sale_date))
        if (dayTotals.has(key)) dayTotals.set(key, (dayTotals.get(key) ?? 0) + Number(row.total))
      }
      setTrend(
        days.map((d) => ({
          key: localDateKey(d),
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          total: dayTotals.get(localDateKey(d)) ?? 0,
        })),
      )

      // staff_shifts only exists once 005_staff_time_tracking.sql has been run — tolerate its
      // absence (an empty widget) instead of failing the whole dashboard.
      const hoursTotals = new Map<string, number>()
      if (!shiftsRes.error) {
        for (const row of (shiftsRes.data ?? []) as ShiftRow[]) {
          if (row.duration_hours != null) hoursTotals.set(row.staff_name, (hoursTotals.get(row.staff_name) ?? 0) + row.duration_hours)
        }
      }
      setHoursThisWeek(
        [...hoursTotals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      )

      const counts: StatusCounts = { completed: 0, pending: 0, refunded: 0, cancelled: 0 }
      for (const row of (monthStatusRes.data ?? []) as { status: string }[]) {
        if (row.status === 'completed') counts.completed += 1
        else if (row.status === 'refunded') counts.refunded += 1
        else if (row.status === 'voided') counts.cancelled += 1
      }
      for (const row of (monthOnlineStatusRes.error ? [] : monthOnlineStatusRes.data ?? []) as { status: string }[]) {
        if (row.status === 'paid' || row.status === 'fulfilled') counts.completed += 1
        else if (row.status === 'pending') counts.pending += 1
        else if (row.status === 'cancelled') counts.cancelled += 1
      }
      setStatusCounts(counts)

      setUpdatedAt(new Date())
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Scale tops out at a rounded value with ~15% headroom above the best day,
  // so the tallest bar never touches the ceiling and its label has room.
  const trendRealMax = Math.max(...trend.map((t) => t.total), 0)
  const trendScaleMax = niceCeil(trendRealMax * 1.15)
  const trendWeekTotal = trend.reduce((sum, t) => sum + t.total, 0)
  const trendBestDay = trend.reduce<TrendDay | null>((best, t) => (t.total > (best?.total ?? 0) ? t : best), null)

  const statusTotal = statusCounts.completed + statusCounts.pending + statusCounts.refunded + statusCounts.cancelled

  const closeKpi = useCallback(() => setOpenKpi(null), [])
  const refresh = () => setReloadKey((k) => k + 1)

  const lowStockCount = stats?.lowStockCount ?? 0
  const now = new Date()

  return (
    <div className="rk-ov">
      <style>{adminCardStyles}</style>
      <style>{kpiDetailStyles}</style>
      <style>{overviewStyles}</style>

      {/* ---- greeting ---- */}
      <div className="rk-ov-hello">
        <div>
          <div className="rk-ov-hello-title">{greeting(now.getHours())}</div>
          <div className="rk-ov-hello-date">
            {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {updatedAt && !loading && <> · Updated {updatedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</>}
          </div>
        </div>
        <button type="button" className="rk-ui-btn" onClick={refresh} disabled={loading}>
          <IconRefresh size={14} /> {loading ? 'Loading…' : 'Refresh numbers'}
        </button>
      </div>

      {error && (
        <Notice tone="alert">
          Couldn't load the dashboard: {error}{' '}
          <button type="button" className="rk-ui-btn" style={{ marginLeft: '0.5rem' }} onClick={refresh}>
            Try again
          </button>
        </Notice>
      )}

      {/* ---- what needs attention ---- */}
      {!error && !loading && stats && (
        <div className="rk-ov-attention">
          {lowStockCount > 0 && (
            <div className="rk-ov-attn rk-ov-attn-alert">
              <IconAlertTriangle size={16} />
              <span className="rk-ov-attn-text">
                <b>{lowStockCount} size{lowStockCount === 1 ? ' is' : 's are'} running low</b> — at or below the reorder level.
              </span>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setOpenKpi('lowstock')}>
                Restock now
              </button>
            </div>
          )}
          {statusCounts.pending > 0 && (
            <div className="rk-ov-attn rk-ov-attn-info">
              <IconClock size={16} />
              <span className="rk-ov-attn-text">
                <b>{statusCounts.pending} online order{statusCounts.pending === 1 ? ' is' : 's are'} awaiting payment</b> this month. Track them in the Delivery tab.
              </span>
            </div>
          )}
          {lowStockCount === 0 && statusCounts.pending === 0 && (
            <div className="rk-ov-attn rk-ov-attn-ok">
              <IconPackageCheck size={16} />
              <span className="rk-ov-attn-text">
                <b>Nothing urgent.</b> Stock levels are fine and no online orders are waiting for payment.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ---- headline numbers ---- */}
      {!error && (
        <section className="rk-ov-section">
          <div className="rk-ov-section-head">
            <h2 className="rk-ov-section-title">Money</h2>
            <span className="rk-ov-section-hint">Tap any box for the full breakdown</span>
          </div>
          <StatGrid>
            <StatTile
              label="Sales today"
              icon={<IconWallet size={16} />}
              value={loading ? '—' : <Money amount={stats?.todayRevenue ?? 0} />}
              sub={<KpiSub text={loading ? '' : plural(stats?.todayOrders ?? 0, 'order')} />}
              onClick={() => setOpenKpi('today')}
            />
            <StatTile
              label="Sales this month"
              icon={<IconTrendUp size={16} />}
              value={loading ? '—' : <Money amount={stats?.monthRevenue ?? 0} />}
              sub={<KpiSub text={loading ? '' : `${plural(stats?.monthOrders ?? 0, 'order')} since the 1st`} />}
              onClick={() => setOpenKpi('month')}
            />
            <StatTile
              label="Profit this month"
              icon={<IconPercent size={16} />}
              tone={!loading && (stats?.grossProfit ?? 0) < 0 ? 'alert' : 'neutral'}
              value={loading ? '—' : <Money amount={stats?.grossProfit ?? 0} />}
              sub={<KpiSub text={loading ? '' : `${(stats?.grossMargin ?? 0).toFixed(1)}% margin, after item cost`} />}
              onClick={() => setOpenKpi('profit')}
            />
            <StatTile
              label="Stock value"
              icon={<IconLayers size={16} />}
              value={loading ? '—' : <Money amount={stats?.stockValue ?? 0} compact />}
              sub={<KpiSub text="What your stock cost you" />}
              onClick={() => setOpenKpi('stock')}
            />
          </StatGrid>

          <div className="rk-ov-section-head">
            <h2 className="rk-ov-section-title">Store</h2>
          </div>
          <StatGrid>
            <StatTile
              label="Low on stock"
              icon={<IconAlertTriangle size={16} />}
              tone={loading ? 'neutral' : lowStockCount > 0 ? 'alert' : 'ok'}
              value={loading ? '—' : lowStockCount}
              sub={<KpiSub text={loading ? '' : lowStockCount > 0 ? 'Sizes to reorder — tap to restock' : 'Every size is well stocked'} />}
              onClick={() => setOpenKpi('lowstock')}
            />
            <StatTile
              label="Customers"
              icon={<IconUsers size={16} />}
              value={loading ? '—' : stats?.activeCustomers ?? 0}
              sub={<KpiSub text="Online members & walk-ins" />}
              onClick={() => setOpenKpi('customers')}
            />
            <StatTile
              label="Products on the store"
              icon={<IconPackageCheck size={16} />}
              value={loading ? '—' : stats?.activeProducts ?? 0}
              sub={<KpiSub text="Showing on the website" />}
              onClick={() => setOpenKpi('products')}
            />
          </StatGrid>
        </section>
      )}

      {openKpi && <KpiDetailModal kpi={openKpi} onClose={closeKpi} onChanged={refresh} />}

      {/* ---- sales ---- */}
      {!error && (
        <section className="rk-ov-section">
          <div className="rk-ov-section-head">
            <h2 className="rk-ov-section-title">Sales</h2>
            <span className="rk-ov-section-hint">In-store sales and paid online orders</span>
          </div>
          <div className="rk-ov-grid">
            <div className="rk-admin-card rk-ov-span-2">
              <SectionHead icon={<IconChartBar />} title="Last 7 Days" desc="How much you sold each day. Today is in red." />
              {loading ? (
                <p className="rk-admin-empty">Loading…</p>
              ) : (
                <>
                  <div className="rk-trend-summary">
                    <div>
                      <div className="rk-trend-summary-label">7-day total</div>
                      <div className="rk-trend-summary-value"><Money amount={trendWeekTotal} /></div>
                    </div>
                    {trendBestDay && (
                      <div>
                        <div className="rk-trend-summary-label">Best day</div>
                        <div className="rk-trend-summary-value">
                          {trendBestDay.label} · <Money amount={trendBestDay.total} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rk-trend" role="img" aria-label="Revenue for the last 7 days">
                    <div className="rk-trend-axis">
                      {[trendScaleMax, trendScaleMax / 2, 0].map((v) => (
                        <span key={v}>{formatCompactPeso(v)}</span>
                      ))}
                    </div>
                    <div className="rk-trend-plot">
                      <div className="rk-trend-grid">
                        <span /><span /><span />
                      </div>
                      {trendRealMax === 0 && <div className="rk-trend-empty">No sales in the last 7 days yet — ring one up in the Sales tab</div>}
                      {trend.map((day, i) => {
                        const isToday = i === trend.length - 1
                        const pct = (day.total / trendScaleMax) * 100
                        return (
                          <div key={day.key} className="rk-trend-col" title={`${day.label}: ${formatPeso(day.total)}`}>
                            <div className="rk-trend-bar-area">
                              {day.total > 0 && <span className="rk-trend-value">{formatCompactPeso(day.total)}</span>}
                              <div
                                className={`rk-trend-bar ${isToday ? 'rk-trend-bar-today' : ''} ${day.total > 0 ? '' : 'rk-trend-bar-empty'}`}
                                style={day.total > 0 ? { height: `max(${pct}%, 6px)` } : undefined}
                              />
                            </div>
                            <span className={`rk-trend-day ${isToday ? 'rk-trend-day-today' : ''}`}>{isToday ? 'Today' : day.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rk-ov-stack">
              <div className="rk-admin-card">
                <SectionHead icon={<IconTrendUp />} title="This Week vs. Last" desc="Last 7 days compared with the 7 days before." />
                {loading || !weekCompare ? (
                  <p className="rk-admin-empty">Loading…</p>
                ) : (
                  <WeekCompareBody w={weekCompare} />
                )}
              </div>

              <div className="rk-admin-card">
                <SectionHead icon={<IconReceipt />} title="Order Results" desc="What happened to this month's orders." />
                {loading ? (
                  <p className="rk-admin-empty">Loading…</p>
                ) : statusTotal === 0 ? (
                  <EmptyState title="No orders yet this month" hint="They'll show up here as soon as you make a sale." />
                ) : (
                  <>
                    <div className="rk-stack-bar" role="img" aria-label={`${statusCounts.completed} completed, ${statusCounts.pending} awaiting payment, ${statusCounts.refunded} refunded, ${statusCounts.cancelled} voided or cancelled`}>
                      <div className="rk-stack-seg rk-stack-ok" style={{ width: `${(statusCounts.completed / statusTotal) * 100}%` }} />
                      <div className="rk-stack-seg rk-stack-pending" style={{ width: `${(statusCounts.pending / statusTotal) * 100}%` }} />
                      <div className="rk-stack-seg rk-stack-warn" style={{ width: `${(statusCounts.refunded / statusTotal) * 100}%` }} />
                      <div className="rk-stack-seg rk-stack-off" style={{ width: `${(statusCounts.cancelled / statusTotal) * 100}%` }} />
                    </div>
                    <div className="rk-stack-legend">
                      <div className="rk-stack-legend-item">
                        <span className="rk-stack-dot rk-stack-ok" />
                        Completed <b>{statusCounts.completed}</b>
                      </div>
                      <div className="rk-stack-legend-item">
                        <span className="rk-stack-dot rk-stack-pending" />
                        Awaiting payment <b>{statusCounts.pending}</b>
                      </div>
                      <div className="rk-stack-legend-item">
                        <span className="rk-stack-dot rk-stack-warn" />
                        Refunded <b>{statusCounts.refunded}</b>
                      </div>
                      <div className="rk-stack-legend-item">
                        <span className="rk-stack-dot rk-stack-off" />
                        Voided / cancelled <b>{statusCounts.cancelled}</b>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---- orders & stock ---- */}
      {!error && (
        <section className="rk-ov-section">
          <div className="rk-ov-section-head">
            <h2 className="rk-ov-section-title">Orders &amp; Stock</h2>
          </div>
          <div className="rk-ov-grid">
            <div className="rk-admin-card rk-ov-span-2">
              <SectionHead icon={<IconReceipt />} title="Latest Orders" desc="The 6 newest in-store sales and online orders." />
              {loading ? (
                <p className="rk-admin-empty">Loading…</p>
              ) : recentOrders.length === 0 ? (
                <EmptyState title="No orders yet" hint="Ring up a sale in the Sales tab — online orders will show up here too." />
              ) : (
                <div className="rk-ui-list">
                  {recentOrders.map((o) => {
                    const s = orderStatus(o.status)
                    return (
                      <div key={`${o.channel}-${o.id}`} className="rk-ui-list-row">
                        <div className="rk-ui-list-main">
                          <div className="rk-ui-list-title">
                            {o.customer_name ?? (o.channel === 'Online' ? 'Customer' : 'Walk-in')}
                            <span className="rk-ov-order-no">{o.order_number}</span>
                          </div>
                          <div className="rk-ui-list-meta">
                            {o.channel === 'In-store' && o.staff_name ? `In-store · ${o.staff_name}` : o.channel} · {fmtWhen(o.sale_date)}
                          </div>
                        </div>
                        <div className="rk-ui-list-side">
                          <span className="rk-ov-order-total"><Money amount={Number(o.total)} /></span>
                          <Pill tone={s.tone}>{s.label}</Pill>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rk-admin-card rk-ov-side-full">
              <SectionHead
                icon={<IconAlertTriangle />}
                title="Running Low"
                desc="Sizes at or below their reorder level."
                actions={
                  lowStock.length > 0 ? (
                    <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setOpenKpi('lowstock')}>
                      Restock
                    </button>
                  ) : undefined
                }
              />
              {loading ? (
                <p className="rk-admin-empty">Loading…</p>
              ) : lowStock.length === 0 ? (
                <EmptyState title="Everything's well stocked" hint="Nothing is at or below its reorder level right now." />
              ) : (
                <>
                  <div className="rk-ui-list">
                    {lowStock.map((row) => {
                      const out = row.quantity_on_hand <= 0
                      return (
                        <div key={row.sku} className={`rk-ui-list-row ${out ? 'rk-ui-list-row-alert' : 'rk-ui-list-row-warn'}`}>
                          <div className="rk-ui-list-main">
                            <div className="rk-ui-list-title rk-ov-clip">{row.item_name}</div>
                            <div className="rk-ui-list-meta">
                              {[row.color, row.size && `Size ${row.size}`].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <div className="rk-ov-qty">
                            <Pill tone={out ? 'alert' : 'warn'}>{out ? 'Out of stock' : `${row.quantity_on_hand} left`}</Pill>
                            <span className="rk-ov-qty-sub">reorder at {row.reorder_level}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {stats && stats.lowStockCount > lowStock.length && (
                    <button type="button" className="rk-ui-btn rk-ui-btn-ghost rk-ov-see-all" onClick={() => setOpenKpi('lowstock')}>
                      See all {stats.lowStockCount} low-stock sizes →
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---- best sellers & team ---- */}
      {!error && (
        <section className="rk-ov-section">
          <div className="rk-ov-section-head">
            <h2 className="rk-ov-section-title">Best Sellers &amp; Team</h2>
          </div>
          <div className="rk-ov-grid rk-ov-trio">
            <div className="rk-admin-card">
              <SectionHead icon={<IconMedal />} title="Top Products" desc="Most units sold this month." />
              <RankList
                loading={loading}
                rows={topProducts}
                format={(v) => `${v} sold`}
                empty={<EmptyState title="No sales yet this month" hint="Ring one up in the Sales tab." />}
              />
            </div>
            <div className="rk-admin-card">
              <SectionHead icon={<IconTags />} title="Top Brands" desc="Most units sold this month, by brand." />
              <RankList
                loading={loading}
                rows={topBrands}
                format={(v) => `${v} sold`}
                empty={<EmptyState title="No sales yet this month" hint="Brands appear once products start selling." />}
              />
            </div>
            <div className="rk-admin-card">
              <SectionHead icon={<IconClock />} title="Hours This Week" desc="Time each staff member worked, Monday to today." />
              <RankList
                loading={loading}
                rows={hoursThisWeek}
                format={(v) => `${v.toFixed(1)} hrs`}
                empty={<EmptyState title="No shifts logged this week" hint="Hours show up once staff clock in and out from their My Hours tab." />}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ---- small pieces ----

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// One status vocabulary for in-store sales and online orders.
const statusMap: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'ok' },
  paid: { label: 'Paid', tone: 'ok' },
  fulfilled: { label: 'Fulfilled', tone: 'ok' },
  pending: { label: 'Awaiting payment', tone: 'info' },
  refunded: { label: 'Refunded', tone: 'warn' },
  voided: { label: 'Voided', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

function orderStatus(status: string) {
  return statusMap[status] ?? { label: status, tone: 'neutral' as Tone }
}

function KpiSub({ text }: { text: string }) {
  return (
    <>
      {text}
      <span className="rk-ov-more">
        See details <span aria-hidden="true">→</span>
      </span>
    </>
  )
}

function WeekCompareBody({ w }: { w: WeekCompare }) {
  const diff = w.thisWeekRevenue - w.lastWeekRevenue
  const pct = w.lastWeekRevenue > 0 ? (diff / w.lastWeekRevenue) * 100 : diff > 0 ? 100 : 0
  const max = Math.max(w.thisWeekRevenue, w.lastWeekRevenue, 1)
  const verdict =
    diff === 0 ? (
      <Pill>Same as last week</Pill>
    ) : w.lastWeekRevenue === 0 ? (
      <Pill tone="ok">Up — no sales the week before</Pill>
    ) : diff > 0 ? (
      <Pill tone="ok">▲ Up {Math.abs(pct).toFixed(1)}%</Pill>
    ) : (
      <Pill tone="alert">▼ Down {Math.abs(pct).toFixed(1)}%</Pill>
    )
  return (
    <div className="rk-ov-week">
      <div className="rk-ov-week-verdict">{verdict}</div>
      {[
        { label: 'This week', revenue: w.thisWeekRevenue, orders: w.thisWeekOrders, current: true },
        { label: 'Last week', revenue: w.lastWeekRevenue, orders: w.lastWeekOrders, current: false },
      ].map((row) => (
        <div key={row.label} className="rk-ov-week-row">
          <div className="rk-ov-week-top">
            <span className="rk-ov-week-label">{row.label}</span>
            <span className="rk-ov-week-value">
              <Money amount={row.revenue} />
            </span>
          </div>
          <div className="rk-rank-track">
            <div className={`rk-rank-fill ${row.current ? 'rk-rank-fill-accent' : ''}`} style={{ width: `${(row.revenue / max) * 100}%` }} />
          </div>
          <div className="rk-ov-week-orders">{plural(row.orders, 'order')}</div>
        </div>
      ))}
    </div>
  )
}

function RankList({
  loading,
  rows,
  format,
  empty,
}: {
  loading: boolean
  rows: RankedRow[]
  format: (v: number) => string
  empty: ReactNode
}) {
  if (loading) return <p className="rk-admin-empty">Loading…</p>
  if (rows.length === 0) return <>{empty}</>
  const max = rows[0]?.value || 1
  return (
    <ol className="rk-rank-list">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="rk-rank-row-top">
            <span className="rk-rank-name">
              <span className="rk-ov-rank-no">{i + 1}</span>
              {r.name}
            </span>
            <span className="rk-rank-value">{format(r.value)}</span>
          </div>
          <div className="rk-rank-track">
            <div className={`rk-rank-fill ${i === 0 ? 'rk-rank-fill-accent' : ''}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

const overviewStyles = `
  /* The page sizes itself by its own width (the admin sidebar eats into the
     viewport), so the grid uses container queries rather than media queries. */
  .rk-ov { container-type: inline-size; }

  /* ---- greeting ---- */
  .rk-ov-hello {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .rk-ov-hello-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
    text-transform: uppercase;
    line-height: 1.05;
    color: var(--text);
  }
  .rk-ov-hello-date { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.2rem; }

  /* ---- needs attention ---- */
  .rk-ov-attention { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
  .rk-ov-attn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    border-radius: 0.875rem;
    border: 1px solid var(--border);
    border-left-width: 4px;
    background: var(--bg);
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .rk-ov-attn > svg { flex-shrink: 0; }
  .rk-ov-attn b { color: var(--text); font-weight: 800; }
  .rk-ov-attn-text { flex: 1 1 16rem; min-width: 0; }
  .rk-ov-attn-alert { border-left-color: var(--accent-red); }
  .rk-ov-attn-alert > svg { color: var(--accent-red); }
  .rk-ov-attn-info { border-left-color: #3b82f6; }
  .rk-ov-attn-info > svg { color: #3b82f6; }
  .rk-ov-attn-ok { border-left-color: #0ca30c; }
  .rk-ov-attn-ok > svg { color: #0ca30c; }

  /* ---- sections ---- */
  .rk-ov-section { margin-bottom: 2rem; }
  .rk-ov-section .rk-ui-stats { margin-bottom: 1rem; }
  .rk-ov-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    flex-wrap: wrap;
    margin: 0 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }
  .rk-ov-section-head + .rk-ui-stats { margin-top: 0; }
  .rk-ui-stats + .rk-ov-section-head { margin-top: 1.25rem; }
  .rk-ov-section-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .rk-ov-section-hint { font-size: 0.75rem; color: var(--text-faint); }

  /* KPI tiles: "See details" affordance under the subtext. */
  .rk-ov .rk-ui-stat-sub { display: flex; flex-direction: column; gap: 0.5rem; }
  .rk-ov-more {
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    transition: color 0.15s ease;
  }
  .rk-ui-stat:hover .rk-ov-more,
  .rk-ui-stat:focus-visible .rk-ov-more { color: var(--text); }

  /* ---- card grid: 3 columns, cards may span 2 ---- */
  .rk-ov-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    align-items: stretch;
  }
  .rk-ov-grid .rk-admin-card { margin: 0; min-width: 0; }
  .rk-ov-span-2 { grid-column: span 2; }
  .rk-ov-stack { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
  .rk-ov-stack > .rk-admin-card:last-child { flex: 1; }
  @container (max-width: 62rem) {
    .rk-ov-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .rk-ov-span-2,
    .rk-ov-side-full,
    .rk-ov-stack { grid-column: 1 / -1; }
    .rk-ov-stack { flex-direction: row; }
    .rk-ov-stack > .rk-admin-card { flex: 1 1 0; }
    .rk-ov-trio > :last-child { grid-column: 1 / -1; }
  }
  @container (max-width: 40rem) {
    .rk-ov-grid { grid-template-columns: minmax(0, 1fr); }
    .rk-ov-stack { flex-direction: column; }
    .rk-ov-grid .rk-admin-card { padding: 1.125rem; }
  }

  /* ---- order + stock rows ---- */
  .rk-ov-order-no { margin-left: 0.5rem; font-size: 0.75rem; font-weight: 700; color: var(--text-faint); }
  .rk-ov-order-total { font-weight: 800; font-size: 0.875rem; color: var(--text); }
  .rk-ov-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rk-ov-qty { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; flex-shrink: 0; }
  .rk-ov-qty-sub { font-size: 0.6875rem; color: var(--text-faint); }
  .rk-ov-see-all { margin-top: 0.75rem; }

  /* ---- week vs week ---- */
  .rk-ov-week { display: flex; flex-direction: column; gap: 0.875rem; }
  .rk-ov-week-top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.375rem; }
  .rk-ov-week-label { font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
  .rk-ov-week-value { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.375rem; line-height: 1; color: var(--text); }
  .rk-ov-week-orders { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem; }

  /* ---- 7-day chart ---- */
  .rk-trend-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    margin: 0 0 1.25rem;
  }
  .rk-trend-summary-label {
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .rk-trend-summary-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.375rem;
    color: var(--text);
    margin-top: 0.125rem;
  }
  .rk-trend {
    display: flex;
    gap: 0.75rem;
    height: 15rem;
  }
  .rk-trend-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 1.75rem;
    font-size: 0.6875rem;
    font-weight: 700;
    color: var(--text-faint);
    min-width: 3rem;
  }
  .rk-trend-axis span {
    line-height: 1;
    transform: translateY(-50%);
  }
  .rk-trend-axis span:last-child {
    transform: translateY(50%);
  }
  .rk-trend-plot {
    position: relative;
    flex: 1;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
  }
  .rk-trend-grid {
    position: absolute;
    inset: 0 0 1.75rem 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
  }
  .rk-trend-grid span {
    border-top: 1px dashed var(--border);
  }
  .rk-trend-grid span:last-child {
    border-top-style: solid;
  }
  .rk-trend-empty {
    position: absolute;
    inset: 0 0 1.75rem 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-faint);
  }
  .rk-trend-col {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }
  .rk-trend-bar-area {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }
  .rk-trend-bar {
    width: min(3.5rem, 70%);
    border-radius: 0.5rem 0.5rem 0.25rem 0.25rem;
    background: linear-gradient(180deg, var(--text-muted), var(--text-faint));
    transition: height 0.4s ease, filter 0.15s ease;
  }
  .rk-trend-bar-today {
    background: linear-gradient(180deg, #ff4d4d, var(--accent-red));
    box-shadow: 0 6px 18px rgba(254, 0, 0, 0.25);
  }
  .rk-trend-bar-empty {
    height: 3px;
    border-radius: 999px;
    background: var(--border);
    box-shadow: none;
  }
  .rk-trend-col:hover .rk-trend-bar:not(.rk-trend-bar-empty) {
    filter: brightness(1.15);
  }
  .rk-trend-value {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 0.35rem;
    white-space: nowrap;
  }
  .rk-trend-day {
    height: 1.75rem;
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
  }
  .rk-trend-day-today {
    color: var(--accent-red);
  }
  @container (max-width: 30rem) {
    .rk-trend {
      height: 12rem;
      gap: 0.375rem;
    }
    .rk-trend-axis {
      min-width: 2.25rem;
      font-size: 0.625rem;
    }
    .rk-trend-value {
      font-size: 0.625rem;
    }
  }

  /* ---- order results bar ---- */
  .rk-stack-bar {
    display: flex;
    height: 14px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--bg-secondary);
    margin-bottom: 1.125rem;
  }
  .rk-stack-seg {
    height: 100%;
    transition: width 0.25s ease;
  }
  .rk-stack-seg + .rk-stack-seg {
    border-left: 2px solid var(--bg);
  }
  .rk-stack-ok { background: #0ca30c; }
  .rk-stack-pending { background: #3b82f6; }
  .rk-stack-warn { background: #f5a400; }
  .rk-stack-off { background: var(--text-faint); }
  .rk-stack-legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.5rem 1rem;
  }
  .rk-stack-legend-item {
    display: flex;
    align-items: center;
    gap: 0.4375rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  .rk-stack-legend-item b {
    margin-left: auto;
    color: var(--text);
    font-weight: 800;
  }
  .rk-stack-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  /* ---- ranked lists ---- */
  .rk-rank-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .rk-rank-row-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }
  .rk-rank-name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .rk-ov-rank-no {
    display: inline-block;
    width: 1.25rem;
    font-weight: 800;
    color: var(--text-faint);
  }
  .rk-rank-value {
    font-size: 0.75rem;
    color: var(--text-muted);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .rk-rank-track {
    height: 6px;
    border-radius: 999px;
    background: var(--bg-secondary);
    overflow: hidden;
  }
  .rk-rank-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--text-muted);
  }
  .rk-rank-fill-accent {
    background: var(--accent-red);
  }
`
