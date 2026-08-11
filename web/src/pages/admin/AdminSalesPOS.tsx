import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconReceipt, IconUsers, IconWallet } from './adminIcons'
import AdminOnlineOrders from './AdminOnlineOrders'
import type { PaymentMethod } from '../../types/database.types'

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
  staff_name: string
  total: number
  payment_method: string
  status: string
  sale_date: string
}

const paymentMethods: PaymentMethod[] = ['cash', 'card', 'gcash', 'other']

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
    const [itemsRes, variantsRes, inventoryRes, salesRes, customersRes] = await Promise.all([
      supabase.from('items').select('id, name, brand, base_price').eq('is_active', true),
      supabase.from('item_variants').select('id, item_id, size, color, sku, price_override').eq('is_active', true),
      supabase.from('inventory').select('sku, quantity_on_hand'),
      supabase.from('sales_detail').select('*').order('sale_date', { ascending: false }).limit(10),
      supabase.from('customers').select('id, full_name, phone, loyalty_points').eq('is_active', true).order('full_name').limit(300),
    ])
    if (itemsRes.error || variantsRes.error || inventoryRes.error) {
      setError((itemsRes.error ?? variantsRes.error ?? inventoryRes.error)?.message ?? 'Failed to load catalog.')
      setLoading(false)
      return
    }
    const itemById = new Map(itemsRes.data.map((it) => [it.id, it]))
    const qtyBySku = new Map((inventoryRes.data ?? []).map((r) => [r.sku, r.quantity_on_hand]))
    const rows: VariantRow[] = (variantsRes.data ?? []).flatMap((v) => {
      const item = itemById.get(v.item_id)
      if (!item) return []
      return [{
        variantId: v.id,
        itemId: v.item_id,
        itemName: item.name,
        brand: item.brand,
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: v.price_override ?? item.base_price,
        qtyOnHand: qtyBySku.get(v.sku) ?? 0,
      }]
    })
    setVariants(rows)
    if (!salesRes.error) setRecentSales((salesRes.data ?? []) as RecentSaleRow[])
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
  const voucherValue = customerVouchers.find((v) => v.id === selectedVoucherId)?.value ?? 0
  const discountNum = Number(discount) || 0
  const taxNum = Number(tax) || 0
  const total = Math.max(subtotal - discountNum - voucherValue + taxNum, 0)

  const submitSale = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const staffId = userData.user?.id
    if (!staffId) {
      setError('Could not determine the signed-in staff member.')
      setSubmitting(false)
      return
    }
    const { data, error: rpcError } = await supabase.rpc('create_sale', {
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
      setError(rpcError.message)
      return
    }
    setSuccessMessage(`Sale completed${data ? '' : ''} — total ${total.toFixed(2)} charged.`)
    setCart([])
    setDiscount('0')
    setTax('0')
    clearCustomer()
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-pos-layout {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 64rem) {
          .rk-pos-layout { grid-template-columns: 1fr; }
        }
        .rk-pos-search {
          position: relative;
          margin-bottom: 1rem;
        }
        .rk-pos-search input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg);
          color: var(--text);
          font-size: 0.875rem;
        }
        .rk-pos-search svg {
          position: absolute;
          top: 50%;
          left: 0.9rem;
          transform: translateY(-50%);
          color: var(--text-faint);
        }
        .rk-pos-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
          gap: 0.75rem;
          max-height: 28rem;
          overflow-y: auto;
        }
        .rk-pos-product-card {
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.75rem;
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .rk-pos-product-card:hover {
          border-color: var(--text-faint);
          background: var(--bg-secondary);
        }
        .rk-pos-product-card-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .rk-pos-product-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-pos-product-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0.2rem 0 0.5rem;
        }
        .rk-pos-product-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rk-pos-product-qty {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-faint);
        }
        .rk-pos-cart-line {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0;
          border-bottom: 1px solid var(--border);
        }
        .rk-pos-cart-line:last-child { border-bottom: none; }
        .rk-pos-cart-line-info { flex: 1; min-width: 0; }
        .rk-pos-cart-line-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-pos-cart-line-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-pos-cart-qty-input {
          width: 3.25rem;
          text-align: center;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.3rem;
          background: var(--bg);
          color: var(--text);
        }
        .rk-pos-totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          color: var(--text-muted);
          padding: 0.3rem 0;
        }
        .rk-pos-totals-row-total {
          font-size: 1.125rem;
          font-weight: 900;
          color: var(--text);
          font-family: 'Barlow Condensed', sans-serif;
          border-top: 1px solid var(--border);
          margin-top: 0.5rem;
          padding-top: 0.75rem;
        }
        .rk-pos-customer-chip {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: var(--bg-secondary);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          margin-bottom: 0.75rem;
        }
        .rk-pos-customer-chip-name { font-weight: 700; font-size: 0.8125rem; color: var(--text); flex: 1; }
        .rk-pos-customer-chip-sub { font-size: 0.75rem; color: var(--text-muted); }
        .rk-pos-customer-combobox {
          position: relative;
        }
        .rk-pos-search-inset {
          margin-bottom: 0;
        }
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
        .rk-pos-success {
          background: rgba(12, 163, 12, 0.1);
          color: #0ca30c;
          border: 1px solid rgba(12, 163, 12, 0.2);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
          margin-bottom: 1.25rem;
        }
        .rk-pos-checkout-btn {
          width: 100%;
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: 999px;
          padding: 0.875rem;
          font-weight: 900;
          font-size: 0.8125rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 1rem;
        }
        .rk-pos-checkout-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}
      {successMessage && <div className="rk-pos-success">{successMessage}</div>}

      <div className="rk-pos-layout">
        <div className="rk-admin-card">
          <h2 className="rk-admin-card-title"><IconWallet /> Ring Up a Sale</h2>
          <p className="rk-admin-card-desc">Search the catalog and add items to the cart.</p>
          <div className="rk-pos-search">
            <SearchIcon />
            <input placeholder="Search by name, brand, SKU, or color…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
          </div>
          {loading ? (
            <p className="rk-admin-empty">Loading catalog…</p>
          ) : filteredVariants.length === 0 ? (
            <p className="rk-admin-empty">No matching products.</p>
          ) : (
            <div className="rk-pos-product-grid">
              {filteredVariants.map((v) => {
                const outOfStock = v.qtyOnHand <= 0
                return (
                  <div
                    key={v.variantId}
                    className={`rk-pos-product-card ${outOfStock ? 'rk-pos-product-card-disabled' : ''}`}
                    onClick={() => !outOfStock && addToCart(v)}
                  >
                    <div className="rk-pos-product-name">{v.itemName}</div>
                    <div className="rk-pos-product-meta">{v.color} · Size {v.size} · {v.sku}</div>
                    <div className="rk-pos-product-bottom">
                      <Money amount={v.price} />
                      <span className="rk-pos-product-qty">{outOfStock ? 'Out of stock' : `${v.qtyOnHand} left`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconUsers /> Customer (optional)</h2>
            <p className="rk-admin-card-desc">Attach a customer to award loyalty points or apply a voucher.</p>
            {selectedCustomer ? (
              <div className="rk-pos-customer-chip">
                <div>
                  <div className="rk-pos-customer-chip-name">{selectedCustomer.full_name}</div>
                  <div className="rk-pos-customer-chip-sub">{selectedCustomer.loyalty_points} pts · {customerVouchers.length} voucher(s) available</div>
                </div>
                <button className="rk-admin-icon-btn" onClick={clearCustomer} aria-label="Remove customer"><CloseIcon /></button>
              </div>
            ) : (
              <div className="rk-pos-customer-combobox">
                <div className="rk-pos-search rk-pos-search-inset">
                  <SearchIcon />
                  <input
                    placeholder="Click to browse, or type to search…"
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
                        <div key={c.id} className="rk-pos-customer-result" onClick={() => selectCustomer(c)}>
                          <span>{c.full_name}</span>
                          <span className="rk-pos-customer-result-sub">{c.phone || 'no phone'} · {c.loyalty_points} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedCustomer && customerVouchers.length > 0 && (
              <label className="rk-field" style={{ marginTop: '0.75rem' }}>
                <span className="rk-field-label">Apply voucher</span>
                <select value={selectedVoucherId} onChange={(e) => setSelectedVoucherId(e.target.value)}>
                  <option value="">No voucher</option>
                  {customerVouchers.map((v) => (
                    <option key={v.id} value={v.id}>{v.code} — ₱{v.value} off</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {selectedCustomer && customerCart.length > 0 && (
            <div className="rk-admin-card">
              <div className="rk-admin-card-head">
                <div>
                  <h2 className="rk-admin-card-title"><IconReceipt /> {selectedCustomer.full_name}'s Saved Cart</h2>
                  <p className="rk-admin-card-desc">Items they added to cart on the app — add them to this sale.</p>
                </div>
                <button className="rk-admin-primary-btn" onClick={addAllCustomerCartToSale}>+ Add All</button>
              </div>
              {customerCart.map((row) => {
                const variant = variants.find((v) => v.variantId === row.variantId)
                if (!variant) {
                  return (
                    <div key={row.variantId} className="rk-pos-cart-line">
                      <div className="rk-pos-cart-line-info">
                        <div className="rk-pos-cart-line-meta">No longer available</div>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={row.variantId} className="rk-pos-cart-line">
                    <div className="rk-pos-cart-line-info">
                      <div className="rk-pos-cart-line-name">{variant.itemName}</div>
                      <div className="rk-pos-cart-line-meta">{variant.color} · {variant.size} · Qty {row.quantity} · <Money amount={variant.price} /></div>
                    </div>
                    <button className="rk-admin-primary-btn" onClick={() => addCustomerCartLineToSale(row)} disabled={variant.qtyOnHand <= 0}>
                      {variant.qtyOnHand <= 0 ? 'Out of stock' : 'Add to Cart'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="rk-admin-card">
            <h2 className="rk-admin-card-title"><IconReceipt /> Cart</h2>
            {cart.length === 0 ? (
              <p className="rk-admin-empty">Cart is empty — add products from the left.</p>
            ) : (
              <>
                {cart.map((l) => (
                  <div key={l.variantId} className="rk-pos-cart-line">
                    <div className="rk-pos-cart-line-info">
                      <div className="rk-pos-cart-line-name">{l.itemName}</div>
                      <div className="rk-pos-cart-line-meta">{l.color} · {l.size} · <Money amount={l.unitPrice} /></div>
                    </div>
                    <input
                      type="number"
                      className="rk-pos-cart-qty-input"
                      value={l.quantity}
                      min={1}
                      max={l.maxQty}
                      onChange={(e) => updateQuantity(l.variantId, Number(e.target.value))}
                    />
                    <button className="rk-admin-icon-btn" onClick={() => removeLine(l.variantId)} aria-label="Remove"><TrashIcon /></button>
                  </div>
                ))}

                <div className="rk-admin-form-grid" style={{ marginTop: '1rem' }}>
                  <label className="rk-field">
                    <span className="rk-field-label">Discount (₱)</span>
                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </label>
                  <label className="rk-field">
                    <span className="rk-field-label">Tax (₱)</span>
                    <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
                  </label>
                  <label className="rk-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="rk-field-label">Payment method</span>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                      {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                </div>

                <div className="rk-pos-totals-row"><span>Subtotal</span><span><Money amount={subtotal} /></span></div>
                {discountNum > 0 && <div className="rk-pos-totals-row"><span>Discount</span><span>-<Money amount={discountNum} /></span></div>}
                {voucherValue > 0 && <div className="rk-pos-totals-row"><span>Voucher</span><span>-<Money amount={voucherValue} /></span></div>}
                {taxNum > 0 && <div className="rk-pos-totals-row"><span>Tax</span><span><Money amount={taxNum} /></span></div>}
                <div className="rk-pos-totals-row rk-pos-totals-row-total"><span>Total</span><span><Money amount={total} /></span></div>

                <button className="rk-pos-checkout-btn" onClick={submitSale} disabled={submitting || cart.length === 0}>
                  {submitting ? 'Processing…' : 'Complete Sale'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rk-admin-card">
        <h2 className="rk-admin-card-title"><PlusIcon /> Recent Sales</h2>
        {recentSales.length === 0 ? (
          <p className="rk-admin-empty">No sales yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Staff</th><th>Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.order_number}</td>
                    <td>{s.customer_name ?? 'Walk-in'}</td>
                    <td>{s.staff_name}</td>
                    <td><Money amount={Number(s.total)} /></td>
                    <td>{s.payment_method}</td>
                    <td><span className="rk-admin-badge rk-admin-badge-ok">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminOnlineOrders />
    </div>
  )
}
