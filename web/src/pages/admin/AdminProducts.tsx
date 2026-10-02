import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconBox, IconReset, IconUndo } from './adminIcons'
import ImageUploadButton from './ImageUploadButton'
import { useEditSession } from '../../context/EditSessionContext'
import type { Gender } from '../../types/database.types'
import { EmptyState, Modal, Notice, Pill, SearchInput, SectionHead, Segmented, Toolbar } from './adminUi'

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s ease' }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function UpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15" /></svg>
}
function DownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
}

// Up/down arrows with a tooltip + screen-reader label (styled by the
// .rk-cms-reorder rules in AdminCMS).
function MoveButtons({ what, onUp, onDown, upDisabled, downDisabled }: { what: string; onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean }) {
  return (
    <div className="rk-cms-reorder">
      <button type="button" onClick={onUp} disabled={upDisabled} aria-label={`Move ${what} up`} title={`Move ${what} up (shows earlier)`}><UpIcon /></button>
      <button type="button" onClick={onDown} disabled={downDisabled} aria-label={`Move ${what} down`} title={`Move ${what} down (shows later)`}><DownIcon /></button>
    </div>
  )
}

interface ItemRow {
  id: string
  name: string
  brand: string
  category: string // main category (first of categories)
  categories: string[] // every category the product is listed under (025_*.sql)
  gender: Gender
  description: string
  base_price: number
  cost_price: number // from item_costs (staff-only), merged in by load()
  points_value: number
  earns_loyalty: boolean
  image_urls: string[]
  sort_order: number
  is_active: boolean
}

interface VariantRow {
  id: string
  item_id: string
  size: string
  color: string
  sku: string
  is_active: boolean
}

interface InventoryRow {
  sku: string
  quantity_on_hand: number
  reorder_level: number
}

interface GalleryImageRow {
  id: string
  item_id: string
  color: string
  image_url: string
  sort_order: number
}

interface ColorwayRow {
  id: string
  item_id: string
  color: string
  swatch_url: string | null
  sort_order: number
}

const genders: Gender[] = ['unisex', 'men', 'women', 'kids']
const genderLabels: Record<Gender, string> = { unisex: 'Everyone (unisex)', men: 'Men', women: 'Women', kids: 'Kids' }

const emptyForm = { name: '', brand: 'Rhayz Kicks', categories: [] as string[], gender: 'unisex' as Gender, base_price: '', cost_price: '', points_value: '', earns_loyalty: true, description: '' }
const emptyVariantForm = { size: '', color: '', sku: '', quantity_on_hand: '10' }

function randomSku() {
  return 'RK-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

// Tick every category a product belongs to. The first one ticked is its
// MAIN category (used on the product page and for "you may also like");
// "Make main" moves another to the front. Saved as items.category +
// items.categories (025_product_multiple_categories.sql).
function CategoryPicker({
  options,
  value,
  onChange,
}: {
  options: { slug: string; label: string }[]
  value: string[]
  onChange: (categories: string[]) => void
}) {
  // Keep categories that aren't in the menu list visible so they can be unticked.
  const all = [...options, ...value.filter((v) => !options.some((o) => o.slug === v)).map((v) => ({ slug: v, label: `${v} (not in the menu)` }))]
  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      if (value.length === 1) return // a product needs at least one
      onChange(value.filter((v) => v !== slug))
    } else {
      onChange([...value, slug])
    }
  }
  const makeMain = (slug: string) => onChange([slug, ...value.filter((v) => v !== slug)])
  return (
    <div>
      <div className="rk-cms-cat-picker" role="group" aria-label="Categories">
        {all.map((o) => {
          const on = value.includes(o.slug)
          const main = value[0] === o.slug
          return (
            <span key={o.slug} className={`rk-cms-cat-chip ${on ? 'rk-cms-cat-chip-on' : ''}`}>
              <button type="button" onClick={() => toggle(o.slug)} aria-pressed={on} title={on && value.length === 1 ? 'A product needs at least one category' : undefined}>
                <span className="rk-cms-cat-check" aria-hidden="true">{on ? '✓' : '+'}</span>
                {o.label}
              </button>
              {on && (main ? (
                <span className="rk-cms-cat-main">Main</span>
              ) : (
                <button type="button" className="rk-cms-cat-make-main" onClick={() => makeMain(o.slug)} title="Use this as the main category">Make main</button>
              ))}
            </span>
          )
        })}
      </div>
      <span className="rk-ui-field-hint">
        The shoe shows up under every category you tick. <b>Main</b> is used on the product page and for “You may also like”. New Releases also lists products added in the last 30 days automatically. Manage the list in Categories.
      </span>
    </div>
  )
}

// "Add [N] pairs to every size" on one colorway.
function ColorStockAdder({ color, sizeCount, onAdd }: { color: string; sizeCount: number; onAdd: (pairs: number) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const n = Math.floor(Number(value))
  const valid = value.trim() !== '' && n > 0
  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    await onAdd(n)
    setBusy(false)
    setValue('')
  }
  return (
    <div className="rk-cms-stock-adder">
      <span>Add</span>
      <input
        type="number"
        min={1}
        step={1}
        placeholder="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        aria-label={`Pairs to add to every ${color} size`}
      />
      <span>pairs to every size</span>
      <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={submit} disabled={!valid || busy} title={`Adds to all ${sizeCount} ${color} sizes`}>
        {busy ? 'Adding…' : valid ? `+ ${n * sizeCount} pairs` : 'Add'}
      </button>
    </div>
  )
}

// − [qty] + for one size. Typing saves on Enter / leaving the box, not on
// every keystroke (typing "12" used to save 1, then 12).
function SizeStockControl({ qty, label, onNudge, onSet }: { qty: number; label: string; onNudge: (delta: number) => Promise<void>; onSet: (n: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(qty))
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setDraft(String(qty))
  }, [qty])
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    await fn()
    setBusy(false)
  }
  const commit = () => {
    const n = Math.floor(Number(draft))
    if (draft.trim() === '' || !Number.isFinite(n) || n < 0) {
      setDraft(String(qty))
      return
    }
    if (n !== qty) run(() => onSet(n))
  }
  return (
    <div className="rk-cms-stock-ctl" aria-label={`Pairs in stock, ${label}`}>
      <button type="button" onClick={() => run(() => onNudge(-1))} disabled={busy || qty <= 0} aria-label={`One less pair, ${label}`}>−</button>
      <input
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setDraft(String(qty))
        }}
        disabled={busy}
        aria-label={`Pairs in stock, ${label}`}
      />
      <button type="button" onClick={() => run(() => onNudge(1))} disabled={busy} aria-label={`One more pair, ${label}`}>+</button>
      <span className="rk-cms-stock-ctl-unit">pairs</span>
    </div>
  )
}

export default function AdminProducts() {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ItemRow | null>(null)
  const [draftHistory, setDraftHistory] = useState<ItemRow[]>([])
  const { setSession } = useEditSession()

  const [categoryOptions, setCategoryOptions] = useState<{ slug: string; label: string }[]>([])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [inventoryBySku, setInventoryBySku] = useState<Record<string, InventoryRow>>({})
  const [variantForm, setVariantForm] = useState(emptyVariantForm)
  const [gallery, setGallery] = useState<GalleryImageRow[]>([])
  const [colorways, setColorways] = useState<ColorwayRow[]>([])
  const [newColorwayName, setNewColorwayName] = useState('')

  // Everything below saves to Supabase instantly (colorways, gallery photos,
  // sizes/stock, active/hidden toggles, reordering, deletes) — there's no
  // draft step for any of it. This log is what makes Undo/Reset on the
  // Content-tab topbar do something real for those instant actions: each
  // entry captures how to reverse the write that already happened.
  const [actionLog, setActionLog] = useState<{ label: string; undo: () => Promise<void> }[]>([])
  const actionLogRef = useRef(actionLog)
  actionLogRef.current = actionLog

  const recordAction = (label: string, undo: () => Promise<void>) => {
    setActionLog((s) => [...s, { label, undo }])
  }

  const undoLastAction = async () => {
    const current = actionLogRef.current
    const entry = current[current.length - 1]
    if (!entry) return
    await entry.undo()
    setActionLog((s) => {
      const idx = s.lastIndexOf(entry)
      return idx === -1 ? s : [...s.slice(0, idx), ...s.slice(idx + 1)]
    })
    load()
    if (expandedId) loadVariants(expandedId)
  }

  const undoAllActions = async () => {
    const entries = [...actionLogRef.current].reverse()
    for (const entry of entries) {
      await entry.undo()
    }
    setActionLog([])
    load()
    if (expandedId) loadVariants(expandedId)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    // Cost prices live in item_costs (023_item_costs_staff_only.sql) so the
    // public items table never exposes them; merge them in for editing.
    const [itemsRes, costsRes] = await Promise.all([
      supabase.from('items').select('*').is('archived_at', null).order('sort_order', { ascending: true }),
      supabase.from('item_costs').select('item_id, cost_price'),
    ])
    const loadError = itemsRes.error ?? costsRes.error
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    const costs = new Map((costsRes.data ?? []).map((c) => [c.item_id as string, Number(c.cost_price)]))
    setItems(((itemsRes.data ?? []) as ItemRow[]).map((i) => ({ ...i, cost_price: costs.get(i.id) ?? 0 })))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    supabase
      .from('nav_categories')
      .select('slug, label')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setCategoryOptions((data ?? []) as { slug: string; label: string }[]))
  }, [])

  const addItem = async () => {
    if (!form.name.trim() || form.categories.length === 0) return
    const nextOrder = (items.at(-1)?.sort_order ?? 0) + 1
    const { data: created, error: insertError } = await supabase.from('items').insert({
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.categories[0],
      categories: form.categories,
      gender: form.gender,
      description: form.description.trim(),
      base_price: Number(form.base_price) || 0,
      points_value: Math.max(0, Math.floor(Number(form.points_value) || 0)),
      earns_loyalty: form.earns_loyalty,
      sort_order: nextOrder,
    }).select('id').single()
    if (insertError) return setError(insertError.message)
    const { error: costError } = await supabase
      .from('item_costs')
      .upsert({ item_id: created.id, cost_price: Math.max(0, Number(form.cost_price) || 0) })
    if (costError) return setError(costError.message)
    setForm(emptyForm)
    setAdding(false)
    load()
  }

  const startEdit = (item: ItemRow) => {
    setEditingId(item.id)
    setDraft({ ...item, image_urls: [...item.image_urls] })
    setDraftHistory([])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
    setDraftHistory([])
  }

  // Every field/photo change goes through here (instead of setDraft directly)
  // so Undo has a step to pop back to.
  const updateDraft = (patch: Partial<ItemRow>) => {
    if (!draft) return
    setDraftHistory((h) => [...h, draft])
    setDraft({ ...draft, ...patch })
  }

  const undoDraft = () => {
    setDraftHistory((h) => {
      if (h.length === 0) return h
      setDraft(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  const resetDraft = () => {
    if (!editingId) return
    const original = items.find((i) => i.id === editingId)
    if (!original) return
    setDraft({ ...original, image_urls: [...original.image_urls] })
    setDraftHistory([])
  }

  const saveEdit = async () => {
    if (!draft) return
    const { error: updateError } = await supabase
      .from('items')
      .update({
        name: draft.name,
        brand: draft.brand,
        category: (draft.categories?.[0] ?? draft.category).toLowerCase(),
        categories: draft.categories?.length ? draft.categories : [draft.category.toLowerCase()],
        gender: draft.gender,
        description: draft.description,
        base_price: draft.base_price,
        points_value: Math.max(0, Math.floor(Number(draft.points_value) || 0)),
        earns_loyalty: draft.earns_loyalty,
        image_urls: draft.image_urls,
      })
      .eq('id', draft.id)
    if (updateError) return setError(updateError.message)
    const { error: costError } = await supabase
      .from('item_costs')
      .upsert({ item_id: draft.id, cost_price: Math.max(0, Number(draft.cost_price) || 0) })
    if (costError) return setError(costError.message)
    cancelEdit()
    load()
  }

  // Registers whatever's currently active with the Content-tab-level
  // Save/Undo/Reset bar and tells the live preview pane which storefront
  // route to show. The open product draft (real Save, buffered edits) takes
  // priority when it's open; otherwise, if any instant-save action happened
  // on this tab, Undo/Reset reverse those instead.
  useEffect(() => {
    if (editingId && draft) {
      const original = items.find((i) => i.id === editingId)
      const isDirty = !original || JSON.stringify(original) !== JSON.stringify(draft)
      setSession({
        label: `Product — ${draft.name || 'untitled'}`,
        isDirty,
        canUndo: draftHistory.length > 0,
        save: saveEdit,
        undo: undoDraft,
        reset: resetDraft,
        previewPath: `/product/${draft.id}`,
      })
      return () => setSession(null)
    }
    if (actionLog.length > 0) {
      setSession({
        label: `Products — ${actionLog.length} change${actionLog.length === 1 ? '' : 's'}`,
        isDirty: false,
        canUndo: true,
        save: () => {},
        undo: undoLastAction,
        reset: undoAllActions,
        previewPath: expandedId ? `/product/${expandedId}` : '/',
      })
      return () => setSession(null)
    }
    setSession(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, draft, draftHistory, items, actionLog, expandedId])

  const toggleActive = async (item: ItemRow) => {
    const { error: updateError } = await supabase.from('items').update({ is_active: !item.is_active }).eq('id', item.id)
    if (updateError) return setError(updateError.message)
    recordAction(item.is_active ? 'Hide product' : 'Show product', async () => {
      await supabase.from('items').update({ is_active: item.is_active }).eq('id', item.id)
    })
    load()
  }

  // Deletes (or archives) one product and records its Undo step. Returns
  // what happened, or null on error. Callers handle messages and reloading.
  const removeOne = async (id: string): Promise<'deleted' | 'archived' | null> => {
    const item = items.find((i) => i.id === id)
    // Deleting an item cascades to item_variants/item_images/item_colorways
    // (on delete cascade in the schema) and, transitively, inventory rows
    // for those variants — snapshot all of it so Undo restores everything,
    // not just the bare product.
    const [variantsRes, galleryRes, colorwaysRes] = await Promise.all([
      supabase.from('item_variants').select('*').eq('item_id', id),
      supabase.from('item_images').select('*').eq('item_id', id),
      supabase.from('item_colorways').select('*').eq('item_id', id),
    ])
    const removedVariants = (variantsRes.data ?? []) as VariantRow[]
    const removedGallery = (galleryRes.data ?? []) as GalleryImageRow[]
    const removedColorways = (colorwaysRes.data ?? []) as ColorwayRow[]
    const skus = removedVariants.map((v) => v.sku)
    const inventoryRes = skus.length > 0 ? await supabase.from('inventory').select('*').in('sku', skus) : null
    const removedInventory = (inventoryRes?.data ?? []) as InventoryRow[]

    // delete_or_archive_item (024): deletes outright when nothing references
    // the product; if it has stock history, sales or orders it is archived
    // instead — hidden everywhere (store, this list, Inventory, Sales) while
    // past orders keep pointing at it.
    const { data: outcome, error: deleteError } = await supabase.rpc('delete_or_archive_item', { p_item_id: id })
    if (deleteError) {
      setError(item ? `${item.name}: ${deleteError.message}` : deleteError.message)
      return null
    }
    if (outcome === 'archived') {
      if (item) {
        recordAction(`Remove product — ${item.name}`, async () => {
          await supabase.rpc('restore_archived_item', { p_item_id: id })
          await supabase.from('items').update({ is_active: item.is_active }).eq('id', id)
        })
      }
      return 'archived'
    }
    if (item) {
      recordAction(`Delete product — ${item.name}`, async () => {
        const { cost_price: removedCost, ...itemRow } = item
        await supabase.from('items').insert(itemRow)
        await supabase.from('item_costs').upsert({ item_id: item.id, cost_price: removedCost ?? 0 })
        if (removedVariants.length > 0) await supabase.from('item_variants').insert(removedVariants)
        if (removedColorways.length > 0) await supabase.from('item_colorways').insert(removedColorways)
        if (removedGallery.length > 0) await supabase.from('item_images').insert(removedGallery)
        if (removedInventory.length > 0) await supabase.from('inventory').insert(removedInventory)
      })
    }
    return 'deleted'
  }

  const removeItem = async (id: string) => {
    const item = items.find((i) => i.id === id)
    setInfo(null)
    const outcome = await removeOne(id)
    if (outcome === 'archived' && item) {
      setInfo(`"${item.name}" was removed from the store, Inventory and Sales. It has past orders or stock history, so it's kept in the records for those orders.`)
    }
    load()
  }

  // Select mode: delete several products at once. Each still gets its own
  // Undo step, so a mistaken bulk delete can be walked back.
  const removeSelected = async () => {
    const ids = [...selectedIds]
    setInfo(null)
    setBulkDeleting(true)
    let deleted = 0
    let archived = 0
    for (const id of ids) {
      const outcome = await removeOne(id)
      if (outcome === 'deleted') deleted += 1
      if (outcome === 'archived') archived += 1
    }
    setBulkDeleting(false)
    setSelectedIds(new Set())
    setSelectMode(false)
    const done = deleted + archived
    if (done > 0) {
      setInfo(
        `Removed ${done} ${done === 1 ? 'product' : 'products'}.` +
          (archived > 0 ? ` ${archived} had past orders or stock history, so ${archived === 1 ? 'it is' : 'they are'} kept in the records for those orders.` : '') +
          ' Click Undo at the top of this page to bring them back.',
      )
    }
    load()
  }

  const moveItem = async (id: string, direction: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((r) => r.id === id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      supabase.from('items').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('items').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    recordAction('Reorder products', async () => {
      await Promise.all([
        supabase.from('items').update({ sort_order: a.sort_order }).eq('id', a.id),
        supabase.from('items').update({ sort_order: b.sort_order }).eq('id', b.id),
      ])
    })
    load()
  }

  const addImage = (url: string) => {
    if (!draft) return
    updateDraft({ image_urls: [...draft.image_urls, url] })
  }

  const removeImage = (idx: number) => {
    if (!draft) return
    updateDraft({ image_urls: draft.image_urls.filter((_, i) => i !== idx) })
  }

  const loadVariants = async (itemId: string) => {
    const [variantsRes, galleryRes, colorwaysRes] = await Promise.all([
      supabase.from('item_variants').select('*').eq('item_id', itemId).order('size'),
      supabase.from('item_images').select('*').eq('item_id', itemId).order('sort_order'),
      supabase.from('item_colorways').select('*').eq('item_id', itemId).order('sort_order'),
    ])
    if (variantsRes.error) return setError(variantsRes.error.message)
    if (galleryRes.error) return setError(galleryRes.error.message)
    if (colorwaysRes.error) return setError(colorwaysRes.error.message)
    const rows = (variantsRes.data ?? []) as VariantRow[]
    setVariants(rows)
    setGallery((galleryRes.data ?? []) as GalleryImageRow[])
    setColorways((colorwaysRes.data ?? []) as ColorwayRow[])
    const skus = rows.map((v) => v.sku)
    if (skus.length > 0) {
      const { data: invRows } = await supabase.from('inventory').select('sku, quantity_on_hand, reorder_level').in('sku', skus)
      const map: Record<string, InventoryRow> = {}
      for (const row of (invRows ?? []) as InventoryRow[]) map[row.sku] = row
      setInventoryBySku(map)
    } else {
      setInventoryBySku({})
    }
  }

  const toggleExpand = (item: ItemRow) => {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(item.id)
    setVariantForm(emptyVariantForm)
    loadVariants(item.id)
  }

  const addGalleryImage = async (color: string, url: string) => {
    if (!expandedId) return
    const nextOrder = (gallery.filter((g) => g.color === color).at(-1)?.sort_order ?? 0) + 1
    const { data, error: galleryError } = await supabase
      .from('item_images')
      .insert({ item_id: expandedId, color, image_url: url, sort_order: nextOrder })
      .select()
      .single()
    if (galleryError) return setError(galleryError.message)
    recordAction('Add angle photo', async () => {
      await supabase.from('item_images').delete().eq('id', data.id)
    })
    loadVariants(expandedId)
  }

  const removeGalleryImage = async (id: string) => {
    const previous = gallery.find((g) => g.id === id)
    const { error: galleryError } = await supabase.from('item_images').delete().eq('id', id)
    if (galleryError) return setError(galleryError.message)
    if (previous) {
      recordAction('Remove angle photo', async () => {
        await supabase.from('item_images').insert(previous)
      })
    }
    if (expandedId) loadVariants(expandedId)
  }

  const addColorway = async () => {
    const name = newColorwayName.trim()
    if (!expandedId || !name) return
    const nextOrder = (colorways.at(-1)?.sort_order ?? 0) + 1
    const { data, error: colorwayError } = await supabase
      .from('item_colorways')
      .insert({ item_id: expandedId, color: name, sort_order: nextOrder })
      .select()
      .single()
    if (colorwayError) return setError(colorwayError.message)
    recordAction(`Add colorway — ${name}`, async () => {
      await supabase.from('item_colorways').delete().eq('id', data.id)
    })
    setNewColorwayName('')
    loadVariants(expandedId)
  }

  const setColorwaySwatch = async (colorwayId: string, url: string) => {
    const previous = colorways.find((c) => c.id === colorwayId)
    const { error: swatchError } = await supabase.from('item_colorways').update({ swatch_url: url }).eq('id', colorwayId)
    if (swatchError) return setError(swatchError.message)
    if (previous) {
      recordAction('Set colorway photo', async () => {
        await supabase.from('item_colorways').update({ swatch_url: previous.swatch_url }).eq('id', colorwayId)
      })
    }
    if (expandedId) loadVariants(expandedId)
  }

  const removeColorway = async (colorway: ColorwayRow) => {
    if (variants.some((v) => v.color === colorway.color)) {
      setError(`Remove the "${colorway.color}" size/stock variants first — a colorway in use can't be deleted.`)
      return
    }
    const removedImages = gallery.filter((g) => g.color === colorway.color)
    const { error: imagesError } = await supabase.from('item_images').delete().eq('item_id', colorway.item_id).eq('color', colorway.color)
    if (imagesError) return setError(imagesError.message)
    const { error: colorwayError } = await supabase.from('item_colorways').delete().eq('id', colorway.id)
    if (colorwayError) return setError(colorwayError.message)
    recordAction(`Delete colorway — ${colorway.color}`, async () => {
      await supabase.from('item_colorways').insert(colorway)
      if (removedImages.length > 0) await supabase.from('item_images').insert(removedImages)
    })
    if (expandedId) loadVariants(expandedId)
  }

  const addVariant = async () => {
    if (!expandedId || !variantForm.size.trim() || !variantForm.color.trim()) return
    const sizes = [...new Set(variantForm.size.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean))]
    if (sizes.length === 0) return
    const skuBase = variantForm.sku.trim()
    const quantity_on_hand = Number(variantForm.quantity_on_hand) || 0
    const createdSkus: string[] = []

    for (const size of sizes) {
      const sku = sizes.length > 1 ? (skuBase ? `${skuBase}-${size}` : randomSku()) : (skuBase || randomSku())
      const { error: variantError } = await supabase.from('item_variants').insert({
        item_id: expandedId,
        size,
        color: variantForm.color.trim(),
        sku,
      })
      if (variantError) return setError(variantError.message)
      const { error: inventoryError } = await supabase.from('inventory').insert({
        sku,
        quantity_on_hand,
        reorder_level: 5,
      })
      if (inventoryError) return setError(inventoryError.message)
      createdSkus.push(sku)
    }
    if (createdSkus.length > 0) {
      recordAction(`Add size(s) — ${sizes.join(', ')}`, async () => {
        // inventory.sku references item_variants.sku with no cascade, so
        // stock rows must go first or the variant delete violates the FK.
        await supabase.from('inventory').delete().in('sku', createdSkus)
        await supabase.from('item_variants').delete().in('sku', createdSkus)
      })
    }
    setVariantForm(emptyVariantForm)
    loadVariants(expandedId)
  }

  // Stock changes go through adjust_stock (same as the Inventory tab) so they
  // show up in that size's history, and each gets an Undo step.
  const changeStock = async (sku: string, change: number, type: 'restock' | 'adjustment', reason: string) => {
    if (!change) return true
    const { error: stockError } = await supabase.rpc('adjust_stock', {
      p_sku: sku,
      p_quantity_change: change,
      p_type: type,
      p_reason: reason,
    })
    if (stockError) {
      setError(stockError.message)
      return false
    }
    recordAction(change > 0 ? `Add ${change} pairs` : `Remove ${-change} pairs`, async () => {
      await supabase.rpc('adjust_stock', { p_sku: sku, p_quantity_change: -change, p_type: 'adjustment', p_reason: 'Undo in Content → Products' })
    })
    return true
  }

  // Set one size to an exact count (logged as an adjustment for the difference).
  const updateStock = async (sku: string, quantity_on_hand: number) => {
    const current = inventoryBySku[sku]?.quantity_on_hand ?? 0
    const target = Math.max(0, Math.floor(quantity_on_hand))
    if (target === current) return
    await changeStock(sku, target - current, 'adjustment', `Set to ${target} in Content → Products`)
    if (expandedId) loadVariants(expandedId)
  }

  // +/- buttons on a size.
  const nudgeStock = async (sku: string, delta: number) => {
    const current = inventoryBySku[sku]?.quantity_on_hand ?? 0
    if (current + delta < 0) return
    await changeStock(sku, delta, delta > 0 ? 'restock' : 'adjustment', delta > 0 ? 'Added in Content → Products' : 'Removed in Content → Products')
    if (expandedId) loadVariants(expandedId)
  }

  // "Add N pairs to every size" on a colorway — e.g. a delivery of one color.
  const addStockToColor = async (color: string, pairs: number) => {
    const n = Math.floor(pairs)
    if (!(n > 0)) return
    const skus = variants.filter((v) => v.color === color).map((v) => v.sku)
    for (const sku of skus) {
      const ok = await changeStock(sku, n, 'restock', `Added to all ${color} sizes in Content → Products`)
      if (!ok) break
    }
    setInfo(`Added ${n} ${n === 1 ? 'pair' : 'pairs'} to each of the ${skus.length} ${color} ${skus.length === 1 ? 'size' : 'sizes'}.`)
    if (expandedId) loadVariants(expandedId)
  }

  const removeVariant = async (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId)
    const previousInventory = variant ? inventoryBySku[variant.sku] : undefined
    // Stock must go before the variant it references, same FK reason as above.
    if (variant) {
      const { error: inventoryError } = await supabase.from('inventory').delete().eq('sku', variant.sku)
      if (inventoryError) return setError(inventoryError.message)
    }
    const { error: variantError } = await supabase.from('item_variants').delete().eq('id', variantId)
    if (variantError) return setError(variantError.message)
    if (variant) {
      recordAction(`Remove size — ${variant.size}`, async () => {
        await supabase.from('item_variants').insert(variant)
        if (previousInventory) await supabase.from('inventory').insert(previousInventory)
      })
    }
    if (expandedId) loadVariants(expandedId)
  }

  // ---- list view helpers (display only — no data logic below) ----
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'showing' | 'hidden'>('all')
  // One shared "Are you sure?" dialog (delete product / colorway / size,
  // discard unsaved edits).
  const [info, setInfo] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const startSelectMode = () => {
    setSelectMode(true)
    setEditingId(null)
    setDraft(null)
    setExpandedId(null)
  }
  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }
  const [confirm, setConfirm] = useState<{ title: string; subtitle?: string; body: string; confirmLabel: string; onConfirm: () => void } | null>(null)

  const categoryLabel = (slug: string) => categoryOptions.find((c) => c.slug === slug)?.label ?? slug
  // Rows loaded before 025 may not have categories yet — fall back to the main one.
  const cats = (item: Pick<ItemRow, 'category' | 'categories'>) => (item.categories?.length ? item.categories : item.category ? [item.category] : [])
  const query = search.trim().toLowerCase()
  const showingCount = items.filter((i) => i.is_active).length
  const visibleItems = items.filter((item) => {
    if (statusFilter === 'showing' && !item.is_active) return false
    if (statusFilter === 'hidden' && item.is_active) return false
    if (!query) return true
    return [item.name, item.brand, ...cats(item), ...cats(item).map(categoryLabel), item.gender].some((s) => (s ?? '').toLowerCase().includes(query))
  })
  const allShownSelected = visibleItems.length > 0 && visibleItems.every((it) => selectedIds.has(it.id))
  const selectedNames = items.filter((it) => selectedIds.has(it.id)).map((it) => it.name)
  // Move up/down swaps with the neighbour in the full list, so it's only
  // offered while the full list is on screen.
  const isFiltered = query !== '' || statusFilter !== 'all'

  const draftOriginal = editingId ? items.find((i) => i.id === editingId) : undefined
  const draftIsDirty = !!draft && (!draftOriginal || JSON.stringify(draftOriginal) !== JSON.stringify(draft))

  const requestCancelEdit = () => {
    if (!draftIsDirty) return cancelEdit()
    setConfirm({
      title: 'Discard your changes?',
      subtitle: draft?.name,
      body: 'You have edits to this product that haven’t been saved. Closing now throws them away.',
      confirmLabel: 'Discard changes',
      onConfirm: cancelEdit,
    })
  }

  const marginNote = (price: number, cost: number) =>
    cost > 0 && price > 0 ? (
      <span className="rk-cms-prod-margin">
        Profit per pair: ₱{(price - cost).toLocaleString()} ({(((price - cost) / price) * 100).toFixed(1)}% margin)
      </span>
    ) : (
      <span className="rk-ui-field-hint">Enter both price and cost to see your profit per pair.</span>
    )

  const genderSelect = (value: Gender, onChange: (g: Gender) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value as Gender)}>
      {genders.map((g) => <option key={g} value={g}>{genderLabels[g]}</option>)}
    </select>
  )

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-image-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.625rem;
        }
        .rk-image-chip {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg);
          border: 1px solid var(--border);
        }
        .rk-image-chip img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-image-remove {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          border: none;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
        }
        .rk-cms-prod-first {
          position: absolute;
          left: 3px;
          bottom: 3px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 0.1rem 0.35rem;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
        }
        .rk-cms-prod-margin {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-cms-prod-private {
          display: inline-block;
          font-size: 0.625rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          color: var(--text-muted);
          margin-left: 0.375rem;
          vertical-align: middle;
        }
        .rk-colorway-group {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .rk-colorway-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }
        .rk-colorway-swatch-preview {
          width: 56px;
          height: 56px;
          border-radius: 0.625rem;
          overflow: hidden;
          background: var(--placeholder-bg);
          border: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.5625rem;
          font-weight: 700;
          color: var(--text-faint);
          text-align: center;
        }
        .rk-colorway-swatch-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-colorway-head-main {
          flex: 1;
          min-width: 10rem;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .rk-colorway-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--text);
        }
        .rk-cms-prod-sub {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .rk-cms-prod-variant-stock {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-cms-prod-variant-stock input {
          width: 4.75rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.4rem 0.5rem;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 0.8125rem;
        }
        .rk-cms-prod-sku {
          font-family: ui-monospace, monospace;
          font-size: 0.6875rem;
          color: var(--text-faint);
        }
        .rk-cms-prod-variant-form {
          grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
          margin-top: 0.875rem;
          align-items: end;
        }
      `}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}
      {info && <Notice tone="ok" onDismiss={() => setInfo(null)}>{info}</Notice>}

      <div className="rk-admin-card">
        <SectionHead
          icon={<IconBox />}
          title="Products"
          desc="Every shoe in your store. Use Edit details for name, price, points and card photos; use Sizes & photos for colorways, angle photos and stock per size. The order here is the order on the store."
          actions={
            <>
              {items.length > 0 && (
                <button
                  type="button"
                  className={`rk-ui-btn rk-ui-btn-lg ${selectMode ? 'rk-cms-select-on' : ''}`}
                  onClick={selectMode ? exitSelectMode : startSelectMode}
                  aria-pressed={selectMode}
                >
                  {selectMode ? 'Done selecting' : 'Select'}
                </button>
              )}
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
                {adding ? 'Close' : '+ Add product'}
              </button>
            </>
          }
        />

        {adding && (
          <div className="rk-cms-add-panel">
            <p className="rk-cms-panel-title">New product</p>

            <section className="rk-cms-group">
              <h3 className="rk-cms-group-title">Basics</h3>
              <p className="rk-cms-group-desc">What the shoe is and where it shows up on the store.</p>
              <div className="rk-ui-form">
                <label className="rk-ui-field">
                  <span>Product name (required)</span>
                  <input placeholder="e.g. Air Runner 2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </label>
                <label className="rk-ui-field">
                  <span>Brand</span>
                  <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </label>
                <div className="rk-ui-field rk-ui-field-full">
                  <span>Categories (pick at least one)</span>
                  <CategoryPicker options={categoryOptions} value={form.categories} onChange={(categories) => setForm((f) => ({ ...f, categories }))} />
                </div>
                <label className="rk-ui-field">
                  <span>Who it’s for</span>
                  {genderSelect(form.gender, (g) => setForm((f) => ({ ...f, gender: g })))}
                </label>
                <label className="rk-ui-field rk-ui-field-full">
                  <span>Description</span>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  <span className="rk-ui-field-hint">Shown on the product page.</span>
                </label>
              </div>
            </section>

            <section className="rk-cms-group">
              <h3 className="rk-cms-group-title">Pricing</h3>
              <p className="rk-cms-group-desc">The selling price shoppers pay, and what you paid so you can see your profit.</p>
              <div className="rk-ui-form">
                <label className="rk-ui-field">
                  <span>Selling price (₱)</span>
                  <input type="number" min={0} placeholder="0" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} />
                </label>
                <label className="rk-ui-field">
                  <span>Cost price (₱) <span className="rk-cms-prod-private">Staff only</span></span>
                  <input type="number" min={0} placeholder="0" value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} />
                  <span className="rk-ui-field-hint">What you paid per pair. Never shown to shoppers.</span>
                </label>
                <div className="rk-ui-field">
                  <span>Profit</span>
                  {marginNote(Number(form.base_price) || 0, Number(form.cost_price) || 0)}
                </div>
              </div>
            </section>

            <section className="rk-cms-group">
              <h3 className="rk-cms-group-title">Loyalty points</h3>
              <p className="rk-cms-group-desc">Whether buying this shoe earns the customer reward points.</p>
              <label className="rk-cms-check">
                <input type="checkbox" checked={form.earns_loyalty} onChange={(e) => setForm((f) => ({ ...f, earns_loyalty: e.target.checked }))} />
                <span>Earns loyalty points</span>
              </label>
              {form.earns_loyalty && (
                <div className="rk-ui-form" style={{ marginTop: '0.75rem' }}>
                  <label className="rk-ui-field">
                    <span>Custom points per pair</span>
                    <input type="number" min={0} step={1} placeholder="Store default" value={form.points_value} onChange={(e) => setForm((f) => ({ ...f, points_value: e.target.value }))} />
                    <span className="rk-ui-field-hint">Leave blank to use the store’s default earning rate.</span>
                  </label>
                </div>
              )}
            </section>

            <p className="rk-ui-field-hint" style={{ margin: 0 }}>
              After adding, use <b>Edit details</b> to add card photos and <b>Sizes &amp; photos</b> to add colorways and sizes.
            </p>
            <div className="rk-cms-form-actions">
              {(!form.name.trim() || form.categories.length === 0) && <span className="rk-cms-form-actions-note">A name and at least one category are needed to save.</span>}
              <button type="button" className="rk-ui-btn" onClick={() => { setAdding(false); setForm(emptyForm) }}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addItem} disabled={!form.name.trim() || form.categories.length === 0}>Add product</button>
            </div>
          </div>
        )}

        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, brand or category" />
          <Segmented
            label="Show"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'showing', label: 'Showing', count: showingCount },
              { value: 'hidden', label: 'Hidden', count: items.length - showingCount },
            ]}
          />
        </Toolbar>
        {isFiltered && visibleItems.length > 0 && !selectMode && (
          <p className="rk-ui-field-hint" style={{ margin: '-0.375rem 0 0.75rem' }}>Clear the search and choose “All” to change the order.</p>
        )}
        {selectMode && (
          <div className="rk-cms-select-bar" role="region" aria-label="Selected products">
            <label className="rk-cms-check">
              <input
                type="checkbox"
                checked={allShownSelected}
                onChange={() =>
                  setSelectedIds((prev) => {
                    const next = new Set(prev)
                    for (const it of visibleItems) {
                      if (allShownSelected) next.delete(it.id)
                      else next.add(it.id)
                    }
                    return next
                  })
                }
              />
              <span>Select all{isFiltered ? ' shown' : ''} ({visibleItems.length})</span>
            </label>
            <span className="rk-cms-select-count">
              {selectedIds.size === 0 ? 'Tick the products you want to delete' : `${selectedIds.size} selected`}
            </span>
            <div className="rk-cms-select-actions">
              <button type="button" className="rk-ui-btn" onClick={exitSelectMode} disabled={bulkDeleting}>Cancel</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger rk-ui-btn-lg"
                disabled={selectedIds.size === 0 || bulkDeleting}
                onClick={() =>
                  setConfirm({
                    title: `Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'product' : 'products'}?`,
                    subtitle: selectedNames.slice(0, 4).join(', ') + (selectedNames.length > 4 ? ` and ${selectedNames.length - 4} more` : ''),
                    body: 'They disappear from the store, Inventory and the Sales screen right away. Products that were never sold or stocked are deleted completely; ones with past orders or stock history are removed but kept in the records so old orders still show them. Removed by mistake? Click Undo at the top of this page.',
                    confirmLabel: `Yes, delete ${selectedIds.size}`,
                    onConfirm: removeSelected,
                  })
                }
              >
                {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Add your first shoe, then give it photos and sizes."
            action={!adding && <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAdding(true)}>+ Add your first product</button>}
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No products match"
            hint={query ? `Nothing found for “${search.trim()}”.` : 'No products with this status.'}
            action={<button type="button" className="rk-ui-btn" onClick={() => { setSearch(''); setStatusFilter('all') }}>Show all products</button>}
          />
        ) : (
          <div className={`rk-ui-list rk-cms-list ${selectMode ? 'rk-cms-selecting' : ''}`}>
            {visibleItems.map((item) => {
              const i = items.indexOf(item)
              const isEditing = editingId === item.id
              const isExpanded = expandedId === item.id
              return (
                <div key={item.id}>
                  <div
                    className={`rk-ui-list-row ${item.is_active ? '' : 'rk-cms-row-hidden'} ${selectMode && selectedIds.has(item.id) ? 'rk-cms-row-selected' : ''}`}
                    onClick={selectMode ? () => toggleSelected(item.id) : undefined}
                    style={selectMode ? { cursor: 'pointer' } : undefined}
                  >
                    {selectMode ? (
                      <input
                        type="checkbox"
                        className="rk-cms-row-check"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${item.name}`}
                      />
                    ) : (
                      <MoveButtons
                        what="product"
                        onUp={() => moveItem(item.id, -1)}
                        onDown={() => moveItem(item.id, 1)}
                        upDisabled={isFiltered || i === 0}
                        downDisabled={isFiltered || i === items.length - 1}
                      />
                    )}
                    <div className="rk-cms-thumb">{item.image_urls[0] ? <img src={item.image_urls[0]} alt="" /> : 'No photo'}</div>
                    <div className="rk-ui-list-main">
                      <div className="rk-ui-list-title">{item.name}</div>
                      <div className="rk-ui-list-meta">
                        <Money amount={item.base_price} /> · {item.brand} · {cats(item).map(categoryLabel).join(', ')} · {genderLabels[item.gender] ?? item.gender}
                      </div>
                      {item.earns_loyalty === false && (
                        <div className="rk-cms-chips"><span className="rk-cms-chip">No loyalty points</span></div>
                      )}
                    </div>
                    <div className="rk-ui-list-side">
                      <Pill tone={item.is_active ? 'ok' : 'neutral'}>{item.is_active ? 'Showing' : 'Hidden'}</Pill>
                      <button type="button" className="rk-ui-btn" onClick={() => toggleActive(item)}>{item.is_active ? 'Hide' : 'Show'}</button>
                      <button
                        type="button"
                        className={`rk-ui-btn ${isEditing ? 'rk-ui-btn-primary' : ''}`}
                        onClick={() => (isEditing ? requestCancelEdit() : startEdit(item))}
                        aria-expanded={isEditing}
                      >
                        <EditIcon /> {isEditing ? 'Close details' : 'Edit details'}
                      </button>
                      <button
                        type="button"
                        className={`rk-ui-btn ${isExpanded ? 'rk-ui-btn-primary' : ''}`}
                        onClick={() => toggleExpand(item)}
                        aria-expanded={isExpanded}
                      >
                        <ChevronIcon open={isExpanded} /> Sizes &amp; photos
                      </button>
                      <button
                        type="button"
                        className="rk-ui-btn rk-ui-btn-danger"
                        onClick={() =>
                          setConfirm({
                            title: 'Delete this product?',
                            subtitle: item.name,
                            body: 'It disappears from the store, Inventory and the Sales screen right away. If it was never sold or stocked it is deleted completely; if it has past orders or stock history it is removed but kept in the records so old orders still show it. To take it off the store for now, use Hide instead. Removed by mistake? Click Undo at the top of this page.',
                            confirmLabel: 'Yes, delete',
                            onConfirm: () => removeItem(item.id),
                          })
                        }
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                  </div>

                  {isEditing && draft && draft.id === item.id && (
                    <div className="rk-cms-edit-panel">
                      <p className="rk-cms-panel-title">Editing {draft.name || 'product'}</p>

                      <section className="rk-cms-group">
                        <h3 className="rk-cms-group-title">Basics</h3>
                        <p className="rk-cms-group-desc">What the shoe is and where it shows up on the store.</p>
                        <div className="rk-ui-form">
                          <label className="rk-ui-field">
                            <span>Product name</span>
                            <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
                          </label>
                          <label className="rk-ui-field">
                            <span>Brand</span>
                            <input value={draft.brand} onChange={(e) => updateDraft({ brand: e.target.value })} />
                          </label>
                          <div className="rk-ui-field rk-ui-field-full">
                            <span>Categories</span>
                            <CategoryPicker
                              options={categoryOptions}
                              value={cats(draft)}
                              onChange={(categories) => categories.length > 0 && updateDraft({ categories, category: categories[0] })}
                            />
                          </div>
                          <label className="rk-ui-field">
                            <span>Who it’s for</span>
                            {genderSelect(draft.gender, (g) => updateDraft({ gender: g }))}
                          </label>
                          <label className="rk-ui-field rk-ui-field-full">
                            <span>Description</span>
                            <textarea rows={3} value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
                            <span className="rk-ui-field-hint">Shown on the product page.</span>
                          </label>
                        </div>
                      </section>

                      <section className="rk-cms-group">
                        <h3 className="rk-cms-group-title">Pricing</h3>
                        <p className="rk-cms-group-desc">The selling price shoppers pay, and what you paid so you can see your profit.</p>
                        <div className="rk-ui-form">
                          <label className="rk-ui-field">
                            <span>Selling price (₱)</span>
                            <input type="number" min={0} value={draft.base_price} onChange={(e) => updateDraft({ base_price: Number(e.target.value) })} />
                          </label>
                          <label className="rk-ui-field">
                            <span>Cost price (₱) <span className="rk-cms-prod-private">Staff only</span></span>
                            <input type="number" min={0} value={draft.cost_price ?? 0} onChange={(e) => updateDraft({ cost_price: Number(e.target.value) })} />
                            <span className="rk-ui-field-hint">What you paid per pair. Never shown to shoppers.</span>
                          </label>
                          <div className="rk-ui-field">
                            <span>Profit</span>
                            {marginNote(Number(draft.base_price), Number(draft.cost_price))}
                          </div>
                        </div>
                      </section>

                      <section className="rk-cms-group">
                        <h3 className="rk-cms-group-title">Loyalty points</h3>
                        <p className="rk-cms-group-desc">Whether buying this shoe earns the customer reward points.</p>
                        <label className="rk-cms-check">
                          <input type="checkbox" checked={draft.earns_loyalty !== false} onChange={(e) => updateDraft({ earns_loyalty: e.target.checked })} />
                          <span>Earns loyalty points</span>
                        </label>
                        {draft.earns_loyalty !== false && (
                          <div className="rk-ui-form" style={{ marginTop: '0.75rem' }}>
                            <label className="rk-ui-field">
                              <span>Custom points per pair</span>
                              <input type="number" min={0} step={1} value={draft.points_value ?? 0} onChange={(e) => updateDraft({ points_value: Number(e.target.value) })} />
                              <span className="rk-ui-field-hint">0 = use the store’s default earning rate.</span>
                            </label>
                          </div>
                        )}
                      </section>

                      <section className="rk-cms-group">
                        <h3 className="rk-cms-group-title">Card photos</h3>
                        <p className="rk-cms-group-desc">
                          Shown on product cards and in search results — the first photo is the main one. Photos for each colorway are under <b>Sizes &amp; photos</b>.
                        </p>
                        {draft.image_urls.length > 0 ? (
                          <div className="rk-image-list">
                            {draft.image_urls.map((url, idx) => (
                              <div key={idx} className="rk-image-chip">
                                <img src={url} alt="" />
                                {idx === 0 && <span className="rk-cms-prod-first">Main</span>}
                                <button type="button" className="rk-image-remove" onClick={() => removeImage(idx)} aria-label={`Remove photo ${idx + 1}`} title="Remove this photo">×</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rk-ui-field-hint" style={{ margin: '0 0 0.625rem' }}>No card photos yet — shoppers will see a blank card.</p>
                        )}
                        <ImageUploadButton label="+ Upload photo" onUploaded={addImage} />
                      </section>

                      <div className="rk-cms-form-actions">
                        <span className="rk-cms-form-actions-note">
                          {draftIsDirty ? <Pill tone="warn">Unsaved changes</Pill> : 'No changes yet'}
                        </span>
                        <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={undoDraft} disabled={draftHistory.length === 0} title="Undo your last edit">
                          <IconUndo size={14} /> Undo
                        </button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-ghost" onClick={resetDraft} disabled={!draftIsDirty} title="Go back to the saved version">
                          <IconReset size={14} /> Reset
                        </button>
                        <button type="button" className="rk-ui-btn" onClick={requestCancelEdit}>Cancel</button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={saveEdit} disabled={!draftIsDirty}>Save product</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="rk-cms-edit-panel">
                      <p className="rk-cms-panel-title">Sizes &amp; photos — {item.name}</p>
                      <p className="rk-ui-field-hint" style={{ margin: '-0.375rem 0 0.875rem' }}>Changes in this panel go live straight away (use Undo at the top to take one back).</p>

                      <section className="rk-cms-group">
                        <h3 className="rk-cms-group-title">Colorways &amp; photos</h3>
                        <p className="rk-cms-group-desc">
                          Each colorway gets a small swatch photo (the color picker button on the product page) and a set of angle photos (shown when that color is picked).
                        </p>
                        {colorways.length === 0 ? (
                          <EmptyState title="No colorways yet" hint="Add one below, e.g. “Triple Black”. You need at least one before you can add sizes." />
                        ) : (
                          colorways.map((cw) => {
                            const photos = gallery.filter((g) => g.color === cw.color).sort((a, b) => a.sort_order - b.sort_order)
                            const inUse = variants.some((v) => v.color === cw.color)
                            return (
                              <div key={cw.id} className="rk-colorway-group">
                                <div className="rk-colorway-head">
                                  <div className="rk-colorway-swatch-preview">
                                    {cw.swatch_url ? <img src={cw.swatch_url} alt="" /> : 'No swatch'}
                                  </div>
                                  <div className="rk-colorway-head-main">
                                    <div className="rk-colorway-name">{cw.color}</div>
                                    <ImageUploadButton
                                      label={cw.swatch_url ? 'Replace swatch photo' : '+ Swatch photo'}
                                      aspect={1}
                                      onUploaded={(url) => setColorwaySwatch(cw.id, url)}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="rk-ui-btn rk-ui-btn-danger"
                                    disabled={inUse}
                                    title={inUse ? 'Remove the sizes in this color first' : `Delete the ${cw.color} colorway`}
                                    onClick={() =>
                                      setConfirm({
                                        title: 'Delete this colorway?',
                                        subtitle: cw.color,
                                        body: 'Its swatch and angle photos are removed from the product page. Deleted by mistake? Click Undo at the top of this page.',
                                        confirmLabel: 'Yes, delete',
                                        onConfirm: () => removeColorway(cw),
                                      })
                                    }
                                  >
                                    <TrashIcon /> Delete colorway
                                  </button>
                                </div>
                                {inUse && <p className="rk-ui-field-hint" style={{ margin: '-0.375rem 0 0.625rem' }}>To delete this colorway, remove its sizes below first.</p>}

                                <div className="rk-cms-prod-sub">Angle photos ({photos.length})</div>
                                {photos.length > 0 && (
                                  <div className="rk-image-list">
                                    {photos.map((g, idx) => (
                                      <div key={g.id} className="rk-image-chip">
                                        <img src={g.image_url} alt="" />
                                        <button type="button" className="rk-image-remove" onClick={() => removeGalleryImage(g.id)} aria-label={`Remove ${cw.color} photo ${idx + 1}`} title="Remove this photo">×</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <ImageUploadButton label="+ Add angle photo" onUploaded={(url) => addGalleryImage(cw.color, url)} />
                              </div>
                            )
                          })
                        )}
                        <div className="rk-cms-add-row">
                          <input
                            className="rk-cms-inline-input"
                            placeholder="New colorway name, e.g. Triple Black"
                            aria-label="New colorway name"
                            value={newColorwayName}
                            onChange={(e) => setNewColorwayName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addColorway()}
                          />
                          <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addColorway} disabled={!newColorwayName.trim()}>+ Add colorway</button>
                        </div>
                      </section>

                      <section className="rk-cms-group" style={{ marginBottom: 0 }}>
                        <h3 className="rk-cms-group-title">Sizes &amp; stock</h3>
                        <p className="rk-cms-group-desc">
                          Each size shoppers can buy, grouped by colorway. Use “Add pairs to every size” when a delivery of one color comes in, or − / + and the pairs box on a single size (type a number, then press Enter). Every change is saved to the Inventory tab’s history.
                        </p>
                        {variants.length === 0 ? (
                          <EmptyState title="No sizes yet" hint="Add sizes below — shoppers can’t buy this shoe until it has at least one size." />
                        ) : (
                          [...new Set([...colorways.map((c) => c.color), ...variants.map((v) => v.color)])]
                            .filter((color) => variants.some((v) => v.color === color))
                            .map((color) => {
                              const colorVariants = variants
                                .filter((v) => v.color === color)
                                .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
                              const colorTotal = colorVariants.reduce((sum, v) => sum + (inventoryBySku[v.sku]?.quantity_on_hand ?? 0), 0)
                              return (
                                <div key={color} className="rk-cms-stock-color">
                                  <div className="rk-cms-stock-color-head">
                                    <div>
                                      <div className="rk-cms-stock-color-name">{color}</div>
                                      <div className="rk-ui-list-meta">
                                        {colorVariants.length} {colorVariants.length === 1 ? 'size' : 'sizes'} · {colorTotal} {colorTotal === 1 ? 'pair' : 'pairs'} in stock
                                      </div>
                                    </div>
                                    <ColorStockAdder color={color} sizeCount={colorVariants.length} onAdd={(n) => addStockToColor(color, n)} />
                                  </div>
                                  <div className="rk-ui-list">
                            {colorVariants.map((v) => {
                              const inv = inventoryBySku[v.sku]
                              const qty = inv?.quantity_on_hand ?? 0
                              const low = inv ? qty <= inv.reorder_level : false
                              return (
                                <div key={v.id} className={`rk-ui-list-row ${qty === 0 ? 'rk-ui-list-row-alert' : low ? 'rk-ui-list-row-warn' : ''}`}>
                                  <div className="rk-ui-list-main">
                                    <div className="rk-ui-list-title">Size {v.size}</div>
                                    <div className="rk-ui-list-meta"><span className="rk-cms-prod-sku">SKU {v.sku}</span></div>
                                  </div>
                                  <div className="rk-ui-list-side">
                                    <Pill tone={qty === 0 ? 'alert' : low ? 'warn' : 'ok'}>{qty === 0 ? 'Sold out' : low ? 'Running low' : 'In stock'}</Pill>
                                    <SizeStockControl
                                      qty={qty}
                                      label={`size ${v.size} ${v.color}`}
                                      onNudge={(d) => nudgeStock(v.sku, d)}
                                      onSet={(n) => updateStock(v.sku, n)}
                                    />
                                    <button
                                      type="button"
                                      className="rk-ui-btn rk-ui-btn-danger"
                                      onClick={() =>
                                        setConfirm({
                                          title: 'Remove this size?',
                                          subtitle: `Size ${v.size} · ${v.color}`,
                                          body: 'Shoppers will no longer be able to pick this size, and its stock count is removed. Removed by mistake? Click Undo at the top of this page.',
                                          confirmLabel: 'Yes, remove',
                                          onConfirm: () => removeVariant(v.id),
                                        })
                                      }
                                    >
                                      <TrashIcon /> Remove
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                                  </div>
                                </div>
                              )
                            })
                        )}

                        <div className="rk-ui-form rk-cms-prod-variant-form">
                          <label className="rk-ui-field">
                            <span>Size(s)</span>
                            <input
                              placeholder="e.g. 8, 9, 10"
                              value={variantForm.size}
                              onChange={(e) => setVariantForm((f) => ({ ...f, size: e.target.value }))}
                            />
                            <span className="rk-ui-field-hint">Separate with commas to add several at once.</span>
                          </label>
                          <label className="rk-ui-field">
                            <span>Color</span>
                            <select value={variantForm.color} onChange={(e) => setVariantForm((f) => ({ ...f, color: e.target.value }))}>
                              <option value="">{colorways.length === 0 ? 'Add a colorway first' : 'Choose a colorway…'}</option>
                              {colorways.map((cw) => <option key={cw.id} value={cw.color}>{cw.color}</option>)}
                            </select>
                          </label>
                          <label className="rk-ui-field">
                            <span>Pairs in stock (each size)</span>
                            <input type="number" min={0} value={variantForm.quantity_on_hand} onChange={(e) => setVariantForm((f) => ({ ...f, quantity_on_hand: e.target.value }))} />
                          </label>
                          <label className="rk-ui-field">
                            <span>SKU (optional)</span>
                            <input placeholder="Made for you if blank" value={variantForm.sku} onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))} />
                          </label>
                        </div>
                        <div className="rk-cms-form-actions">
                          <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addVariant} disabled={!variantForm.size.trim() || !variantForm.color}>+ Add size(s)</button>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirm && (
        <Modal
          title={confirm.title}
          subtitle={confirm.subtitle}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirm(null)}>Keep it</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger"
                onClick={() => {
                  confirm.onConfirm()
                  setConfirm(null)
                }}
              >
                {confirm.confirmLabel}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{confirm.body}</p>
        </Modal>
      )}
    </div>
  )
}
