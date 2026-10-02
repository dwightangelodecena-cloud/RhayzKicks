import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconBox } from './adminIcons'
import type { StockMovementType } from '../../types/database.types'

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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

interface MovementRow {
  id: string
  type: StockMovementType
  quantity_change: number
  quantity_after: number
  reason: string | null
  created_at: string
}

type StockStatus = 'ok' | 'low' | 'out'
type Filter = 'all' | 'low' | 'out'

function statusOf(r: InventoryRow): StockStatus {
  if (r.quantity_on_hand <= 0) return 'out'
  if (r.quantity_on_hand <= r.reorder_level) return 'low'
  return 'ok'
}

const statusLabel: Record<StockStatus, string> = { ok: 'In stock', low: 'Low — reorder soon', out: 'Out of stock' }

// What the staff member is doing, in plain words. Each maps to the
// adjust_stock movement type; "count" sets an exact number and is logged as
// an adjustment for the difference.
type Action = 'restock' | 'return' | 'damaged' | 'count'

const actions: { key: Action; title: string; desc: string; qtyLabel: string; reasonHint: string }[] = [
  { key: 'restock', title: 'New delivery arrived', desc: 'Add pairs that just came in.', qtyLabel: 'How many pairs arrived?', reasonHint: 'e.g. Supplier delivery, PO #123' },
  { key: 'return', title: 'Customer returned a pair', desc: 'Put a returned pair back on the shelf.', qtyLabel: 'How many pairs were returned?', reasonHint: 'e.g. Order RK-ON-1234, wrong size' },
  { key: 'damaged', title: 'Damaged / can’t be sold', desc: 'Remove pairs that are damaged or lost.', qtyLabel: 'How many pairs to remove?', reasonHint: 'e.g. Water damage, display pair' },
  { key: 'count', title: 'Fix the count', desc: 'Set the exact number you counted on the shelf.', qtyLabel: 'How many pairs are actually on the shelf?', reasonHint: 'e.g. Monthly stock count' },
]

const movementLabel: Record<StockMovementType, string> = {
  restock: 'Delivery',
  return: 'Return',
  damaged: 'Damaged',
  adjustment: 'Count fix',
  sale: 'Sale',
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<{ row: InventoryRow; action: Action } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = async () => {
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

  const counts = useMemo(() => {
    const c = { units: 0, sizes: rows.length, low: 0, out: 0 }
    for (const r of rows) {
      c.units += Math.max(r.quantity_on_hand, 0)
      const s = statusOf(r)
      if (s === 'low') c.low += 1
      if (s === 'out') c.out += 1
    }
    return c
  }, [rows])

  // Grouped by product so each shoe reads as one block with its sizes inside.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byItem = new Map<string, { name: string; brand: string; rows: InventoryRow[] }>()
    for (const r of rows) {
      const s = statusOf(r)
      if (filter === 'low' && s === 'ok') continue
      if (filter === 'out' && s !== 'out') continue
      if (q && !`${r.item_name} ${r.brand} ${r.sku} ${r.color} ${r.size}`.toLowerCase().includes(q)) continue
      const g = byItem.get(r.item_id) ?? { name: r.item_name, brand: r.brand, rows: [] }
      g.rows.push(r)
      byItem.set(r.item_id, g)
    }
    return [...byItem.entries()]
      .map(([id, g]) => ({ id, ...g, rows: g.rows.sort((a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size, undefined, { numeric: true })) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [rows, query, filter])

  const onSaved = (message: string) => {
    setEditing(null)
    setFlash(message)
    window.setTimeout(() => setFlash(null), 4000)
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{inventoryStyles}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconBox /> Inventory</h2>
            <p className="rk-admin-card-desc">
              How many pairs you have of every size. When a delivery comes in, press <b>+ Add stock</b> on that size.
            </p>
          </div>
        </div>

        <div className="rk-inv-stats">
          <button type="button" className={`rk-inv-stat ${filter === 'all' ? 'rk-inv-stat-active' : ''}`} onClick={() => setFilter('all')}>
            <span className="rk-inv-stat-value">{counts.units.toLocaleString()}</span>
            <span className="rk-inv-stat-label">Pairs in stock</span>
            <span className="rk-inv-stat-sub">across {counts.sizes} sizes · show all</span>
          </button>
          <button type="button" className={`rk-inv-stat rk-inv-stat-low ${filter === 'low' ? 'rk-inv-stat-active' : ''}`} onClick={() => setFilter('low')}>
            <span className="rk-inv-stat-value">{counts.low + counts.out}</span>
            <span className="rk-inv-stat-label">Need restocking</span>
            <span className="rk-inv-stat-sub">low or out of stock</span>
          </button>
          <button type="button" className={`rk-inv-stat rk-inv-stat-out ${filter === 'out' ? 'rk-inv-stat-active' : ''}`} onClick={() => setFilter('out')}>
            <span className="rk-inv-stat-value">{counts.out}</span>
            <span className="rk-inv-stat-label">Out of stock</span>
            <span className="rk-inv-stat-sub">0 pairs left</span>
          </button>
        </div>

        <div className="rk-inv-toolbar">
          <div className="rk-inv-search">
            <SearchIcon />
            <input placeholder="Search product, brand, size, color, or SKU…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="rk-inv-filter" role="group" aria-label="Filter by stock status">
            {(['all', 'low', 'out'] as Filter[]).map((f) => (
              <button key={f} type="button" className={filter === f ? 'rk-inv-filter-active' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'low' ? 'Needs restock' : 'Out of stock'}
              </button>
            ))}
          </div>
        </div>

        <div className="rk-inv-legend">
          <span><i className="rk-inv-dot rk-inv-dot-ok" /> In stock</span>
          <span><i className="rk-inv-dot rk-inv-dot-low" /> Low: at or below its alert level</span>
          <span><i className="rk-inv-dot rk-inv-dot-out" /> Out of stock: 0 left</span>
        </div>

        {flash && <div className="rk-inv-flash">{flash}</div>}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="rk-admin-empty">
            {filter === 'all' && !query ? 'No inventory yet — add sizes to a product in the Products tab.' : 'Nothing matches. Try “All” or clear the search.'}
          </p>
        ) : (
          <div className="rk-inv-groups">
            {groups.map((g) => {
              const total = g.rows.reduce((s, r) => s + Math.max(r.quantity_on_hand, 0), 0)
              const needs = g.rows.filter((r) => statusOf(r) !== 'ok').length
              return (
                <section key={g.id} className="rk-inv-group">
                  <header className="rk-inv-group-head">
                    <div>
                      <div className="rk-inv-group-name">{g.name}</div>
                      <div className="rk-inv-group-meta">{g.brand} · {total} {total === 1 ? 'pair' : 'pairs'} total</div>
                    </div>
                    {needs > 0 && <span className="rk-inv-pill rk-inv-pill-low">{needs} {needs === 1 ? 'size needs' : 'sizes need'} restocking</span>}
                  </header>

                  <div className="rk-inv-cols" aria-hidden="true">
                    <span>Size / Color</span>
                    <span>Pairs left</span>
                    <span>Status</span>
                    <span>Last delivery</span>
                    <span />
                  </div>

                  {g.rows.map((r) => {
                    const s = statusOf(r)
                    const scale = Math.max(r.reorder_level * 3, r.quantity_on_hand, 1)
                    return (
                      <div key={r.sku} className={`rk-inv-row rk-inv-row-${s}`}>
                        <div className="rk-inv-variant">
                          <span className="rk-inv-size">Size {r.size || '—'}</span>
                          <span className="rk-inv-color">{r.color || 'No color'}</span>
                          <span className="rk-inv-sku">SKU {r.sku}</span>
                        </div>
                        <div className="rk-inv-qty">
                          <span className="rk-inv-qty-num">{r.quantity_on_hand}</span>
                          <div className="rk-inv-bar" title={`${r.quantity_on_hand} left · alert at ${r.reorder_level}`}>
                            <div className="rk-inv-bar-fill" style={{ width: `${Math.min(100, (Math.max(r.quantity_on_hand, 0) / scale) * 100)}%` }} />
                            <div className="rk-inv-bar-mark" style={{ left: `${(r.reorder_level / scale) * 100}%` }} />
                          </div>
                          <span className="rk-inv-alert-at">alert at {r.reorder_level}</span>
                        </div>
                        <div>
                          <span className={`rk-inv-pill rk-inv-pill-${s}`}>{statusLabel[s]}</span>
                        </div>
                        <div className="rk-inv-last">{fmtDate(r.last_restocked_at)}</div>
                        <div className="rk-inv-actions">
                          <button type="button" className="rk-inv-btn rk-inv-btn-primary" onClick={() => setEditing({ row: r, action: 'restock' })}>
                            + Add stock
                          </button>
                          <button type="button" className="rk-inv-btn" onClick={() => setEditing({ row: r, action: 'count' })}>
                            Other changes
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <StockDialog row={editing.row} initialAction={editing.action} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </div>
  )
}

function StockDialog({
  row,
  initialAction,
  onClose,
  onSaved,
}: {
  row: InventoryRow
  initialAction: Action
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [action, setAction] = useState<Action>(initialAction)
  const [qty, setQty] = useState(initialAction === 'count' ? String(row.quantity_on_hand) : '')
  const [reason, setReason] = useState('')
  const [alertAt, setAlertAt] = useState(String(row.reorder_level))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<MovementRow[] | null>(null)

  useEffect(() => {
    supabase
      .from('stock_movements')
      .select('id, type, quantity_change, quantity_after, reason, created_at')
      .eq('sku', row.sku)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setHistory((data ?? []) as MovementRow[]))
  }, [row.sku])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const current = row.quantity_on_hand
  const n = Math.floor(Number(qty))
  const valid = qty.trim() !== '' && Number.isFinite(n) && n >= 0
  // Signed change to send to adjust_stock.
  const change = !valid ? 0 : action === 'count' ? n - current : action === 'damaged' ? -n : n
  const after = current + change
  const meta = actions.find((a) => a.key === action)!

  const alertNum = Math.floor(Number(alertAt))
  const alertValid = alertAt.trim() !== '' && Number.isFinite(alertNum) && alertNum >= 0
  const alertChanged = alertValid && alertNum !== row.reorder_level

  let problem: string | null = null
  if (qty.trim() !== '' && !valid) problem = 'Enter a whole number, 0 or more.'
  else if (action === 'damaged' && valid && n > current) problem = `You only have ${current} — you can’t remove ${n}.`
  else if (action !== 'count' && valid && n === 0) problem = 'Enter at least 1.'

  const canSave = !saving && !problem && ((valid && change !== 0) || alertChanged) && (alertAt.trim() === '' || alertValid)

  const pickAction = (a: Action) => {
    setAction(a)
    setQty(a === 'count' ? String(current) : '')
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    if (valid && change !== 0) {
      const { error: rpcError } = await supabase.rpc('adjust_stock', {
        p_sku: row.sku,
        p_quantity_change: change,
        p_type: action === 'count' ? 'adjustment' : action,
        p_reason: reason.trim() || (action === 'count' ? `Counted ${n} on the shelf (was ${current})` : ''),
      })
      if (rpcError) {
        setSaving(false)
        return setError(rpcError.message)
      }
    }
    if (alertChanged) {
      const { error: updateError } = await supabase.from('inventory').update({ reorder_level: alertNum }).eq('sku', row.sku)
      if (updateError) {
        setSaving(false)
        return setError(updateError.message)
      }
    }
    setSaving(false)
    const label = `${row.item_name} · Size ${row.size}`
    onSaved(
      valid && change !== 0
        ? `Saved — ${label} now has ${after} ${after === 1 ? 'pair' : 'pairs'}.`
        : `Saved — ${label} will alert at ${alertNum} or fewer.`,
    )
  }

  const saveLabel = saving
    ? 'Saving…'
    : !valid || change === 0
      ? alertChanged
        ? 'Save alert level'
        : 'Save'
      : action === 'count'
        ? `Set to ${after} ${after === 1 ? 'pair' : 'pairs'}`
        : change > 0
        ? `Add ${change} ${change === 1 ? 'pair' : 'pairs'}`
        : `Remove ${-change} ${change === -1 ? 'pair' : 'pairs'}`

  return createPortal(
    <div className="rk-inv-modal-backdrop" onClick={onClose}>
      <style>{inventoryStyles}</style>
      <div className="rk-inv-modal" role="dialog" aria-modal="true" aria-labelledby="rk-inv-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="rk-inv-modal-head">
          <div>
            <h2 className="rk-inv-modal-title" id="rk-inv-modal-title">Update stock</h2>
            <p className="rk-inv-modal-sub">
              <b>{row.item_name}</b> · Size {row.size} · <span className="rk-inv-cap">{row.color}</span> <span className="rk-inv-sku">· SKU {row.sku}</span>
            </p>
          </div>
          <button type="button" className="rk-inv-modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="rk-inv-modal-body">
          <div className="rk-inv-step">1. What happened?</div>
          <div className="rk-inv-actions-grid">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`rk-inv-action ${action === a.key ? 'rk-inv-action-active' : ''}`}
                onClick={() => pickAction(a.key)}
                aria-pressed={action === a.key}
              >
                <span className="rk-inv-action-title">{a.title}</span>
                <span className="rk-inv-action-desc">{a.desc}</span>
              </button>
            ))}
          </div>

          <div className="rk-inv-step">2. {meta.qtyLabel}</div>
          <div className="rk-inv-qty-row">
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) save()
              }}
              placeholder="0"
              className="rk-inv-qty-input"
            />
            {action !== 'count' && (
              <div className="rk-inv-quick">
                {[1, 5, 10, 20].map((v) => (
                  <button key={v} type="button" onClick={() => setQty(String((valid ? n : 0) + v))}>+{v}</button>
                ))}
              </div>
            )}
          </div>

          <div className={`rk-inv-preview ${change > 0 ? 'rk-inv-preview-up' : change < 0 ? 'rk-inv-preview-down' : ''}`}>
            <span>Pairs on hand</span>
            <span className="rk-inv-preview-nums">
              {current} <span aria-hidden="true">→</span> <b>{valid && !problem ? after : current}</b>
            </span>
          </div>
          {problem && <p className="rk-inv-problem">{problem}</p>}

          <label className="rk-inv-field">
            <span>Note (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={meta.reasonHint} />
          </label>

          <label className="rk-inv-field rk-inv-field-inline">
            <span>Warn me when this size drops to</span>
            <input type="number" min={0} step={1} value={alertAt} onChange={(e) => setAlertAt(e.target.value)} />
            <span>pairs or fewer</span>
          </label>

          {error && <p className="rk-inv-problem">{error}</p>}

          <div className="rk-inv-modal-foot">
            <button type="button" className="rk-inv-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="rk-inv-btn rk-inv-btn-primary rk-inv-btn-lg" onClick={save} disabled={!canSave}>{saveLabel}</button>
          </div>

          <div className="rk-inv-step rk-inv-step-history">Recent changes to this size</div>
          {history === null ? (
            <p className="rk-inv-muted">Loading…</p>
          ) : history.length === 0 ? (
            <p className="rk-inv-muted">No changes recorded yet.</p>
          ) : (
            <ul className="rk-inv-history">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="rk-inv-history-when">{fmtDateTime(h.created_at)}</span>
                  <span className="rk-inv-history-what">{movementLabel[h.type] ?? h.type}{h.reason ? ` — ${h.reason}` : ''}</span>
                  <span className={`rk-inv-history-change ${h.quantity_change > 0 ? 'rk-inv-up' : 'rk-inv-down'}`}>
                    {h.quantity_change > 0 ? `+${h.quantity_change}` : h.quantity_change}
                  </span>
                  <span className="rk-inv-history-after">→ {h.quantity_after}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const inventoryStyles = `
  .rk-inv-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .rk-inv-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
    text-align: left;
    font: inherit;
    color: var(--text);
    cursor: pointer;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-top: 3px solid var(--text);
    border-radius: 0.875rem;
    padding: 0.875rem 1rem;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .rk-inv-stat:hover { transform: translateY(-1px); border-color: var(--text-muted); }
  .rk-inv-stat-low { border-top-color: #f5a400; }
  .rk-inv-stat-out { border-top-color: var(--accent-red); }
  .rk-inv-stat-active { box-shadow: 0 0 0 2px var(--text) inset; }
  .rk-inv-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.875rem;
    line-height: 1;
  }
  .rk-inv-stat-low .rk-inv-stat-value { color: #f5a400; }
  .rk-inv-stat-out .rk-inv-stat-value { color: var(--accent-red); }
  .rk-inv-stat-label {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-top: 0.25rem;
  }
  .rk-inv-stat-sub { font-size: 0.75rem; color: var(--text-muted); }

  .rk-inv-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .rk-inv-search { position: relative; flex: 1; min-width: 14rem; }
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
  .rk-inv-filter {
    display: inline-flex;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.2rem;
  }
  .rk-inv-filter button {
    border: none;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }
  .rk-inv-filter .rk-inv-filter-active { background: var(--text); color: var(--bg); }

  .rk-inv-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }
  .rk-inv-legend span { display: inline-flex; align-items: center; gap: 0.375rem; }
  .rk-inv-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }
  .rk-inv-dot-ok { background: #0ca30c; }
  .rk-inv-dot-low { background: #f5a400; }
  .rk-inv-dot-out { background: var(--accent-red); }

  .rk-inv-flash {
    background: rgba(12, 163, 12, 0.12);
    color: #0ca30c;
    border: 1px solid rgba(12, 163, 12, 0.35);
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.625rem 0.875rem;
    border-radius: 0.625rem;
    margin-bottom: 1rem;
  }

  .rk-inv-groups { display: flex; flex-direction: column; gap: 1rem; }
  .rk-inv-group {
    border: 1px solid var(--border);
    border-radius: 0.875rem;
    overflow: hidden;
  }
  .rk-inv-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.875rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }
  .rk-inv-group-name { font-weight: 800; font-size: 0.9375rem; color: var(--text); }
  .rk-inv-group-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem; }

  .rk-inv-cols,
  .rk-inv-row {
    display: grid;
    grid-template-columns: minmax(10rem, 1.3fr) minmax(10rem, 1.4fr) minmax(8rem, 1fr) minmax(6rem, 0.8fr) auto;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem 1rem;
  }
  .rk-inv-cols {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    border-bottom: 1px solid var(--border);
  }
  .rk-inv-row + .rk-inv-row { border-top: 1px solid var(--border); }
  .rk-inv-row { border-left: 3px solid transparent; }
  .rk-inv-row-low { border-left-color: #f5a400; }
  .rk-inv-row-out { border-left-color: var(--accent-red); background: rgba(254, 0, 0, 0.03); }

  .rk-inv-variant { display: flex; flex-direction: column; min-width: 0; }
  .rk-inv-size { font-weight: 800; font-size: 0.9375rem; color: var(--text); }
  .rk-inv-color { font-size: 0.8125rem; color: var(--text-muted); text-transform: capitalize; }
  .rk-inv-sku { font-size: 0.6875rem; color: var(--text-faint); font-family: ui-monospace, monospace; }

  .rk-inv-qty { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.125rem 0.625rem; }
  .rk-inv-qty-num {
    grid-row: span 2;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.625rem;
    line-height: 1;
    min-width: 2ch;
    color: var(--text);
  }
  .rk-inv-row-low .rk-inv-qty-num { color: #f5a400; }
  .rk-inv-row-out .rk-inv-qty-num { color: var(--accent-red); }
  .rk-inv-bar {
    position: relative;
    height: 6px;
    border-radius: 999px;
    background: var(--border);
    overflow: visible;
  }
  .rk-inv-bar-fill { height: 100%; border-radius: 999px; background: #0ca30c; }
  .rk-inv-row-low .rk-inv-bar-fill { background: #f5a400; }
  .rk-inv-row-out .rk-inv-bar-fill { background: var(--accent-red); }
  .rk-inv-bar-mark {
    position: absolute;
    top: -3px;
    width: 2px;
    height: 12px;
    background: var(--text-muted);
    transform: translateX(-1px);
  }
  .rk-inv-alert-at { font-size: 0.6875rem; color: var(--text-faint); }

  .rk-inv-pill {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.3rem 0.625rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .rk-inv-pill-ok { background: rgba(12, 163, 12, 0.12); color: #0ca30c; }
  .rk-inv-pill-low { background: rgba(245, 164, 0, 0.14); color: #c98700; }
  .rk-inv-pill-out { background: rgba(254, 0, 0, 0.1); color: var(--accent-red); }
  [data-theme='dark'] .rk-inv-pill-low { color: #f5b400; }

  .rk-inv-last { font-size: 0.8125rem; color: var(--text-muted); }
  .rk-inv-actions { display: flex; gap: 0.375rem; justify-content: flex-end; flex-wrap: wrap; }
  .rk-inv-btn {
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.5rem 0.85rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }
  .rk-inv-btn:hover { border-color: var(--text-muted); }
  .rk-inv-btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
  .rk-inv-btn-primary:hover { filter: brightness(1.1); }
  .rk-inv-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .rk-inv-btn-lg { padding: 0.75rem 1.25rem; font-size: 0.8125rem; }

  @media (max-width: 52rem) {
    .rk-inv-cols { display: none; }
    .rk-inv-row {
      grid-template-columns: 1fr auto;
      grid-template-areas: 'variant status' 'qty qty' 'last actions';
      gap: 0.625rem;
    }
    .rk-inv-variant { grid-area: variant; }
    .rk-inv-qty { grid-area: qty; }
    .rk-inv-row > div:nth-child(3) { grid-area: status; }
    .rk-inv-last { grid-area: last; }
    .rk-inv-last::before { content: 'Last delivery: '; }
    .rk-inv-actions { grid-area: actions; }
  }

  /* ---- dialog ---- */
  .rk-inv-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .rk-inv-modal {
    width: 100%;
    max-width: 38rem;
    max-height: calc(100vh - 2rem);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 1rem;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  .rk-inv-modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .rk-inv-modal-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.625rem;
    text-transform: uppercase;
    line-height: 1.05;
    margin: 0;
  }
  .rk-inv-modal-sub { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-muted); }
  .rk-inv-cap { text-transform: capitalize; }
  .rk-inv-modal-close {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rk-inv-modal-body { padding: 1.25rem 1.5rem 1.5rem; overflow-y: auto; }
  .rk-inv-step {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 0.625rem;
  }
  .rk-inv-step-history { margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
  .rk-inv-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .rk-inv-action {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    text-align: left;
    font: inherit;
    color: var(--text);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.75rem 0.875rem;
    cursor: pointer;
  }
  .rk-inv-action:hover { border-color: var(--text-muted); }
  .rk-inv-action-active { border-color: var(--text); box-shadow: 0 0 0 1px var(--text) inset; }
  .rk-inv-action-title { font-weight: 800; font-size: 0.875rem; }
  .rk-inv-action-desc { font-size: 0.75rem; color: var(--text-muted); }

  .rk-inv-qty-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .rk-inv-qty-input {
    width: 7rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.75rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.625rem;
    background: var(--bg);
    color: var(--text);
  }
  .rk-inv-quick { display: flex; gap: 0.375rem; }
  .rk-inv-quick button {
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    color: var(--text);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 800;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }
  .rk-inv-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0 0.25rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    font-size: 0.8125rem;
    color: var(--text-muted);
    font-weight: 700;
  }
  .rk-inv-preview-nums { font-family: 'Barlow Condensed', sans-serif; font-size: 1.375rem; color: var(--text); }
  .rk-inv-preview-up .rk-inv-preview-nums b { color: #0ca30c; }
  .rk-inv-preview-down .rk-inv-preview-nums b { color: var(--accent-red); }
  .rk-inv-problem { color: var(--accent-red); font-size: 0.8125rem; font-weight: 600; margin: 0.5rem 0 0; }

  .rk-inv-field { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 1rem; font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); }
  .rk-inv-field input {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--bg);
    color: var(--text);
    font-size: 0.875rem;
    font-weight: 400;
  }
  .rk-inv-field-inline { flex-direction: row; align-items: center; flex-wrap: wrap; }
  .rk-inv-field-inline input { width: 5rem; }

  .rk-inv-modal-foot { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }

  .rk-inv-muted { font-size: 0.8125rem; color: var(--text-faint); margin: 0; }
  .rk-inv-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.375rem; }
  .rk-inv-history li {
    display: grid;
    grid-template-columns: 7.5rem 1fr auto auto;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
  }
  .rk-inv-history-when { color: var(--text-faint); font-size: 0.75rem; }
  .rk-inv-history-what { color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rk-inv-history-change { font-weight: 800; }
  .rk-inv-up { color: #0ca30c; }
  .rk-inv-down { color: var(--accent-red); }
  .rk-inv-history-after { color: var(--text-muted); font-size: 0.75rem; }
  @media (max-width: 30rem) {
    .rk-inv-history li { grid-template-columns: 1fr auto; }
    .rk-inv-history-when { grid-column: 1 / -1; }
  }
`
