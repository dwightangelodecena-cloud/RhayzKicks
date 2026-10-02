import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconClock, IconWallet } from './adminIcons'
import { EmptyState, Notice, Pill, SearchInput, SectionHead, Segmented } from './adminUi'
import type { Tone } from './adminUi'
import type { PaymentMethod } from '../../types/database.types'

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}
function CloseIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

interface VariantRow {
  variantId: string
  itemId: string
  itemName: string
  brand: string
  size: string
  color: string
  sku: string
  price: number
  qtyOnHand: number
  reorderLevel: number
}

interface CartLine {
  variantId: string
  itemId: string
  itemName: string
  size: string
  color: string
  sku: string
  unitPrice: number
  quantity: number
  maxQty: number
}

interface CustomerRow {
  id: string
  full_name: string
  phone: string
  loyalty_points: number
}

interface VoucherRow {
  id: string
  code: string
  value: number
}

interface CustomerCartRow {
  variantId: string
  quantity: number
}

interface RecentSaleRow {
  id: string
  order_number: string
  customer_name: string | null
  staff_name: string | null // null for online orders
  channel: 'In-store' | 'Online'
  total: number
  payment_method: string
  status: string
  sale_date: string
}

const paymentMethods: PaymentMethod[] = ['cash', 'card', 'gcash', 'other']
const paymentLabel: Record<PaymentMethod, string> = { cash: 'Cash', card: 'Card', gcash: 'GCash', other: 'Other' }

// Plain-language status for both in-store sales and online orders.
function saleStatus(status: string): { tone: Tone; label: string } {
  switch (status) {
    case 'completed':
      return { tone: 'ok', label: 'Completed' }
    case 'paid':
      return { tone: 'ok', label: 'Paid' }
    case 'fulfilled':
      return { tone: 'ok', label: 'Fulfilled' }
    case 'pending':
      return { tone: 'warn', label: 'Awaiting payment' }
    case 'refunded':
      return { tone: 'warn', label: 'Refunded' }
    case 'voided':
      return { tone: 'alert', label: 'Voided' }
    case 'cancelled':
      return { tone: 'alert', label: 'Cancelled' }
    default:
      return { tone: 'neutral', label: status }
  }
}

function fmtWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminSalesPOS() {
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState('')

  const [cart, setCart] = useState<CartLine[]>([])

  const [allCustomers, setAllCustomers] = useState<CustomerRow[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [customerVouchers, setCustomerVouchers] = useState<VoucherRow[]>([])
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('')
  const [customerCart, setCustomerCart] = useState<CustomerCartRow[]>([])

  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    const [itemsRes, variantsRes, inventoryRes, salesRes, customersRes, onlineRes] = await Promise.all([
      supabase.from('items').select('id, name, brand, base_price').eq('is_active', true),
      supabase.from('item_variants').select('id, item_id, size, color, sku, price_override').eq('is_active', true),
      supabase.from('inventory').select('sku, quantity_on_hand, reorder_level'),
      supabase.from('sales_detail').select('*').order('sale_date', { ascending: false }).limit(10),
      supabase.from('customers').select('id, full_name, phone, loyalty_points').eq('is_active', true).order('full_name').limit(300),
      supabase
        .from('online_orders')
        .select('id, order_number, total, status, payment_method, created_at, paid_at, customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    if (itemsRes.error || variantsRes.error || inventoryRes.error) {
      setError((itemsRes.error ?? variantsRes.error ?? inventoryRes.error)?.message ?? 'Failed to load catalog.')
      setLoading(false)
      return
    }
    const itemById = new Map(itemsRes.data.map((it) => [it.id, it]))
    const invBySku = new Map((inventoryRes.data ?? []).map((r) => [r.sku, r]))
    const rows: VariantRow[] = (variantsRes.data ?? []).flatMap((v) => {
      const item = itemById.get(v.item_id)
      if (!item) return []
      const inv = invBySku.get(v.sku)
      return [{
        variantId: v.id,
        itemId: v.item_id,
        itemName: item.name,
        brand: item.brand,
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: v.price_override ?? item.base_price,
        qtyOnHand: inv?.quantity_on_hand ?? 0,
        reorderLevel: Number(inv?.reorder_level ?? 0),
      }]
    })
    setVariants(rows)
    // In-store sales and online orders together, newest first.
    const inStore: RecentSaleRow[] = ((salesRes.error ? [] : salesRes.data ?? []) as Omit<RecentSaleRow, 'channel'>[]).map((r) => ({
      ...r,
      channel: 'In-store',
    }))
    const online: RecentSaleRow[] = (onlineRes.error ? [] : onlineRes.data ?? []).map((o) => ({
      id: o.id as string,
      order_number: o.order_number as string,
      customer_name: (o.customers as unknown as { full_name: string } | null)?.full_name || null,
      staff_name: null,
      channel: 'Online',
      total: Number(o.total),
      payment_method: (o.payment_method as string | null) ?? '—',
      status: o.status as string,
      sale_date: ((o.paid_at as string | null) ?? (o.created_at as string)) as string,
    }))
    setRecentSales([...inStore, ...online].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 10))
    if (!customersRes.error) setAllCustomers((customersRes.data ?? []) as CustomerRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredVariants = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return variants.slice(0, 30)
    return variants.filter((v) => `${v.itemName} ${v.brand} ${v.sku} ${v.color}`.toLowerCase().includes(q)).slice(0, 30)
  }, [variants, productQuery])

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    const pool = q ? allCustomers.filter((c) => `${c.full_name} ${c.phone}`.toLowerCase().includes(q)) : allCustomers
    return pool.slice(0, 8)
  }, [allCustomers, customerQuery])

  // How many of each variant are already in this sale — shown on the tiles.
  const inCartQty = useMemo(() => new Map(cart.map((l) => [l.variantId, l.quantity])), [cart])

  const addQuantityToCart = (v: VariantRow, quantity: number) => {
    if (quantity <= 0 || v.qtyOnHand <= 0) return
    setSuccessMessage(null)
    setCart((c) => {
      const existing = c.find((l) => l.variantId === v.variantId)
      if (existing) {
        return c.map((l) => (l.variantId === v.variantId ? { ...l, quantity: Math.min(l.quantity + quantity, v.qtyOnHand) } : l))
      }
      return [
        ...c,
        {
          variantId: v.variantId,
          itemId: v.itemId,
          itemName: v.itemName,
          size: v.size,
          color: v.color,
          sku: v.sku,
          unitPrice: v.price,
          quantity: Math.min(quantity, v.qtyOnHand),
          maxQty: v.qtyOnHand,
        },
      ]
    })
  }

  const addToCart = (v: VariantRow) => addQuantityToCart(v, 1)

  const updateQuantity = (variantId: string, quantity: number) => {
    setCart((c) => c.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxQty)) } : l)))
  }

  const removeLine = (variantId: string) => setCart((c) => c.filter((l) => l.variantId !== variantId))

  const selectCustomer = async (c: CustomerRow) => {
    setSelectedCustomer(c)
    setCustomerQuery('')
    setCustomerDropdownOpen(false)
    setSelectedVoucherId('')
    const [vouchersRes, cartRes] = await Promise.all([
      supabase.from('vouchers').select('id, code, value').eq('customer_id', c.id).eq('redeemed', false).order('created_at', { ascending: false }),
      supabase.from('cart_items').select('variant_id, quantity').eq('customer_id', c.id),
    ])
    setCustomerVouchers((vouchersRes.data ?? []) as VoucherRow[])
    setCustomerCart((cartRes.data ?? []).map((r) => ({ variantId: r.variant_id, quantity: r.quantity })))
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerVouchers([])
    setSelectedVoucherId('')
    setCustomerCart([])
  }

  const addCustomerCartLineToSale = (row: CustomerCartRow) => {
    const variant = variants.find((v) => v.variantId === row.variantId)
    if (!variant) return
    addQuantityToCart(variant, row.quantity)
  }

  const addAllCustomerCartToSale = () => {
    for (const row of customerCart) addCustomerCartLineToSale(row)
  }

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0)
  const voucherValue = customerVouchers.find((v) => v.id === selectedVoucherId)?.value ?? 0
  const discountNum = Number(discount) || 0
  const taxNum = Number(tax) || 0
  const total = Math.max(subtotal - discountNum - voucherValue + taxNum, 0)

  // Mistake-proofing: negative amounts would silently raise / lower the total.
  const negativeAmount = discountNum < 0 || taxNum < 0
  const reductionsExceedSubtotal = cart.length > 0 && discountNum + voucherValue > subtotal

  const submitSale = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    const { data: userData } = await supabase.auth.getUser()
    const staffId = userData.user?.id
    if (!staffId) {
      setError('Could not determine the signed-in staff member.')
      setSubmitting(false)
      return
    }
    const { error: rpcError } = await supabase.rpc('create_sale', {
      p_staff_id: staffId,
      p_customer_id: selectedCustomer?.id ?? null,
      p_payment_method: paymentMethod,
      p_discount: discountNum,
      p_tax: taxNum,
      p_line_items: cart.map((l) => ({
        item_id: l.itemId,
        variant_id: l.variantId,
        sku: l.sku,
        quantity: l.quantity,
        unit_price: l.unitPrice,
      })),
      p_voucher_id: selectedVoucherId || null,
    })
    setSubmitting(false)
    if (rpcError) {
      setError(`The sale was not saved: ${rpcError.message}`)
      return
    }
    const who = selectedCustomer ? ` for ${selectedCustomer.full_name}` : ''
    setSuccessMessage(
      `Sale completed${who} — ₱${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} paid by ${paymentLabel[paymentMethod]} (${itemCount} ${itemCount === 1 ? 'item' : 'items'}). Stock has been updated.`,
    )
    setCart([])
    setDiscount('0')
    setTax('0')
    clearCustomer()
    load()
  }

  const clearSale = () => {
    setCart([])
    setDiscount('0')
    setTax('0')
    setSelectedVoucherId('')
  }

  const canComplete = cart.length > 0 && !submitting && !negativeAmount

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-pos-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 1.5rem;
          align-items: stretch;
        }
        /* The catalog stretches to match the right column's height and its
           product grid scrolls inside — no empty space under either side. */
        .rk-pos-layout > div:first-child {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .rk-pos-catalog {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        /* The shared search box grows in toolbars (flex: 1) — not in this column. */
        .rk-pos-catalog > .rk-ui-search {
          flex: none;
        }
        .rk-pos-catalog .rk-pos-product-grid {
          flex: 1 1 0;
          min-height: 28rem;
          max-height: none;
        }
        /* Left: the catalog (step 1) gets the full column height.
           Right: customer (step 2) above order & payment (step 3), so both
           columns fill roughly the same height with no dead space. Not
           sticky — the owner found follow-on-scroll distracting. */
        .rk-pos-side {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .rk-pos-side > .rk-admin-card:last-child,
        .rk-pos-layout > div > .rk-admin-card:last-child {
          margin-bottom: 0;
        }
        @media (max-width: 64rem) {
          .rk-pos-layout { grid-template-columns: 1fr; }
          .rk-pos-side { position: static; max-height: none; overflow: visible; }
        }

        /* ---- step badges ---- */
        .rk-pos-step {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: var(--text);
          color: var(--bg);
          font-size: 0.75rem;
          font-weight: 900;
          flex-shrink: 0;
        }
        .rk-pos-step-done { background: #0ca30c; color: #fff; }
        .rk-pos-optional {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-left: 0.25rem;
        }

        /* ---- product tiles ---- */
        .rk-pos-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
          gap: 0.75rem;
          max-height: max(32rem, calc(100vh - 15rem));
          overflow-y: auto;
          padding: 0.125rem;
        }
        .rk-pos-tile {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          text-align: left;
          font: inherit;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-left: 3px solid transparent;
          border-radius: 0.75rem;
          padding: 0.75rem;
          cursor: pointer;
          min-width: 0;
          transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
        }
        .rk-pos-tile:hover:not(:disabled) { border-color: var(--text-muted); background: var(--bg-secondary); }
        .rk-pos-tile:active:not(:disabled) { transform: scale(0.98); }
        .rk-pos-tile:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
        .rk-pos-tile:disabled { cursor: not-allowed; }
        .rk-pos-tile-low { border-left-color: #f5a400; }
        .rk-pos-tile-out { opacity: 0.55; background: var(--bg-secondary); }
        .rk-pos-tile-in-cart { border-color: var(--text); box-shadow: 0 0 0 1px var(--text) inset; }
        .rk-pos-tile-name {
          font-size: 0.875rem;
          font-weight: 800;
          line-height: 1.2;
          padding-right: 2.25rem;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .rk-pos-tile-variant { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-top: 0.25rem; text-transform: capitalize; }
        .rk-pos-tile-sku { font-size: 0.6875rem; color: var(--text-faint); margin-top: 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rk-pos-tile-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.375rem;
          flex-wrap: wrap;
          margin-top: auto;
          padding-top: 0.625rem;
        }
        .rk-pos-tile-price { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.25rem; line-height: 1; }
        .rk-pos-tile-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          min-width: 1.75rem;
          height: 1.75rem;
          padding: 0 0.4rem;
          border-radius: 999px;
          background: var(--text);
          color: var(--bg);
          font-size: 0.75rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rk-pos-hint { font-size: 0.75rem; color: var(--text-faint); margin: 0.75rem 0 0; }

        /* ---- customer ---- */
        .rk-pos-customer-chip {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.75rem 0.875rem;
        }
        .rk-pos-customer-chip-main { flex: 1; min-width: 0; }
        .rk-pos-customer-chip-name { font-weight: 800; font-size: 0.9375rem; color: var(--text); }
        .rk-pos-customer-chip-sub { display: flex; gap: 0.375rem; flex-wrap: wrap; margin-top: 0.375rem; }
        .rk-pos-customer-combobox { position: relative; }
        .rk-pos-customer-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          z-index: 10;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          box-shadow: var(--shadow-elevated);
          max-height: 17rem;
          overflow-y: auto;
          padding: 0.375rem;
        }
        .rk-pos-customer-dropdown-empty {
          padding: 0.75rem 0.875rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-align: center;
        }
        .rk-pos-customer-result {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          width: 100%;
          border: none;
          background: transparent;
          font: inherit;
          text-align: left;
          padding: 0.625rem 0.75rem;
          border-radius: 0.625rem;
          cursor: pointer;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-pos-customer-result:hover { background: var(--bg-secondary); }
        .rk-pos-customer-result-sub {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .rk-pos-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          margin: 1rem 0 0.5rem;
        }
        .rk-pos-vouchers { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: 0.5rem; }
        .rk-pos-voucher {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.125rem;
          font: inherit;
          text-align: left;
          color: var(--text);
          background: var(--bg);
          border: 1px dashed var(--border);
          border-radius: 0.625rem;
          padding: 0.625rem 0.75rem;
          cursor: pointer;
        }
        .rk-pos-voucher:hover { border-color: var(--text-muted); }
        .rk-pos-voucher-active { border-style: solid; border-color: var(--text); box-shadow: 0 0 0 1px var(--text) inset; background: var(--bg-secondary); }
        .rk-pos-voucher-value { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.125rem; line-height: 1.1; }
        .rk-pos-voucher-code { font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.04em; }

        /* ---- order lines ---- */
        .rk-pos-line {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }
        .rk-pos-line:first-child { padding-top: 0; }
        .rk-pos-line-info { flex: 1; min-width: 0; }
        .rk-pos-line-name {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-pos-line-meta { font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; }
        .rk-pos-line-max { font-size: 0.6875rem; color: #b57800; font-weight: 700; }
        [data-theme='dark'] .rk-pos-line-max { color: #f5b400; }
        .rk-pos-line-total { font-weight: 800; font-size: 0.8125rem; white-space: nowrap; min-width: 4.5rem; text-align: right; }
        .rk-pos-stepper {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .rk-pos-stepper button {
          width: 2rem;
          height: 2rem;
          border: none;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
        }
        .rk-pos-stepper button:hover:not(:disabled) { background: var(--bg-secondary); }
        .rk-pos-stepper button:disabled { color: var(--text-faint); cursor: not-allowed; }
        .rk-pos-stepper input {
          width: 2.25rem;
          height: 2rem;
          border: none;
          border-left: 1px solid var(--border);
          border-right: 1px solid var(--border);
          text-align: center;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 0.8125rem;
          font-weight: 800;
          -moz-appearance: textfield;
        }
        .rk-pos-stepper input::-webkit-outer-spin-button,
        .rk-pos-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .rk-pos-remove {
          border: none;
          background: transparent;
          color: var(--text-faint);
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 0.5rem;
          display: flex;
        }
        .rk-pos-remove:hover { color: var(--accent-red); background: rgba(254, 0, 0, 0.06); }
        @media (max-width: 30rem) {
          .rk-pos-line { flex-wrap: wrap; }
          .rk-pos-line-info { flex-basis: 100%; }
          .rk-pos-line-total { margin-left: auto; }
        }

        /* ---- payment + totals ---- */
        .rk-pos-section { border-top: 1px solid var(--border); margin-top: 1rem; padding-top: 1rem; }
        .rk-pos-section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 0.75rem;
        }
        .rk-pos-pay .rk-ui-seg { display: flex; }
        .rk-pos-pay .rk-ui-seg button { flex: 1; justify-content: center; }
        .rk-pos-totals { background: var(--bg-secondary); border-radius: 0.75rem; padding: 0.875rem 1rem; margin-top: 1rem; }
        .rk-pos-totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          color: var(--text-muted);
          padding: 0.2rem 0;
        }
        .rk-pos-totals-row-minus span:last-child { color: #0a8f0a; }
        [data-theme='dark'] .rk-pos-totals-row-minus span:last-child { color: #2fd12f; }
        .rk-pos-totals-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-top: 1px solid var(--border);
          margin-top: 0.5rem;
          padding-top: 0.625rem;
          color: var(--text);
        }
        .rk-pos-totals-total-label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .rk-pos-totals-total-value { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.5rem; line-height: 1; }
        .rk-pos-complete { width: 100%; margin-top: 1rem; padding: 1rem 1.25rem; font-size: 0.9375rem; }
        .rk-pos-complete-sub { font-size: 0.75rem; color: var(--text-faint); text-align: center; margin: 0.5rem 0 0; }
        .rk-pos-clear { width: 100%; margin-top: 0.375rem; }

        /* ---- recent sales ---- */
        .rk-pos-recent-total { font-weight: 800; font-size: 0.9375rem; min-width: 5rem; text-align: right; }
        .rk-pos-recent-pay { font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; min-width: 3.5rem; }
      `}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
      {successMessage && <Notice tone="ok" onDismiss={() => setSuccessMessage(null)}>{successMessage}</Notice>}

      <div className="rk-pos-layout">
        <div>
          {/* Step 1 — pick products */}
          <div className="rk-admin-card rk-pos-catalog">
            <SectionHead
              icon={<span className={`rk-pos-step ${cart.length > 0 ? 'rk-pos-step-done' : ''}`}>1</span>}
              title="Add items"
              desc="Tap a product to add one pair to the sale. Tap again to add another."
            />
            <SearchInput value={productQuery} onChange={setProductQuery} placeholder="Search by name, brand, SKU, or color…" />
            <div style={{ height: '1rem' }} />
            {loading ? (
              <EmptyState title="Loading products…" />
            ) : variants.length === 0 ? (
              <EmptyState title="No products to sell yet" hint="Add products in the Products tab and they’ll appear here." />
            ) : filteredVariants.length === 0 ? (
              <EmptyState
                title="No matching products"
                hint={`Nothing matches “${productQuery}”. Try the brand, color, or SKU instead.`}
                action={<button type="button" className="rk-ui-btn" onClick={() => setProductQuery('')}>Clear search</button>}
              />
            ) : (
              <>
                <div className="rk-pos-product-grid">
                  {filteredVariants.map((v) => {
                    const outOfStock = v.qtyOnHand <= 0
                    const inCart = inCartQty.get(v.variantId) ?? 0
                    const allInCart = !outOfStock && inCart >= v.qtyOnHand
                    const low = !outOfStock && (v.qtyOnHand <= v.reorderLevel || v.qtyOnHand === 1)
                    const remaining = v.qtyOnHand - inCart
                    return (
                      <button
                        type="button"
                        key={v.variantId}
                        className={`rk-pos-tile ${outOfStock ? 'rk-pos-tile-out' : low ? 'rk-pos-tile-low' : ''} ${inCart > 0 ? 'rk-pos-tile-in-cart' : ''}`}
                        onClick={() => addToCart(v)}
                        disabled={outOfStock || allInCart}
                        title={outOfStock ? 'Out of stock' : allInCart ? `All ${v.qtyOnHand} in stock are already in this sale` : `Add ${v.itemName} to the sale`}
                      >
                        {inCart > 0 && <span className="rk-pos-tile-badge" aria-label={`${inCart} in this sale`}>×{inCart}</span>}
                        <span className="rk-pos-tile-name">{v.itemName}</span>
                        <span className="rk-pos-tile-variant">Size {v.size || '—'} · {v.color || 'No color'}</span>
                        <span className="rk-pos-tile-sku">SKU {v.sku}</span>
                        <span className="rk-pos-tile-bottom">
                          <span className="rk-pos-tile-price"><Money amount={v.price} /></span>
                          {outOfStock ? (
                            <Pill tone="alert">Out of stock</Pill>
                          ) : allInCart ? (
                            <Pill tone="info">All in sale</Pill>
                          ) : low ? (
                            <Pill tone="warn">Only {remaining} left</Pill>
                          ) : (
                            <Pill tone="ok">{remaining} left</Pill>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {variants.length > filteredVariants.length && (
                  <p className="rk-pos-hint">Showing {filteredVariants.length} of {productQuery.trim() ? 'the matches' : `${variants.length} products`} — search to find others.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column — step 2 (customer) above step 3 (order & payment) */}
        <div className="rk-pos-side">
          {/* Step 2 — optional customer */}
          <div className="rk-admin-card">
            <SectionHead
              icon={<span className={`rk-pos-step ${selectedCustomer ? 'rk-pos-step-done' : ''}`}>2</span>}
              title={<>Customer <span className="rk-pos-optional">optional</span></>}
              desc="Attach a member so they earn loyalty points and can use their vouchers. Skip this for walk-in buyers."
            />
            {selectedCustomer ? (
              <div className="rk-pos-customer-chip">
                <div className="rk-pos-customer-chip-main">
                  <div className="rk-pos-customer-chip-name">{selectedCustomer.full_name}</div>
                  <div className="rk-pos-customer-chip-sub">
                    <Pill tone="info">{selectedCustomer.loyalty_points.toLocaleString()} points</Pill>
                    <Pill tone={customerVouchers.length > 0 ? 'ok' : 'neutral'}>
                      {customerVouchers.length === 0 ? 'No vouchers' : `${customerVouchers.length} ${customerVouchers.length === 1 ? 'voucher' : 'vouchers'} available`}
                    </Pill>
                    {selectedCustomer.phone && <Pill>{selectedCustomer.phone}</Pill>}
                  </div>
                </div>
                <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={clearCustomer} aria-label="Remove customer">
                  <CloseIcon /> Remove
                </button>
              </div>
            ) : (
              <div className="rk-pos-customer-combobox">
                <div className="rk-ui-search">
                  <SearchIcon />
                  <input
                    placeholder="Tap to browse members, or type a name / phone…"
                    aria-label="Find a customer"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    onBlur={() => setCustomerDropdownOpen(false)}
                  />
                </div>
                {customerDropdownOpen && (
                  <div className="rk-pos-customer-dropdown" onMouseDown={(e) => e.preventDefault()}>
                    {allCustomers.length === 0 ? (
                      <div className="rk-pos-customer-dropdown-empty">No customers yet.</div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="rk-pos-customer-dropdown-empty">No matching customers.</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button type="button" key={c.id} className="rk-pos-customer-result" onClick={() => selectCustomer(c)}>
                          <span>{c.full_name}</span>
                          <span className="rk-pos-customer-result-sub">{c.phone || 'no phone'} · {c.loyalty_points.toLocaleString()} pts</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedCustomer && customerVouchers.length > 0 && (
              <>
                <div className="rk-pos-label">Use a voucher on this sale?</div>
                <div className="rk-pos-vouchers" role="radiogroup" aria-label="Voucher">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedVoucherId === ''}
                    className={`rk-pos-voucher ${selectedVoucherId === '' ? 'rk-pos-voucher-active' : ''}`}
                    onClick={() => setSelectedVoucherId('')}
                  >
                    <span className="rk-pos-voucher-value">No voucher</span>
                    <span className="rk-pos-voucher-code">Keep it for later</span>
                  </button>
                  {customerVouchers.map((v) => (
                    <button
                      type="button"
                      role="radio"
                      key={v.id}
                      aria-checked={selectedVoucherId === v.id}
                      className={`rk-pos-voucher ${selectedVoucherId === v.id ? 'rk-pos-voucher-active' : ''}`}
                      onClick={() => setSelectedVoucherId(v.id)}
                    >
                      <span className="rk-pos-voucher-value"><Money amount={v.value} /> off</span>
                      <span className="rk-pos-voucher-code">{v.code}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {selectedCustomer && customerCart.length > 0 && (
              <>
                <div className="rk-pos-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>Saved in their app cart — add to this sale?</span>
                  <button type="button" className="rk-ui-btn" onClick={addAllCustomerCartToSale}>+ Add all</button>
                </div>
                <div className="rk-ui-list">
                  {customerCart.map((row) => {
                    const variant = variants.find((v) => v.variantId === row.variantId)
                    if (!variant) {
                      return (
                        <div key={row.variantId} className="rk-ui-list-row">
                          <div className="rk-ui-list-main">
                            <div className="rk-ui-list-meta">This item is no longer available.</div>
                          </div>
                        </div>
                      )
                    }
                    const out = variant.qtyOnHand <= 0
                    return (
                      <div key={row.variantId} className={`rk-ui-list-row ${out ? 'rk-ui-list-row-alert' : ''}`}>
                        <div className="rk-ui-list-main">
                          <div className="rk-ui-list-title" style={{ fontSize: '0.8125rem' }}>{variant.itemName}</div>
                          <div className="rk-ui-list-meta" style={{ textTransform: 'capitalize' }}>
                            Size {variant.size} · {variant.color} · Qty {row.quantity} · <Money amount={variant.price} />
                          </div>
                        </div>
                        <div className="rk-ui-list-side">
                          {out ? (
                            <Pill tone="alert">Out of stock</Pill>
                          ) : (
                            <button type="button" className="rk-ui-btn" onClick={() => addCustomerCartLineToSale(row)}>Add to sale</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rk-admin-card" style={{ marginBottom: 0 }}>
            <SectionHead
              icon={<span className="rk-pos-step">3</span>}
              title="Order & payment"
              desc={cart.length === 0 ? 'Items you add will appear here.' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}${selectedCustomer ? ` · for ${selectedCustomer.full_name}` : ' · walk-in'}`}
            />

            {cart.length === 0 ? (
              <EmptyState title="No items yet" hint="Tap products in step 1 to start the sale." />
            ) : (
              <>
                <div>
                  {cart.map((l) => (
                    <div key={l.variantId} className="rk-pos-line">
                      <div className="rk-pos-line-info">
                        <div className="rk-pos-line-name">{l.itemName}</div>
                        <div className="rk-pos-line-meta">Size {l.size} · {l.color} · <Money amount={l.unitPrice} /> each</div>
                        {l.quantity >= l.maxQty && <div className="rk-pos-line-max">That’s all we have in stock ({l.maxQty})</div>}
                      </div>
                      <div className="rk-pos-stepper">
                        <button
                          type="button"
                          onClick={() => (l.quantity <= 1 ? removeLine(l.variantId) : updateQuantity(l.variantId, l.quantity - 1))}
                          aria-label={l.quantity <= 1 ? `Remove ${l.itemName}` : 'One less'}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={l.quantity}
                          min={1}
                          max={l.maxQty}
                          aria-label={`Quantity of ${l.itemName}`}
                          onChange={(e) => updateQuantity(l.variantId, Number(e.target.value))}
                        />
                        <button type="button" onClick={() => updateQuantity(l.variantId, l.quantity + 1)} disabled={l.quantity >= l.maxQty} aria-label="One more">
                          +
                        </button>
                      </div>
                      <span className="rk-pos-line-total"><Money amount={l.unitPrice * l.quantity} /></span>
                      <button type="button" className="rk-pos-remove" onClick={() => removeLine(l.variantId)} aria-label={`Remove ${l.itemName}`}>
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rk-pos-section">
                  <div className="rk-pos-section-title"><IconWallet size={16} /> How is the customer paying?</div>
                  <div className="rk-pos-pay">
                    <Segmented
                      label="Payment method"
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      options={paymentMethods.map((m) => ({ value: m, label: paymentLabel[m] }))}
                    />
                  </div>
                  <div className="rk-ui-form" style={{ marginTop: '0.875rem' }}>
                    <label className="rk-ui-field">
                      <span>Discount (₱)</span>
                      <input type="number" min={0} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} onFocus={(e) => e.target.select()} />
                      <span className="rk-ui-field-hint">Amount off, in pesos. Leave 0 if none.</span>
                    </label>
                    <label className="rk-ui-field">
                      <span>Tax (₱)</span>
                      <input type="number" min={0} inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} onFocus={(e) => e.target.select()} />
                      <span className="rk-ui-field-hint">Added on top. Leave 0 if prices already include it.</span>
                    </label>
                  </div>
                  {negativeAmount && <div style={{ marginTop: '0.75rem' }}><Notice tone="alert">Discount and tax can’t be negative.</Notice></div>}
                  {!negativeAmount && reductionsExceedSubtotal && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <Notice tone="info">Discount and voucher are more than the items cost — the total will be ₱0.</Notice>
                    </div>
                  )}
                </div>

                <div className="rk-pos-totals" aria-live="polite">
                  <div className="rk-pos-totals-row"><span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><span><Money amount={subtotal} /></span></div>
                  {discountNum > 0 && <div className="rk-pos-totals-row rk-pos-totals-row-minus"><span>Discount</span><span>−<Money amount={discountNum} /></span></div>}
                  {voucherValue > 0 && (
                    <div className="rk-pos-totals-row rk-pos-totals-row-minus">
                      <span>Voucher {customerVouchers.find((v) => v.id === selectedVoucherId)?.code}</span>
                      <span>−<Money amount={voucherValue} /></span>
                    </div>
                  )}
                  {taxNum > 0 && <div className="rk-pos-totals-row"><span>Tax</span><span>+<Money amount={taxNum} /></span></div>}
                  <div className="rk-pos-totals-total">
                    <span className="rk-pos-totals-total-label">Total to collect</span>
                    <span className="rk-pos-totals-total-value"><Money amount={total} /></span>
                  </div>
                </div>

                <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg rk-pos-complete" onClick={submitSale} disabled={!canComplete}>
                  {submitting ? 'Saving sale…' : <>Complete sale — <Money amount={total} /></>}
                </button>
                <p className="rk-pos-complete-sub">Paid by {paymentLabel[paymentMethod]} · stock is deducted automatically</p>
                <button type="button" className="rk-ui-btn rk-ui-btn-ghost rk-pos-clear" onClick={clearSale} disabled={submitting}>
                  Start over (clear items)
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rk-admin-card" style={{ marginTop: '1.5rem' }}>
        <SectionHead icon={<IconClock />} title="Recent sales" desc="The last 10 in-store sales and online orders, newest first." />
        {recentSales.length === 0 ? (
          <EmptyState title="No sales yet" hint="Completed sales will show up here." />
        ) : (
          <div className="rk-ui-list">
            {recentSales.map((s) => {
              const st = saleStatus(s.status)
              return (
                <div key={`${s.channel}-${s.id}`} className={`rk-ui-list-row ${st.tone === 'alert' ? 'rk-ui-list-row-alert' : st.tone === 'warn' ? 'rk-ui-list-row-warn' : ''}`}>
                  <div className="rk-ui-list-main">
                    <div className="rk-ui-list-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {s.order_number}
                      <Pill tone={s.channel === 'Online' ? 'info' : 'neutral'}>{s.channel}</Pill>
                    </div>
                    <div className="rk-ui-list-meta">
                      {s.customer_name ?? (s.channel === 'Online' ? 'Customer' : 'Walk-in')}
                      {s.channel === 'In-store' && s.staff_name ? ` · rung up by ${s.staff_name}` : ''}
                      {fmtWhen(s.sale_date) ? ` · ${fmtWhen(s.sale_date)}` : ''}
                    </div>
                  </div>
                  <div className="rk-ui-list-side">
                    <span className="rk-pos-recent-pay">{s.payment_method.replace('_', ' ')}</span>
                    <span className="rk-pos-recent-total"><Money amount={Number(s.total)} /></span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
