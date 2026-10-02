import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconReceipt, IconTruck } from './adminIcons'
import { EmptyState, Modal, Notice, Pill, SearchInput, Segmented, SectionHead, StatGrid, StatTile, Toolbar } from './adminUi'
import type { Tone } from './adminUi'
import type { PurchaseOrderStatus } from '../../types/database.types'

interface VendorRow {
  id: string
  name: string
  contact_name: string
  phone: string
  email: string
}

// purchase_orders_detail is `po.* + vendor/staff names`, so the extra fields
// below come back from the same select('*') the page always used.
interface PurchaseOrderRow {
  id: string
  po_number: string
  vendor_id: string
  vendor_name: string
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_cost: number
  status: PurchaseOrderStatus
  notes: string | null
  staff_name: string | null
}

// How many recent purchase orders the page loads (unchanged from before).
const ORDER_LIMIT = 25

const statusOptions: PurchaseOrderStatus[] = ['draft', 'ordered', 'shipped', 'received', 'cancelled']

// Plain-language wording for each purchase order status.
const statusMeta: Record<PurchaseOrderStatus, { label: string; tone: Tone; help: string }> = {
  draft: { label: 'Draft', tone: 'neutral', help: 'Written down, not sent to the supplier yet' },
  ordered: { label: 'Ordered', tone: 'info', help: 'Sent to the supplier, waiting for them to ship' },
  shipped: { label: 'On the way', tone: 'warn', help: 'The supplier has shipped it' },
  received: { label: 'Received', tone: 'ok', help: 'The delivery arrived at the store' },
  cancelled: { label: 'Cancelled', tone: 'neutral', help: 'No longer happening' },
}

const isOpen = (s: PurchaseOrderStatus) => s === 'draft' || s === 'ordered' || s === 'shipped'

type OrderFilter = 'open' | PurchaseOrderStatus | 'all'

const emptyVendorForm = { name: '', contact_name: '', phone: '', email: '' }
const emptyPoForm = { vendor_id: '', status: 'draft' as PurchaseOrderStatus, expected_date: '', total_cost: '', notes: '' }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Dates come back as plain "YYYY-MM-DD"; build them in local time so the day
// never shifts.
function fmtDay(d: string | null) {
  if (!d) return null
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  if (!y || !m || !day) return d
  return new Date(y, m - 1, day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isLate(o: PurchaseOrderRow) {
  return (o.status === 'ordered' || o.status === 'shipped') && !!o.expected_date && o.expected_date.slice(0, 10) < todayIso()
}

export default function AdminVendors() {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const [vendorForm, setVendorForm] = useState(emptyVendorForm)
  const [addingVendor, setAddingVendor] = useState(false)
  const [vendorDraft, setVendorDraft] = useState<VendorRow | null>(null)
  const [removingVendor, setRemovingVendor] = useState<VendorRow | null>(null)

  const [addingPo, setAddingPo] = useState(false)
  const [poForm, setPoForm] = useState(emptyPoForm)
  const [confirmStatus, setConfirmStatus] = useState<{ order: PurchaseOrderRow; status: PurchaseOrderStatus } | null>(null)

  const [saving, setSaving] = useState(false)
  const [vendorQuery, setVendorQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('open')

  const load = async () => {
    setLoading(true)
    setError(null)
    const [vendorsRes, ordersRes] = await Promise.all([
      supabase.from('vendors').select('id, name, contact_name, phone, email').eq('is_active', true).order('name'),
      supabase.from('purchase_orders_detail').select('*').order('order_date', { ascending: false }).limit(ORDER_LIMIT),
    ])
    if (vendorsRes.error || ordersRes.error) {
      setError((vendorsRes.error ?? ordersRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    setVendors((vendorsRes.data ?? []) as VendorRow[])
    setOrders((ordersRes.data ?? []) as PurchaseOrderRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const showFlash = (message: string) => {
    setFlash(message)
    window.setTimeout(() => setFlash(null), 4000)
  }

  const addVendor = async () => {
    if (!vendorForm.name.trim()) return
    setSaving(true)
    const { error: insertError } = await supabase.from('vendors').insert({
      name: vendorForm.name.trim(),
      contact_name: vendorForm.contact_name.trim(),
      phone: vendorForm.phone.trim(),
      email: vendorForm.email.trim(),
    })
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    showFlash(`Supplier “${vendorForm.name.trim()}” added.`)
    setVendorForm(emptyVendorForm)
    setAddingVendor(false)
    load()
  }

  const saveVendor = async () => {
    if (!vendorDraft || !vendorDraft.name.trim()) return
    setSaving(true)
    const { error: updateError } = await supabase
      .from('vendors')
      .update({
        name: vendorDraft.name,
        contact_name: vendorDraft.contact_name,
        phone: vendorDraft.phone,
        email: vendorDraft.email,
      })
      .eq('id', vendorDraft.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    showFlash(`Supplier “${vendorDraft.name}” updated.`)
    setVendorDraft(null)
    load()
  }

  // Soft delete: the supplier is hidden (is_active = false); past purchase
  // orders keep pointing at it.
  const removeVendor = async (id: string) => {
    setSaving(true)
    const { error: deleteError } = await supabase.from('vendors').update({ is_active: false }).eq('id', id)
    setSaving(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    showFlash('Supplier removed from your list.')
    setRemovingVendor(null)
    load()
  }

  const addPurchaseOrder = async () => {
    if (!poForm.vendor_id) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const staffId = userData.user?.id
    if (!staffId) {
      setSaving(false)
      setError('You seem to be signed out. Please sign in again and retry.')
      return
    }
    const { error: insertError } = await supabase.from('purchase_orders').insert({
      vendor_id: poForm.vendor_id,
      staff_id: staffId,
      status: poForm.status,
      expected_date: poForm.expected_date || null,
      total_cost: poForm.total_cost ? Number(poForm.total_cost) : 0,
      notes: poForm.notes.trim(),
    })
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    showFlash('Purchase order saved.')
    setPoForm(emptyPoForm)
    setAddingPo(false)
    load()
  }

  const updatePoStatus = async (id: string, status: PurchaseOrderStatus) => {
    setSaving(true)
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status, received_date: status === 'received' ? new Date().toISOString().slice(0, 10) : null })
      .eq('id', id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    showFlash(`Order marked as “${statusMeta[status].label}”.`)
    setConfirmStatus(null)
    load()
  }

  // Received and Cancelled are the big ones — ask first. Everything else
  // applies straight away.
  const requestStatus = (order: PurchaseOrderRow, status: PurchaseOrderStatus) => {
    if (status === order.status) return
    if (status === 'received' || status === 'cancelled' || order.status === 'received') {
      setConfirmStatus({ order, status })
      return
    }
    updatePoStatus(order.id, status)
  }

  const openVendorAdd = () => {
    setVendorForm(emptyVendorForm)
    setAddingVendor(true)
  }

  const openPoAdd = (vendorId = '') => {
    setPoForm({ ...emptyPoForm, vendor_id: vendorId })
    setAddingPo(true)
  }

  // ---- derived numbers ----
  const stats = useMemo(() => {
    let open = 0
    let shipped = 0
    let late = 0
    let onOrder = 0
    for (const o of orders) {
      if (isOpen(o.status)) {
        open += 1
        onOrder += Number(o.total_cost) || 0
      }
      if (o.status === 'shipped') shipped += 1
      if (isLate(o)) late += 1
    }
    return { open, shipped, late, onOrder }
  }, [orders])

  const openByVendor = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orders) if (isOpen(o.status)) m.set(o.vendor_id, (m.get(o.vendor_id) ?? 0) + 1)
    return m
  }, [orders])

  const statusCounts = useMemo(() => {
    const c: Record<PurchaseOrderStatus, number> = { draft: 0, ordered: 0, shipped: 0, received: 0, cancelled: 0 }
    for (const o of orders) c[o.status] += 1
    return c
  }, [orders])

  const filteredVendors = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) => `${v.name} ${v.contact_name} ${v.phone} ${v.email}`.toLowerCase().includes(q))
  }, [vendors, vendorQuery])

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase()
    return orders.filter((o) => {
      if (orderFilter === 'open' && !isOpen(o.status)) return false
      if (orderFilter !== 'open' && orderFilter !== 'all' && o.status !== orderFilter) return false
      if (q && !`${o.po_number} ${o.vendor_name} ${o.notes ?? ''} ${o.staff_name ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [orders, orderQuery, orderFilter])

  const limitNote = orders.length >= ORDER_LIMIT ? ` (from the ${ORDER_LIMIT} most recent orders)` : ''

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{vendorStyles}</style>

      {error && (
        <Notice tone="alert" onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {flash && <Notice tone="ok" onDismiss={() => setFlash(null)}>{flash}</Notice>}

      <StatGrid>
        <StatTile label="Suppliers" value={loading ? '—' : vendors.length} sub="active in your list" icon={<IconTruck size={16} />} />
        <StatTile
          label="Open orders"
          value={loading ? '—' : stats.open}
          sub="draft, ordered or on the way"
          tone="info"
          active={orderFilter === 'open'}
          onClick={() => setOrderFilter('open')}
        />
        <StatTile
          label="On the way"
          value={loading ? '—' : stats.shipped}
          sub={stats.late > 0 ? `${stats.late} past expected date` : 'shipped by supplier'}
          tone={stats.late > 0 ? 'alert' : 'warn'}
          active={orderFilter === 'shipped'}
          onClick={() => setOrderFilter('shipped')}
        />
        <StatTile
          label="Amount on order"
          value={loading ? '—' : <Money amount={stats.onOrder} />}
          sub={`total cost of open orders${limitNote}`}
        />
      </StatGrid>

      {/* ---------------- suppliers ---------------- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconTruck />}
          title="Suppliers"
          desc="The people and shops you buy stock from. Keep their contact details here so anyone on the team can reorder."
          actions={
            <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={openVendorAdd}>
              + Add supplier
            </button>
          }
        />

        {vendors.length > 3 && (
          <Toolbar>
            <SearchInput value={vendorQuery} onChange={setVendorQuery} placeholder="Search supplier, contact, phone or email…" />
          </Toolbar>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : vendors.length === 0 ? (
          <EmptyState
            title="Add your first supplier"
            hint="Save a supplier’s name and contact details, then you can record purchase orders with them."
            action={<button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={openVendorAdd}>+ Add supplier</button>}
          />
        ) : filteredVendors.length === 0 ? (
          <EmptyState title="No supplier matches your search" hint="Check the spelling or clear the search box." />
        ) : (
          <div className="rk-ui-list">
            {filteredVendors.map((v) => {
              const openCount = openByVendor.get(v.id) ?? 0
              return (
                <div key={v.id} className="rk-ui-list-row">
                  <div className="rk-vnd-avatar" aria-hidden="true">{v.name.trim().charAt(0).toUpperCase() || '?'}</div>
                  <div className="rk-ui-list-main">
                    <div className="rk-ui-list-title">{v.name}</div>
                    <div className="rk-vnd-contact">
                      <span><span className="rk-vnd-k">Contact</span> {v.contact_name || <em>not set</em>}</span>
                      <span>
                        <span className="rk-vnd-k">Phone</span>{' '}
                        {v.phone ? <a href={`tel:${v.phone}`}>{v.phone}</a> : <em>not set</em>}
                      </span>
                      <span>
                        <span className="rk-vnd-k">Email</span>{' '}
                        {v.email ? <a href={`mailto:${v.email}`}>{v.email}</a> : <em>not set</em>}
                      </span>
                    </div>
                  </div>
                  <div className="rk-ui-list-side">
                    <Pill tone="ok">Active</Pill>
                    {openCount > 0 && <Pill tone="info">{openCount} open {openCount === 1 ? 'order' : 'orders'}</Pill>}
                    <button type="button" className="rk-ui-btn" onClick={() => openPoAdd(v.id)}>New order</button>
                    <button type="button" className="rk-ui-btn" onClick={() => setVendorDraft({ ...v })}>Edit</button>
                    <button type="button" className="rk-ui-btn rk-ui-btn-danger" onClick={() => setRemovingVendor(v)}>Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------------- purchase orders ---------------- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconReceipt />}
          title="Purchase orders"
          desc={
            <>
              Stock you’ve ordered from suppliers. Move each order along as it happens:{' '}
              <b>Draft → Ordered → On the way → Received</b>. Showing the {ORDER_LIMIT} most recent orders.
            </>
          }
          actions={
            <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => openPoAdd()} disabled={vendors.length === 0}>
              + New purchase order
            </button>
          }
        />

        {!loading && vendors.length === 0 && (
          <Notice tone="info">Add a supplier first — every purchase order needs one.</Notice>
        )}

        {orders.length > 0 && (
          <Toolbar>
            <Segmented<OrderFilter>
              label="Filter orders by status"
              value={orderFilter}
              onChange={setOrderFilter}
              options={[
                { value: 'open', label: 'Open', count: stats.open },
                { value: 'draft', label: 'Draft', count: statusCounts.draft },
                { value: 'ordered', label: 'Ordered', count: statusCounts.ordered },
                { value: 'shipped', label: 'On the way', count: statusCounts.shipped },
                { value: 'received', label: 'Received', count: statusCounts.received },
                { value: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
                { value: 'all', label: 'All', count: orders.length },
              ]}
            />
            <SearchInput value={orderQuery} onChange={setOrderQuery} placeholder="Search PO number, supplier or notes…" />
          </Toolbar>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            hint="When you order stock from a supplier, record it here so you can track when it arrives."
            action={
              vendors.length > 0 ? (
                <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => openPoAdd()}>+ New purchase order</button>
              ) : undefined
            }
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title={orderQuery ? 'No order matches your search' : `No ${orderFilter === 'open' ? 'open' : statusMeta[orderFilter as PurchaseOrderStatus]?.label.toLowerCase() ?? ''} orders`}
            hint="Try another filter, or press “All” to see every order."
            action={<button type="button" className="rk-ui-btn" onClick={() => { setOrderFilter('all'); setOrderQuery('') }}>Show all orders</button>}
          />
        ) : (
          <div className="rk-ui-list">
            {filteredOrders.map((o) => {
              const meta = statusMeta[o.status]
              const late = isLate(o)
              const rowTone = late ? 'rk-ui-list-row-alert' : o.status === 'received' ? 'rk-ui-list-row-ok' : o.status === 'shipped' ? 'rk-ui-list-row-warn' : ''
              return (
                <div key={o.id} className={`rk-ui-list-row ${rowTone}`}>
                  <div className="rk-ui-list-main">
                    <div className="rk-vnd-po-top">
                      <span className="rk-ui-list-title">{o.vendor_name}</span>
                      <span className="rk-vnd-po-num">{o.po_number}</span>
                    </div>
                    <div className="rk-vnd-po-facts">
                      <span><span className="rk-vnd-k">Ordered</span> {fmtDay(o.order_date) ?? '—'}</span>
                      {o.status === 'received' ? (
                        <span><span className="rk-vnd-k">Received</span> {fmtDay(o.received_date) ?? '—'}</span>
                      ) : o.status !== 'cancelled' ? (
                        <span className={late ? 'rk-vnd-late' : ''}>
                          <span className="rk-vnd-k">Expected</span> {fmtDay(o.expected_date) ?? 'no date set'}
                        </span>
                      ) : null}
                      {o.staff_name && <span><span className="rk-vnd-k">By</span> {o.staff_name}</span>}
                    </div>
                    {o.notes && <div className="rk-vnd-po-notes">{o.notes}</div>}
                  </div>
                  <div className="rk-vnd-po-cost">
                    <span className="rk-vnd-k">Cost</span>
                    <span className="rk-vnd-po-amount"><Money amount={Number(o.total_cost)} /></span>
                  </div>
                  <div className="rk-ui-list-side rk-vnd-po-side">
                    <span title={meta.help}><Pill tone={meta.tone}>{meta.label}</Pill></span>
                    {late && <Pill tone="alert">Late</Pill>}
                    <NextStepButtons order={o} disabled={saving} onPick={(s) => requestStatus(o, s)} />
                    <select
                      className="rk-vnd-status-select"
                      value={o.status}
                      disabled={saving}
                      aria-label={`Change status of ${o.po_number}`}
                      title="Change status"
                      onChange={(e) => requestStatus(o, e.target.value as PurchaseOrderStatus)}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{statusMeta[s].label}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------------- dialogs ---------------- */}
      {addingVendor && (
        <Modal
          title="Add supplier"
          subtitle="Only the name is required. You can fill in the rest later."
          onClose={() => setAddingVendor(false)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setAddingVendor(false)}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={addVendor} disabled={saving || !vendorForm.name.trim()}>
                {saving ? 'Saving…' : 'Save supplier'}
              </button>
            </>
          }
        >
          <VendorFields value={vendorForm} onChange={(patch) => setVendorForm((f) => ({ ...f, ...patch }))} />
        </Modal>
      )}

      {vendorDraft && (
        <Modal
          title="Edit supplier"
          subtitle={vendorDraft.name || 'Supplier details'}
          onClose={() => setVendorDraft(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setVendorDraft(null)}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={saveVendor} disabled={saving || !vendorDraft.name.trim()}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          }
        >
          <VendorFields value={vendorDraft} onChange={(patch) => setVendorDraft((d) => (d ? { ...d, ...patch } : d))} />
        </Modal>
      )}

      {removingVendor && (
        <Modal
          title="Remove supplier?"
          subtitle={removingVendor.name}
          onClose={() => setRemovingVendor(null)}
          width={30}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setRemovingVendor(null)}>Keep supplier</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-danger" onClick={() => removeVendor(removingVendor.id)} disabled={saving}>
                {saving ? 'Removing…' : 'Yes, remove'}
              </button>
            </>
          }
        >
          <p className="rk-vnd-confirm-text">
            <b>{removingVendor.name}</b> will disappear from this list and can’t be picked for new purchase orders.
            Purchase orders you already made with them are kept.
          </p>
        </Modal>
      )}

      {addingPo && (
        <Modal
          title="New purchase order"
          subtitle="Record stock you’re ordering from a supplier."
          onClose={() => setAddingPo(false)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setAddingPo(false)}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={addPurchaseOrder} disabled={saving || !poForm.vendor_id}>
                {saving ? 'Saving…' : 'Save purchase order'}
              </button>
            </>
          }
        >
          <div className="rk-ui-form">
            <label className="rk-ui-field rk-ui-field-full">
              <span>Supplier *</span>
              <select value={poForm.vendor_id} onChange={(e) => setPoForm((f) => ({ ...f, vendor_id: e.target.value }))}>
                <option value="">Choose a supplier…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className="rk-ui-field">
              <span>Status</span>
              <select value={poForm.status} onChange={(e) => setPoForm((f) => ({ ...f, status: e.target.value as PurchaseOrderStatus }))}>
                {statusOptions.map((s) => <option key={s} value={s}>{statusMeta[s].label}</option>)}
              </select>
              <span className="rk-ui-field-hint">{statusMeta[poForm.status].help}.</span>
            </label>
            <label className="rk-ui-field">
              <span>Expected arrival</span>
              <input type="date" value={poForm.expected_date} onChange={(e) => setPoForm((f) => ({ ...f, expected_date: e.target.value }))} />
              <span className="rk-ui-field-hint">Optional. We’ll flag the order as late after this date.</span>
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>Total cost (₱)</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="0"
                value={poForm.total_cost}
                onChange={(e) => setPoForm((f) => ({ ...f, total_cost: e.target.value }))}
              />
              <span className="rk-ui-field-hint">What you’ll pay the supplier for this whole order.</span>
            </label>
            <label className="rk-ui-field rk-ui-field-full">
              <span>Notes</span>
              <textarea
                rows={3}
                placeholder="e.g. 12 pairs Air Force 1 white, sizes 7–11"
                value={poForm.notes}
                onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <span className="rk-ui-field-hint">Optional. What’s in the order, payment terms, tracking number…</span>
            </label>
          </div>
        </Modal>
      )}

      {confirmStatus && (
        <Modal
          title={
            confirmStatus.status === 'received'
              ? 'Mark as received?'
              : confirmStatus.status === 'cancelled'
                ? 'Cancel this order?'
                : `Change to “${statusMeta[confirmStatus.status].label}”?`
          }
          subtitle={`${confirmStatus.order.po_number} · ${confirmStatus.order.vendor_name}`}
          onClose={() => setConfirmStatus(null)}
          width={32}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmStatus(null)}>Go back</button>
              <button
                type="button"
                className={`rk-ui-btn ${confirmStatus.status === 'cancelled' ? 'rk-ui-btn-danger' : 'rk-ui-btn-primary'}`}
                onClick={() => updatePoStatus(confirmStatus.order.id, confirmStatus.status)}
                disabled={saving}
              >
                {saving
                  ? 'Saving…'
                  : confirmStatus.status === 'received'
                    ? 'Yes, it arrived'
                    : confirmStatus.status === 'cancelled'
                      ? 'Yes, cancel order'
                      : 'Yes, change it'}
              </button>
            </>
          }
        >
          {confirmStatus.status === 'received' ? (
            <div className="rk-vnd-confirm-text">
              <p>This records <b>today</b> as the date the delivery arrived.</p>
              <Notice tone="info">
                It does <b>not</b> add the pairs to your stock. After unpacking, go to the <b>Inventory</b> tab and press{' '}
                <b>+ Add stock</b> on each size that came in.
              </Notice>
            </div>
          ) : confirmStatus.status === 'cancelled' ? (
            <p className="rk-vnd-confirm-text">The order stays in your history marked as cancelled. You can change the status back later if needed.</p>
          ) : (
            <p className="rk-vnd-confirm-text">
              This order is currently marked as received. Changing it will clear its received date
              {confirmStatus.order.received_date ? ` (${fmtDay(confirmStatus.order.received_date)})` : ''}.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

// The obvious next move for an order, as one or two labeled buttons.
function NextStepButtons({ order, disabled, onPick }: { order: PurchaseOrderRow; disabled: boolean; onPick: (s: PurchaseOrderStatus) => void }) {
  switch (order.status) {
    case 'draft':
      return (
        <button type="button" className="rk-ui-btn rk-ui-btn-primary" disabled={disabled} onClick={() => onPick('ordered')}>
          Mark as ordered
        </button>
      )
    case 'ordered':
      return (
        <>
          <button type="button" className="rk-ui-btn" disabled={disabled} onClick={() => onPick('shipped')}>
            Mark as on the way
          </button>
          <button type="button" className="rk-ui-btn rk-ui-btn-primary" disabled={disabled} onClick={() => onPick('received')}>
            Mark as received
          </button>
        </>
      )
    case 'shipped':
      return (
        <button type="button" className="rk-ui-btn rk-ui-btn-primary" disabled={disabled} onClick={() => onPick('received')}>
          Mark as received
        </button>
      )
    default:
      return null
  }
}

function VendorFields({
  value,
  onChange,
}: {
  value: { name: string; contact_name: string; phone: string; email: string }
  onChange: (patch: Partial<{ name: string; contact_name: string; phone: string; email: string }>) => void
}) {
  return (
    <div className="rk-ui-form">
      <label className="rk-ui-field rk-ui-field-full">
        <span>Supplier name *</span>
        <input autoFocus value={value.name} placeholder="e.g. Manila Sneaker Supply" onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label className="rk-ui-field rk-ui-field-full">
        <span>Contact person</span>
        <input value={value.contact_name} placeholder="Who you talk to there" onChange={(e) => onChange({ contact_name: e.target.value })} />
      </label>
      <label className="rk-ui-field">
        <span>Phone</span>
        <input type="tel" value={value.phone} placeholder="e.g. 0917 123 4567" onChange={(e) => onChange({ phone: e.target.value })} />
      </label>
      <label className="rk-ui-field">
        <span>Email</span>
        <input type="email" value={value.email} placeholder="orders@supplier.com" onChange={(e) => onChange({ email: e.target.value })} />
      </label>
    </div>
  )
}

const vendorStyles = `
  .rk-vnd-avatar {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.125rem;
    color: var(--text);
  }
  .rk-vnd-contact,
  .rk-vnd-po-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text);
  }
  .rk-vnd-contact em { color: var(--text-faint); font-style: normal; }
  .rk-vnd-contact a { color: inherit; text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 2px; }
  .rk-vnd-contact a:hover { text-decoration-color: var(--text-muted); }
  .rk-vnd-k {
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-right: 0.25rem;
  }
  .rk-vnd-po-top { display: flex; align-items: baseline; gap: 0.625rem; flex-wrap: wrap; }
  .rk-vnd-po-num { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .rk-vnd-po-notes {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .rk-vnd-late { color: var(--accent-red); font-weight: 700; }
  .rk-vnd-late .rk-vnd-k { color: var(--accent-red); }
  .rk-vnd-po-cost { display: flex; flex-direction: column; align-items: flex-end; min-width: 6.5rem; }
  .rk-vnd-po-amount {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    line-height: 1.1;
    color: var(--text);
  }
  .rk-vnd-po-side { max-width: 26rem; }
  .rk-vnd-status-select {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.45rem 0.6rem;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--bg);
    color: var(--text-muted);
    cursor: pointer;
  }
  .rk-vnd-status-select:hover { border-color: var(--text-muted); color: var(--text); }
  .rk-vnd-confirm-text { margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text); }
  .rk-vnd-confirm-text p { margin: 0 0 0.75rem; }
  .rk-vnd-confirm-text .rk-ui-notice { margin-bottom: 0; }
  @media (max-width: 40rem) {
    .rk-vnd-po-cost { flex-direction: row; align-items: baseline; gap: 0.375rem; min-width: 0; }
    .rk-vnd-po-side { max-width: none; }
  }
`
