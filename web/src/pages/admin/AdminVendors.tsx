import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconReceipt, IconTruck } from './adminIcons'
import type { PurchaseOrderStatus } from '../../types/database.types'

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}

interface VendorRow {
  id: string
  name: string
  contact_name: string
  phone: string
  email: string
}

interface PurchaseOrderRow {
  id: string
  po_number: string
  vendor_name: string
  order_date: string
  expected_date: string | null
  total_cost: number
  status: PurchaseOrderStatus
}

const statusOptions: PurchaseOrderStatus[] = ['draft', 'ordered', 'shipped', 'received', 'cancelled']
const statusBadgeClass: Record<PurchaseOrderStatus, string> = {
  draft: 'rk-po-badge-draft',
  ordered: 'rk-po-badge-ordered',
  shipped: 'rk-po-badge-shipped',
  received: 'rk-po-badge-received',
  cancelled: 'rk-po-badge-cancelled',
}

const emptyVendorForm = { name: '', contact_name: '', phone: '', email: '' }
const emptyPoForm = { vendor_id: '', status: 'draft' as PurchaseOrderStatus, expected_date: '', total_cost: '', notes: '' }

export default function AdminVendors() {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addingVendor, setAddingVendor] = useState(false)
  const [vendorForm, setVendorForm] = useState(emptyVendorForm)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [vendorDraft, setVendorDraft] = useState<VendorRow | null>(null)

  const [addingPo, setAddingPo] = useState(false)
  const [poForm, setPoForm] = useState(emptyPoForm)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [vendorsRes, ordersRes] = await Promise.all([
      supabase.from('vendors').select('id, name, contact_name, phone, email').eq('is_active', true).order('name'),
      supabase.from('purchase_orders_detail').select('*').order('order_date', { ascending: false }).limit(25),
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

  const addVendor = async () => {
    if (!vendorForm.name.trim()) return
    const { error: insertError } = await supabase.from('vendors').insert({
      name: vendorForm.name.trim(),
      contact_name: vendorForm.contact_name.trim(),
      phone: vendorForm.phone.trim(),
      email: vendorForm.email.trim(),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setVendorForm(emptyVendorForm)
    setAddingVendor(false)
    load()
  }

  const startEditVendor = (v: VendorRow) => {
    setEditingVendorId(v.id)
    setVendorDraft({ ...v })
  }

  const saveVendor = async () => {
    if (!vendorDraft) return
    const { error: updateError } = await supabase
      .from('vendors')
      .update({
        name: vendorDraft.name,
        contact_name: vendorDraft.contact_name,
        phone: vendorDraft.phone,
        email: vendorDraft.email,
      })
      .eq('id', vendorDraft.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditingVendorId(null)
    setVendorDraft(null)
    load()
  }

  const removeVendor = async (id: string) => {
    const { error: deleteError } = await supabase.from('vendors').update({ is_active: false }).eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    load()
  }

  const addPurchaseOrder = async () => {
    if (!poForm.vendor_id) return
    const { data: userData } = await supabase.auth.getUser()
    const staffId = userData.user?.id
    if (!staffId) return
    const { error: insertError } = await supabase.from('purchase_orders').insert({
      vendor_id: poForm.vendor_id,
      staff_id: staffId,
      status: poForm.status,
      expected_date: poForm.expected_date || null,
      total_cost: poForm.total_cost ? Number(poForm.total_cost) : 0,
      notes: poForm.notes.trim(),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setPoForm(emptyPoForm)
    setAddingPo(false)
    load()
  }

  const updatePoStatus = async (id: string, status: PurchaseOrderStatus) => {
    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ status, received_date: status === 'received' ? new Date().toISOString().slice(0, 10) : null })
      .eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-po-badge {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
        }
        .rk-po-badge-draft { background: var(--bg-secondary); color: var(--text-faint); }
        .rk-po-badge-ordered { background: rgba(250, 178, 25, 0.16); color: #8a5a00; }
        .rk-po-badge-shipped { background: rgba(236, 131, 90, 0.16); color: #a6421c; }
        .rk-po-badge-received { background: rgba(12, 163, 12, 0.12); color: #0ca30c; }
        .rk-po-badge-cancelled { background: rgba(208, 59, 59, 0.12); color: #d03b3b; }
        .rk-po-status-select {
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.3rem 0.5rem;
          font-size: 0.75rem;
          background: var(--bg);
          color: var(--text);
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconTruck /> Vendors</h2>
            <p className="rk-admin-card-desc">Supplier contacts for restocking.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAddingVendor((a) => !a)}>+ Add Vendor</button>
        </div>

        {addingVendor && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <label className="rk-field">
                <span className="rk-field-label">Vendor name</span>
                <input value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Contact person</span>
                <input value={vendorForm.contact_name} onChange={(e) => setVendorForm((f) => ({ ...f, contact_name: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Phone</span>
                <input value={vendorForm.phone} onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Email</span>
                <input type="email" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addVendor}>Save Vendor</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : vendors.length === 0 ? (
          <p className="rk-admin-empty">No vendors yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const isEditing = editingVendorId === v.id
                  return (
                    <tr key={v.id}>
                      <td>{isEditing && vendorDraft ? <input value={vendorDraft.name} onChange={(e) => setVendorDraft({ ...vendorDraft, name: e.target.value })} /> : v.name}</td>
                      <td>{isEditing && vendorDraft ? <input value={vendorDraft.contact_name} onChange={(e) => setVendorDraft({ ...vendorDraft, contact_name: e.target.value })} /> : v.contact_name || '—'}</td>
                      <td>{isEditing && vendorDraft ? <input value={vendorDraft.phone} onChange={(e) => setVendorDraft({ ...vendorDraft, phone: e.target.value })} /> : v.phone || '—'}</td>
                      <td>{isEditing && vendorDraft ? <input value={vendorDraft.email} onChange={(e) => setVendorDraft({ ...vendorDraft, email: e.target.value })} /> : v.email || '—'}</td>
                      <td>
                        <div className="rk-admin-table-actions">
                          {isEditing ? (
                            <button className="rk-admin-icon-btn" onClick={saveVendor} aria-label="Save">✓</button>
                          ) : (
                            <button className="rk-admin-icon-btn" onClick={() => startEditVendor(v)} aria-label="Edit"><EditIcon /></button>
                          )}
                          <button className="rk-admin-icon-btn" onClick={() => removeVendor(v.id)} aria-label="Remove"><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconReceipt /> Purchase Orders</h2>
            <p className="rk-admin-card-desc">Orders placed with vendors and their shipment status.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAddingPo((a) => !a)} disabled={vendors.length === 0}>+ New PO</button>
        </div>

        {vendors.length === 0 && <p className="rk-admin-empty">Add a vendor first.</p>}

        {addingPo && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <label className="rk-field">
                <span className="rk-field-label">Vendor</span>
                <select value={poForm.vendor_id} onChange={(e) => setPoForm((f) => ({ ...f, vendor_id: e.target.value }))}>
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Status</span>
                <select value={poForm.status} onChange={(e) => setPoForm((f) => ({ ...f, status: e.target.value as PurchaseOrderStatus }))}>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Expected date</span>
                <input type="date" value={poForm.expected_date} onChange={(e) => setPoForm((f) => ({ ...f, expected_date: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Total cost</span>
                <input type="number" value={poForm.total_cost} onChange={(e) => setPoForm((f) => ({ ...f, total_cost: e.target.value }))} />
              </label>
              <label className="rk-field" style={{ gridColumn: '1 / -1' }}>
                <span className="rk-field-label">Notes (optional)</span>
                <input value={poForm.notes} onChange={(e) => setPoForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addPurchaseOrder}>Save PO</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="rk-admin-empty">No purchase orders yet.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Vendor</th>
                  <th>Ordered</th>
                  <th>Expected</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.po_number}</td>
                    <td>{o.vendor_name}</td>
                    <td>{o.order_date}</td>
                    <td>{o.expected_date ?? '—'}</td>
                    <td><Money amount={Number(o.total_cost)} /></td>
                    <td>
                      <select
                        className="rk-po-status-select"
                        value={o.status}
                        onChange={(e) => updatePoStatus(o.id, e.target.value as PurchaseOrderStatus)}
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className={`rk-po-badge ${statusBadgeClass[o.status]}`} style={{ marginLeft: '0.5rem' }}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
