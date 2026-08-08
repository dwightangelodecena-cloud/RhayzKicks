import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  IconTags,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from './adminIcons'

interface SaleRow {
  total: number
  sale_date: string
  status: string
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string | null
  staff_name: string
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

interface StaffSaleRow {
  staff_name: string
  total: number
  sale_date: string
  status: string
}

interface SoldItemRow {
  item_id: string
  item_name: string
  quantity: number
  line_total: number
}

interface ItemCostRow {
  id: string
  cost_price: number
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
  refunded: number
  voided: number
}

const statusStyle: Record<string, string> = {
  completed: 'rk-admin-badge-ok',
  refunded: 'rk-admin-badge-warn',
  voided: 'rk-admin-badge-off',
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
  const [staffLeaderboard, setStaffLeaderboard] = useState<RankedRow[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ completed: 0, refunded: 0, voided: 0 })
  const [weekCompare, setWeekCompare] = useState<WeekCompare | null>(null)
  const [hoursThisWeek, setHoursThisWeek] = useState<RankedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        staffSalesRes,
        soldItemsRes,
        monthStatusRes,
        itemCostsRes,
        inventoryValRes,
        shiftsRes,
      ] = await Promise.all([
        supabase.from('sales').select('total, sale_date, status').gte('sale_date', trendStart).eq('status', 'completed'),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('inventory').select('sku', { count: 'exact', head: true }).eq('is_low_stock', true),
        supabase.from('sales_detail').select('*').order('sale_date', { ascending: false }).limit(6),
        supabase.from('inventory_detail').select('*').eq('is_low_stock', true).order('quantity_on_hand', { ascending: true }).limit(6),
        supabase.from('sales_detail').select('staff_name, total, sale_date, status').gte('sale_date', monthStart).eq('status', 'completed'),
        supabase.from('sold_items_detail').select('item_id, item_name, quantity, line_total').gte('sale_date', monthStart),
        supabase.from('sales').select('status').gte('sale_date', monthStart),
        supabase.from('items').select('id, cost_price, brand'),
        supabase.from('inventory_detail').select('sku, quantity_on_hand, item_id'),
        supabase.from('staff_shifts_detail').select('staff_name, clock_in, duration_hours').gte('clock_in', startOfWeekLocal().toISOString()),
      ])

      if (cancelled) return

      const firstError =
        salesRes.error ||
        customersRes.error ||
        productsRes.error ||
        lowStockCountRes.error ||
        recentOrdersRes.error ||
        lowStockListRes.error ||
        staffSalesRes.error ||
        soldItemsRes.error ||
        monthStatusRes.error ||
        itemCostsRes.error ||
        inventoryValRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      const salesRows = (salesRes.data ?? []) as SaleRow[]
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
      for (const item of (itemCostsRes.data ?? []) as ItemCostRow[]) {
        costByItemId.set(item.id, Number(item.cost_price))
        brandByItemId.set(item.id, item.brand)
      }

      let grossRevenue = 0
      let grossCost = 0
      const productTotals = new Map<string, number>()
      const brandTotals = new Map<string, number>()
      for (const row of (soldItemsRes.data ?? []) as SoldItemRow[]) {
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
      setRecentOrders((recentOrdersRes.data ?? []) as RecentOrder[])
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

      const staffTotals = new Map<string, number>()
      for (const row of (staffSalesRes.data ?? []) as StaffSaleRow[]) {
        staffTotals.set(row.staff_name, (staffTotals.get(row.staff_name) ?? 0) + Number(row.total))
      }
      setStaffLeaderboard(
        [...staffTotals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
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

      const counts = { completed: 0, refunded: 0, voided: 0 }
      for (const row of (monthStatusRes.data ?? []) as { status: string }[]) {
        if (row.status === 'completed') counts.completed += 1
        else if (row.status === 'refunded') counts.refunded += 1
        else if (row.status === 'voided') counts.voided += 1
      }
      setStatusCounts(counts)

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const systemFontStack = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
  const trendRealMax = Math.max(...trend.map((t) => t.total), 0)
  const trendMax = Math.max(trendRealMax, 1)
  const chartW = 700
  const chartH = 200
  const marginLeft = 60
  const marginRight = 8
  const marginTop = 14
  const plotTop = marginTop
  const marginBottom = 28
  const plotW = chartW - marginLeft - marginRight
  const plotH = chartH - marginTop - marginBottom
  const plotBottom = marginTop + plotH
  const slotW = plotW / (trend.length || 1)
  const barW = Math.min(48, slotW * 0.55)

  const statusTotal = statusCounts.completed + statusCounts.refunded + statusCounts.voided

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-admin-kpi-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .rk-admin-kpi {
          flex: 1 1 12rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          padding: 1.125rem 1.25rem;
          box-shadow: var(--shadow-elevated);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .rk-admin-kpi:hover {
          border-color: var(--text-faint);
          transform: translateY(-1px);
        }
        .rk-admin-kpi-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .rk-admin-kpi-icon {
          width: 2rem;
          height: 2rem;
          border-radius: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          color: var(--text);
          flex-shrink: 0;
        }
        .rk-admin-kpi-alert .rk-admin-kpi-icon {
          background: rgba(254, 0, 0, 0.1);
          color: var(--accent-red);
        }
        .rk-admin-kpi-label {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .rk-admin-kpi-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.75rem;
          line-height: 1;
          color: var(--text);
        }
        .rk-admin-kpi-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.375rem;
        }
        .rk-admin-kpi-alert .rk-admin-kpi-value {
          color: var(--accent-red);
        }
        .rk-admin-split {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 56rem) {
          .rk-admin-split {
            grid-template-columns: 1fr;
          }
        }
        .rk-admin-lowstock-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          padding: 0.75rem 0.875rem;
        }
        .rk-admin-lowstock-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-admin-lowstock-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-admin-lowstock-qty {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 1.125rem;
          color: var(--accent-red);
        }
        .rk-admin-view-all {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text);
          text-decoration: underline;
        }
        .rk-week-compare {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .rk-week-block {
          flex: 1;
        }
        .rk-week-delta {
          flex-shrink: 0;
        }
        .rk-week-delta-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.375rem 0.75rem;
          border-radius: 999px;
          white-space: nowrap;
        }
        .rk-week-delta-up {
          color: #0ca30c;
          background: rgba(12, 163, 12, 0.12);
        }
        .rk-week-delta-down {
          color: var(--accent-red);
          background: rgba(254, 0, 0, 0.08);
        }
        @media (max-width: 30rem) {
          .rk-week-compare {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
        }
        .rk-admin-rank-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .rk-admin-rank-row .rk-admin-card {
          flex: 1 1 15rem;
        }
        .rk-trend-svg-wrap {
          width: 100%;
        }
        .rk-trend-svg {
          width: 100%;
          height: 200px;
          display: block;
          overflow: visible;
        }
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
        .rk-stack-ok {
          background: #0ca30c;
        }
        .rk-stack-warn {
          background: #fab219;
        }
        .rk-stack-off {
          background: #ec835a;
        }
        .rk-stack-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1.25rem;
        }
        .rk-stack-legend-item {
          display: flex;
          align-items: center;
          gap: 0.4375rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-stack-legend-item b {
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
        .rk-rank-list {
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
          background: var(--text);
        }
        .rk-rank-fill-accent {
          background: var(--accent-red);
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>
            Couldn't load dashboard data: {error}
          </p>
        </div>
      )}

      {!error && (
        <div className="rk-admin-kpi-grid">
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Today's Revenue</div>
              <div className="rk-admin-kpi-icon"><IconWallet /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : <Money amount={stats?.todayRevenue ?? 0} />}</div>
            <div className="rk-admin-kpi-sub">{loading ? '' : `${stats?.todayOrders ?? 0} orders today`}</div>
          </div>
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">This Month</div>
              <div className="rk-admin-kpi-icon"><IconTrendUp /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : <Money amount={stats?.monthRevenue ?? 0} />}</div>
            <div className="rk-admin-kpi-sub">{loading ? '' : `${stats?.monthOrders ?? 0} orders`}</div>
          </div>
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Active Customers</div>
              <div className="rk-admin-kpi-icon"><IconUsers /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : stats?.activeCustomers ?? 0}</div>
            <div className="rk-admin-kpi-sub">Signed up &amp; walk-in</div>
          </div>
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Products Live</div>
              <div className="rk-admin-kpi-icon"><IconPackageCheck /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : stats?.activeProducts ?? 0}</div>
            <div className="rk-admin-kpi-sub">Active catalog items</div>
          </div>
          <div className={`rk-admin-kpi ${(stats?.lowStockCount ?? 0) > 0 ? 'rk-admin-kpi-alert' : ''}`}>
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Low Stock Alerts</div>
              <div className="rk-admin-kpi-icon"><IconAlertTriangle /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : stats?.lowStockCount ?? 0}</div>
            <div className="rk-admin-kpi-sub">At or below reorder level</div>
          </div>
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Gross Profit (Mo.)</div>
              <div className="rk-admin-kpi-icon"><IconPercent /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : <Money amount={stats?.grossProfit ?? 0} />}</div>
            <div className="rk-admin-kpi-sub">{loading ? '' : `${(stats?.grossMargin ?? 0).toFixed(1)}% margin`}</div>
          </div>
          <div className="rk-admin-kpi">
            <div className="rk-admin-kpi-top">
              <div className="rk-admin-kpi-label">Stock Value</div>
              <div className="rk-admin-kpi-icon"><IconLayers /></div>
            </div>
            <div className="rk-admin-kpi-value">{loading ? '—' : <Money amount={stats?.stockValue ?? 0} compact />}</div>
            <div className="rk-admin-kpi-sub">Backroom inventory, at cost</div>
          </div>
        </div>
      )}

      {!error && weekCompare && (
        <div className="rk-admin-card">
          <h2 className="rk-admin-card-title"><IconChartBar /> This Week vs. Last Week</h2>
          <p className="rk-admin-card-desc">Completed sales, rolling 7-day windows.</p>
          <div className="rk-week-compare">
            <div className="rk-week-block">
              <div className="rk-admin-kpi-label">This Week</div>
              <div className="rk-admin-kpi-value"><Money amount={weekCompare.thisWeekRevenue} /></div>
              <div className="rk-admin-kpi-sub">{weekCompare.thisWeekOrders} orders</div>
            </div>
            <div className="rk-week-delta">
              {(() => {
                const diff = weekCompare.thisWeekRevenue - weekCompare.lastWeekRevenue
                const pct = weekCompare.lastWeekRevenue > 0 ? (diff / weekCompare.lastWeekRevenue) * 100 : diff > 0 ? 100 : 0
                const up = diff >= 0
                return (
                  <span className={`rk-week-delta-pill ${up ? 'rk-week-delta-up' : 'rk-week-delta-down'}`}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                  </span>
                )
              })()}
            </div>
            <div className="rk-week-block">
              <div className="rk-admin-kpi-label">Last Week</div>
              <div className="rk-admin-kpi-value"><Money amount={weekCompare.lastWeekRevenue} /></div>
              <div className="rk-admin-kpi-sub">{weekCompare.lastWeekOrders} orders</div>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="rk-admin-split">
          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconReceipt /> Recent Orders</h2>
            <p className="rk-admin-card-desc">Latest transactions across the store.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : recentOrders.length === 0 ? (
              <p className="rk-admin-empty">No orders yet.</p>
            ) : (
              <div className="rk-admin-table-wrap">
                <table className="rk-admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Staff</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.order_number}</td>
                        <td>{o.customer_name ?? 'Walk-in'}</td>
                        <td>{o.staff_name}</td>
                        <td><Money amount={Number(o.total)} /></td>
                        <td>
                          <span className={`rk-admin-badge ${statusStyle[o.status] ?? 'rk-admin-badge-off'}`}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconAlertTriangle /> Low Stock</h2>
            <p className="rk-admin-card-desc">Variants at or below their reorder level.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : lowStock.length === 0 ? (
              <p className="rk-admin-empty">Everything's well stocked.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lowStock.map((row) => (
                  <div key={row.sku} className="rk-admin-lowstock-row">
                    <div>
                      <div className="rk-admin-lowstock-name">{row.item_name}</div>
                      <div className="rk-admin-lowstock-meta">
                        {row.color} · Size {row.size} · {row.sku}
                      </div>
                    </div>
                    <div className="rk-admin-lowstock-qty">{row.quantity_on_hand}</div>
                  </div>
                ))}
              </div>
            )}
            {stats && stats.lowStockCount > lowStock.length && (
              <Link to="/admin/dashboard" className="rk-admin-view-all">
                +{stats.lowStockCount - lowStock.length} more low on stock
              </Link>
            )}
          </div>
        </div>
      )}

      {!error && (
        <div className="rk-admin-card">
          <h2 className="rk-admin-card-title"><IconChartBar /> 7-Day Revenue Trend</h2>
          <p className="rk-admin-card-desc">Completed sales for the last 7 days.</p>
          {loading ? (
            <p className="rk-admin-empty">Loading…</p>
          ) : (
            <div className="rk-trend-svg-wrap">
              <svg className="rk-trend-svg" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" role="img" aria-label="Revenue for the last 7 days">
                {trendRealMax === 0 ? (
                  <>
                    <line x1={marginLeft} y1={plotBottom} x2={chartW - marginRight} y2={plotBottom} stroke="var(--border)" strokeWidth={1} />
                    <text x={chartW / 2} y={plotTop + plotH / 2} textAnchor="middle" fontSize="12" fontWeight={600} fill="var(--text-faint)" fontFamily={systemFontStack}>
                      No completed sales in the last 7 days yet
                    </text>
                  </>
                ) : (
                  [trendMax, trendMax / 2, 0].map((v, idx) => {
                    const y = marginTop + (idx * plotH) / 2
                    return (
                      <g key={idx}>
                        <line
                          x1={marginLeft}
                          y1={y}
                          x2={chartW - marginRight}
                          y2={y}
                          stroke="var(--border)"
                          strokeWidth={1}
                          strokeDasharray={idx === 2 ? undefined : '3 3'}
                        />
                        <text x={marginLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fontWeight={700} fill="var(--text-faint)" fontFamily={systemFontStack}>
                          {formatCompactPeso(v)}
                        </text>
                      </g>
                    )
                  })
                )}
                {trend.map((day, i) => {
                  const x = marginLeft + i * slotW + (slotW - barW) / 2
                  const barH = day.total > 0 ? Math.max((day.total / trendMax) * plotH, 4) : 0
                  const y = plotBottom - barH
                  const isToday = i === trend.length - 1
                  return (
                    <g key={day.key}>
                      <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isToday ? 'var(--accent-red)' : 'var(--text)'}>
                        <title>{`${day.label}: ${formatPeso(day.total)}`}</title>
                      </rect>
                      {isToday && day.total > 0 && (
                        <text x={x + barW / 2} y={Math.max(y - 8, marginTop + 10)} textAnchor="middle" fontSize="11" fontWeight={800} fill="var(--text)" fontFamily={systemFontStack}>
                          {formatCompactPeso(day.total)}
                        </text>
                      )}
                      <text x={x + barW / 2} y={plotBottom + 20} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--text-muted)">
                        {day.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </div>
      )}

      {!error && (
        <div className="rk-admin-rank-row">
          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconMedal /> Top Products</h2>
            <p className="rk-admin-card-desc">Best sellers by units this month.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : topProducts.length === 0 ? (
              <p className="rk-admin-empty">No sales yet this month.</p>
            ) : (
              <div className="rk-rank-list">
                {topProducts.map((p) => {
                  const max = topProducts[0]?.value || 1
                  return (
                    <div key={p.name}>
                      <div className="rk-rank-row-top">
                        <span className="rk-rank-name">{p.name}</span>
                        <span className="rk-rank-value">{p.value} sold</span>
                      </div>
                      <div className="rk-rank-track">
                        <div className="rk-rank-fill" style={{ width: `${(p.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconTags /> Top Brands</h2>
            <p className="rk-admin-card-desc">Best-selling brands by units this month.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : topBrands.length === 0 ? (
              <p className="rk-admin-empty">No sales yet this month.</p>
            ) : (
              <div className="rk-rank-list">
                {topBrands.map((b) => {
                  const max = topBrands[0]?.value || 1
                  return (
                    <div key={b.name}>
                      <div className="rk-rank-row-top">
                        <span className="rk-rank-name">{b.name}</span>
                        <span className="rk-rank-value">{b.value} sold</span>
                      </div>
                      <div className="rk-rank-track">
                        <div className="rk-rank-fill" style={{ width: `${(b.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconUsers /> Staff Leaderboard</h2>
            <p className="rk-admin-card-desc">Sales rung up this month, by staff.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : staffLeaderboard.length === 0 ? (
              <p className="rk-admin-empty">No sales yet this month.</p>
            ) : (
              <div className="rk-rank-list">
                {staffLeaderboard.map((s) => {
                  const max = staffLeaderboard[0]?.value || 1
                  return (
                    <div key={s.name}>
                      <div className="rk-rank-row-top">
                        <span className="rk-rank-name">{s.name}</span>
                        <span className="rk-rank-value"><Money amount={s.value} /></span>
                      </div>
                      <div className="rk-rank-track">
                        <div className="rk-rank-fill rk-rank-fill-accent" style={{ width: `${(s.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconClock /> Hours This Week</h2>
            <p className="rk-admin-card-desc">Logged clock-in/out time, Monday to today.</p>
            {loading ? (
              <p className="rk-admin-empty">Loading…</p>
            ) : hoursThisWeek.length === 0 ? (
              <p className="rk-admin-empty">No shifts logged this week yet — log time in the Staff Hours tab.</p>
            ) : (
              <div className="rk-rank-list">
                {hoursThisWeek.map((h) => {
                  const max = hoursThisWeek[0]?.value || 1
                  return (
                    <div key={h.name}>
                      <div className="rk-rank-row-top">
                        <span className="rk-rank-name">{h.name}</span>
                        <span className="rk-rank-value">{h.value.toFixed(1)}h</span>
                      </div>
                      <div className="rk-rank-track">
                        <div className="rk-rank-fill" style={{ width: `${(h.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!error && (
        <div className="rk-admin-card">
          <h2 className="rk-admin-card-title"><IconReceipt /> Order Status</h2>
          <p className="rk-admin-card-desc">Completed vs. refunded vs. voided this month.</p>
          {loading ? (
            <p className="rk-admin-empty">Loading…</p>
          ) : statusTotal === 0 ? (
            <p className="rk-admin-empty">No orders yet this month.</p>
          ) : (
            <>
              <div className="rk-stack-bar">
                <div className="rk-stack-seg rk-stack-ok" style={{ width: `${(statusCounts.completed / statusTotal) * 100}%` }} />
                <div className="rk-stack-seg rk-stack-warn" style={{ width: `${(statusCounts.refunded / statusTotal) * 100}%` }} />
                <div className="rk-stack-seg rk-stack-off" style={{ width: `${(statusCounts.voided / statusTotal) * 100}%` }} />
              </div>
              <div className="rk-stack-legend">
                <div className="rk-stack-legend-item">
                  <span className="rk-stack-dot rk-stack-ok" />
                  Completed <b>{statusCounts.completed}</b>
                </div>
                <div className="rk-stack-legend-item">
                  <span className="rk-stack-dot rk-stack-warn" />
                  Refunded <b>{statusCounts.refunded}</b>
                </div>
                <div className="rk-stack-legend-item">
                  <span className="rk-stack-dot rk-stack-off" />
                  Voided <b>{statusCounts.voided}</b>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
