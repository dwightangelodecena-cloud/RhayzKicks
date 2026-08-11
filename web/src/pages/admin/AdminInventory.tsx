import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconAlertTriangle, IconBox } from './adminIcons'
import type { StockMovementType } from '../../types/database.types'

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function BoxIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></svg>
}

interface InventoryRow {
  sku: string
  item_id: string
  variant_id: string
  item_name: string
  brand: string
  size: string
  color: string
  quantity_on_hand: number
  reorder_level: number
  is_low_stock: boolean
  last_restocked_at: string | null
}

const movementTypes: StockMovementType[] = ['restock', 'adjustment', 'damaged', 'return']
const movementHint: Record<StockMovementType, string> = {
  restock: 'Positive quantity — new stock arrived.',
  adjustment: 'Correcting a miscount. Can be positive or negative.',
  damaged: 'Negative quantity — stock removed as damaged/unsellable.',
  return: 'Positive quantity — a customer return going back on the shelf.',
  sale: '',
}

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [adjustingSku, setAdjustingSku] = useState<string | null>(null)
  const [movementType, setMovementType] = useState<StockMovementType>('restock')
  const [quantityChange, setQuantityChange] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase.from('inventory_detail').select('*').order('item_name')
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setRows((data ?? []) as InventoryRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (lowStockOnly && !r.is_low_stock) return false
      if (!q) return true
      return `${r.item_name} ${r.brand} ${r.sku} ${r.color}`.toLowerCase().includes(q)
    })
  }, [rows, query, lowStockOnly])

  const startAdjust = (sku: string) => {
    setAdjustingSku(sku)
    setMovementType('restock')
    setQuantityChange('')
    setReason('')
    setError(null)
  }

  const submitAdjust = async () => {
    if (!adjustingSku) return
    const change = Number(quantityChange)
    if (!change) return
    setSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('adjust_stock', {
      p_sku: adjustingSku,
      p_quantity_change: change,
      p_type: movementType,
      p_reason: reason.trim(),
    })
    setSaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setAdjustingSku(null)
    load()
  }

  const lowStockCount = rows.filter((r) => r.is_low_stock).length

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-inv-toolbar {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .rk-inv-search {
          position: relative;
          flex: 1;
          min-width: 14rem;
        }
        .rk-inv-search input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--bg);
          color: var(--text);
          font-size: 0.875rem;
        }
        .rk-inv-search svg {
          position: absolute;
          top: 50%;
          left: 0.9rem;
          transform: translateY(-50%);
          color: var(--text-faint);
        }
        .rk-inv-toggle {
          display: flex;
          align-items: center;
          gap: 0.4375rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
        }
        .rk-inv-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: -0.25rem 0 0.75rem;
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
            <h2 className="rk-admin-card-title"><IconBox /> Inventory</h2>
            <p className="rk-admin-card-desc">Stock on hand across every size/colorway. {lowStockCount} at or below reorder level.</p>
          </div>
        </div>

        <div className="rk-inv-toolbar">
          <div className="rk-inv-search">
            <SearchIcon />
            <input placeholder="Search by name, brand, SKU, or color…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <label className="rk-inv-toggle">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="rk-admin-empty">No matching inventory.</p>
        ) : (
          <div className="rk-admin-table-wrap">
            <table className="rk-admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>SKU</th>
                  <th>On Hand</th>
                  <th>Reorder At</th>
                  <th>Status</th>
                  <th>Last Restock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.sku}>
                    <tr>
                      <td>{r.item_name} <span style={{ color: 'var(--text-faint)' }}>· {r.brand}</span></td>
                      <td>{r.size}</td>
                      <td>{r.color}</td>
                      <td>{r.sku}</td>
                      <td>{r.quantity_on_hand}</td>
                      <td>{r.reorder_level}</td>
                      <td>
                        {r.is_low_stock ? (
                          <span className="rk-admin-badge rk-admin-badge-warn"><IconAlertTriangle size={11} /> Low</span>
                        ) : (
                          <span className="rk-admin-badge rk-admin-badge-ok">OK</span>
                        )}
                      </td>
                      <td>{r.last_restocked_at ? new Date(r.last_restocked_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <button className="rk-admin-icon-btn" onClick={() => startAdjust(r.sku)} aria-label="Adjust stock"><BoxIcon /></button>
                      </td>
                    </tr>
                    {adjustingSku === r.sku && (
                      <tr>
                        <td colSpan={9}>
                          <div className="rk-admin-form-panel" style={{ margin: 0 }}>
                            <div className="rk-admin-form-grid">
                              <label className="rk-field">
                                <span className="rk-field-label">Movement type</span>
                                <select value={movementType} onChange={(e) => setMovementType(e.target.value as StockMovementType)}>
                                  {movementTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </label>
                              <label className="rk-field">
                                <span className="rk-field-label">Quantity change</span>
                                <input type="number" value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)} placeholder="e.g. 10 or -2" />
                              </label>
                              <label className="rk-field rk-field-full">
                                <span className="rk-field-label">Reason (optional)</span>
                                <input value={reason} onChange={(e) => setReason(e.target.value)} />
                              </label>
                              <div className="rk-field-full rk-inv-hint">{movementHint[movementType]}</div>
                              <div className="rk-admin-form-actions">
                                <button className="rk-admin-icon-btn" onClick={() => setAdjustingSku(null)} style={{ marginRight: '0.5rem' }}>Cancel</button>
                                <button className="rk-admin-add-btn" onClick={submitAdjust} disabled={saving || !Number(quantityChange)}>
                                  {saving ? 'Saving…' : 'Save Adjustment'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
