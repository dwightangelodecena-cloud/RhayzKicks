import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { Money } from './Money'
import { IconBox, IconReset, IconUndo } from './adminIcons'
import ImageUploadButton from './ImageUploadButton'
import { useEditSession } from '../../context/EditSessionContext'
import type { Gender } from '../../types/database.types'

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s ease' }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function UpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
}
function DownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}

interface ItemRow {
  id: string
  name: string
  brand: string
  category: string
  gender: Gender
  description: string
  base_price: number
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

const emptyForm = { name: '', brand: 'Rhayz Kicks', category: '', gender: 'unisex' as Gender, base_price: '', description: '' }
const emptyVariantForm = { size: '', color: '', sku: '', quantity_on_hand: '10' }

function randomSku() {
  return 'RK-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
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
    const { data, error: loadError } = await supabase.from('items').select('*').order('sort_order', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setItems((data ?? []) as ItemRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addItem = async () => {
    if (!form.name.trim() || !form.category.trim()) return
    const nextOrder = (items.at(-1)?.sort_order ?? 0) + 1
    const { error: insertError } = await supabase.from('items').insert({
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim().toLowerCase(),
      gender: form.gender,
      description: form.description.trim(),
      base_price: Number(form.base_price) || 0,
      sort_order: nextOrder,
    })
    if (insertError) return setError(insertError.message)
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
        category: draft.category.toLowerCase(),
        gender: draft.gender,
        description: draft.description,
        base_price: draft.base_price,
        image_urls: draft.image_urls,
      })
      .eq('id', draft.id)
    if (updateError) return setError(updateError.message)
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

  const removeItem = async (id: string) => {
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

    const { error: deleteError } = await supabase.from('items').delete().eq('id', id)
    if (deleteError) return setError(deleteError.message)
    if (item) {
      recordAction(`Delete product — ${item.name}`, async () => {
        await supabase.from('items').insert(item)
        if (removedVariants.length > 0) await supabase.from('item_variants').insert(removedVariants)
        if (removedColorways.length > 0) await supabase.from('item_colorways').insert(removedColorways)
        if (removedGallery.length > 0) await supabase.from('item_images').insert(removedGallery)
        if (removedInventory.length > 0) await supabase.from('inventory').insert(removedInventory)
      })
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

  const updateStock = async (sku: string, quantity_on_hand: number) => {
    const previous = inventoryBySku[sku]?.quantity_on_hand
    const { error: stockError } = await supabase.from('inventory').update({ quantity_on_hand }).eq('sku', sku)
    if (stockError) return setError(stockError.message)
    if (previous !== undefined) {
      recordAction('Update stock', async () => {
        await supabase.from('inventory').update({ quantity_on_hand: previous }).eq('sku', sku)
      })
    }
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

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-prod-thumb {
          width: 44px;
          height: 44px;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg);
          flex-shrink: 0;
        }
        .rk-prod-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-prod-name-cell {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .rk-prod-edit-panel {
          background: var(--bg-secondary);
        }
        .rk-prod-edit-panel td {
          padding: 1rem !important;
        }
        .rk-prod-edit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
          gap: 0.625rem;
          margin-bottom: 0.75rem;
        }
        .rk-prod-edit-grid input,
        .rk-prod-edit-grid select,
        .rk-prod-edit-grid textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.8125rem;
          background: var(--bg);
          color: var(--text);
        }
        .rk-prod-edit-full {
          grid-column: 1 / -1;
        }
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
        }
        .rk-image-chip img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-image-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          border: none;
          font-size: 11px;
          line-height: 1;
          cursor: pointer;
        }
        .rk-image-add-row {
          display: flex;
          gap: 0.5rem;
        }
        .rk-variants-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .rk-variants-title {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-faint);
          margin-bottom: 0.625rem;
        }
        .rk-variant-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: var(--bg);
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
          font-size: 0.8125rem;
        }
        .rk-variant-size {
          font-weight: 700;
          min-width: 3.5rem;
        }
        .rk-variant-color {
          color: var(--text-muted);
          min-width: 6rem;
        }
        .rk-variant-sku {
          color: var(--text-faint);
          font-size: 0.75rem;
          flex: 1;
        }
        .rk-variant-stock {
          width: 4.5rem;
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          background: var(--bg);
          color: var(--text);
          font-size: 0.75rem;
        }
        .rk-variant-add-row {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .rk-gallery-color-group {
          margin-bottom: 1rem;
        }
        .rk-gallery-color-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.5rem;
        }
        .rk-colorway-group {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .rk-colorway-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .rk-colorway-swatch-preview {
          width: 56px;
          height: 56px;
          border-radius: 0.625rem;
          overflow: hidden;
          background: var(--placeholder-bg);
          flex-shrink: 0;
        }
        .rk-colorway-swatch-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-colorway-head-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .rk-colorway-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--text);
        }
        .rk-variant-add-row input {
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.8125rem;
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
            <h2 className="rk-admin-card-title"><IconBox /> Product Catalog</h2>
            <div className="rk-admin-table-count">{items.length} products total</div>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAdding((a) => !a)}>+ Add Product</button>
        </div>

        {adding && (
          <div className="rk-admin-form-panel">
            <div className="rk-prod-edit-grid">
              <label className="rk-field">
                <span className="rk-field-label">Name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Brand</span>
                <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Category</span>
                <input placeholder="e.g. running" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Gender</span>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}>
                  {genders.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Price</span>
                <input type="number" value={form.base_price} onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))} />
              </label>
              <label className="rk-field rk-prod-edit-full">
                <span className="rk-field-label">Description</span>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="rk-admin-add-btn" onClick={addItem}>Save Product</button>
            </div>
          </div>
        )}

        <div className="rk-admin-table-wrap">
          <table className="rk-admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No products yet.</td></tr>
              ) : (
                items.map((item, i) => {
                  const isEditing = editingId === item.id
                  const isExpanded = expandedId === item.id
                  return (
                    <Fragment key={item.id}>
                      <tr>
                        <td style={{ display: 'flex', gap: '0.125rem', flexDirection: 'column' }}>
                          <button className="rk-admin-icon-btn" onClick={() => moveItem(item.id, -1)} disabled={i === 0} aria-label="Move up"><UpIcon /></button>
                          <button className="rk-admin-icon-btn" onClick={() => moveItem(item.id, 1)} disabled={i === items.length - 1} aria-label="Move down"><DownIcon /></button>
                        </td>
                        <td>
                          <div className="rk-prod-name-cell">
                            <button className="rk-admin-icon-btn" onClick={() => toggleExpand(item)} aria-label="Toggle variants">
                              <ChevronIcon open={isExpanded} />
                            </button>
                            <div className="rk-prod-thumb">
                              {item.image_urls[0] ? <img src={item.image_urls[0]} alt="" /> : null}
                            </div>
                            {item.name}
                          </div>
                        </td>
                        <td><Money amount={item.base_price} /></td>
                        <td>{item.category}</td>
                        <td>{item.gender}</td>
                        <td>
                          <button
                            className={`rk-admin-badge ${item.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            onClick={() => toggleActive(item)}
                          >
                            {item.is_active ? 'Active' : 'Hidden'}
                          </button>
                        </td>
                        <td>
                          <div className="rk-admin-table-actions">
                            <button className="rk-admin-icon-btn" onClick={() => startEdit(item)} aria-label="Edit"><EditIcon /></button>
                            <button className="rk-admin-icon-btn" onClick={() => removeItem(item.id)} aria-label="Delete"><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>

                      {isEditing && draft && draft.id === item.id && (
                        <tr>
                          <td colSpan={7} className="rk-prod-edit-panel">
                            <div className="rk-prod-edit-grid">
                              <label className="rk-field">
                                <span className="rk-field-label">Name</span>
                                <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
                              </label>
                              <label className="rk-field">
                                <span className="rk-field-label">Brand</span>
                                <input value={draft.brand} onChange={(e) => updateDraft({ brand: e.target.value })} />
                              </label>
                              <label className="rk-field">
                                <span className="rk-field-label">Category</span>
                                <input value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })} />
                              </label>
                              <label className="rk-field">
                                <span className="rk-field-label">Gender</span>
                                <select value={draft.gender} onChange={(e) => updateDraft({ gender: e.target.value as Gender })}>
                                  {genders.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                              </label>
                              <label className="rk-field">
                                <span className="rk-field-label">Price</span>
                                <input type="number" value={draft.base_price} onChange={(e) => updateDraft({ base_price: Number(e.target.value) })} />
                              </label>
                              <label className="rk-field rk-prod-edit-full">
                                <span className="rk-field-label">Description</span>
                                <textarea rows={2} value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
                              </label>
                            </div>

                            <div className="rk-variants-title">Card Images</div>
                            <p className="rk-admin-card-desc" style={{ margin: '0 0 0.625rem' }}>Used on product cards and search results. For per-colorway photo sets, use the gallery below.</p>
                            <div className="rk-image-list">
                              {draft.image_urls.map((url, idx) => (
                                <div key={idx} className="rk-image-chip">
                                  <img src={url} alt="" />
                                  <button className="rk-image-remove" onClick={() => removeImage(idx)} aria-label="Remove image">×</button>
                                </div>
                              ))}
                            </div>
                            <ImageUploadButton label="+ Upload Image" onUploaded={addImage} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button className="rk-admin-icon-btn" onClick={undoDraft} disabled={draftHistory.length === 0} aria-label="Undo last change" title="Undo last change">
                                <IconUndo size={15} />
                              </button>
                              <button className="rk-admin-icon-btn" onClick={resetDraft} aria-label="Reset to saved values" title="Reset to saved values">
                                <IconReset size={15} />
                              </button>
                              <button className="rk-admin-add-btn" onClick={saveEdit}>Save Product</button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="rk-prod-edit-panel">
                            <div className="rk-variants-title">Colorways</div>
                            <p className="rk-admin-card-desc" style={{ margin: '0 0 0.75rem' }}>
                              Add a colorway, then give it a swatch photo (the small switcher button on the product page) and a set of angle photos (the gallery shown once that swatch is picked) — matching the Nike/SNKRS-style colorway switcher.
                            </p>
                            {colorways.length === 0 ? (
                              <p className="rk-admin-empty">No colorways yet — add one below.</p>
                            ) : (
                              colorways.map((cw) => {
                                const photos = gallery.filter((g) => g.color === cw.color).sort((a, b) => a.sort_order - b.sort_order)
                                return (
                                  <div key={cw.id} className="rk-colorway-group">
                                    <div className="rk-colorway-head">
                                      <div className="rk-colorway-swatch-preview">
                                        {cw.swatch_url ? <img src={cw.swatch_url} alt="" /> : null}
                                      </div>
                                      <div className="rk-colorway-head-main">
                                        <div className="rk-colorway-name">{cw.color}</div>
                                        <ImageUploadButton
                                          label={cw.swatch_url ? 'Replace Colorway Photo' : '+ Colorway Photo'}
                                          aspect={1}
                                          onUploaded={(url) => setColorwaySwatch(cw.id, url)}
                                        />
                                      </div>
                                      <button className="rk-admin-icon-btn" onClick={() => removeColorway(cw)} aria-label={`Remove ${cw.color} colorway`}><TrashIcon /></button>
                                    </div>

                                    <div className="rk-gallery-color-name">Angle Photos</div>
                                    <div className="rk-image-list">
                                      {photos.map((g) => (
                                        <div key={g.id} className="rk-image-chip">
                                          <img src={g.image_url} alt="" />
                                          <button className="rk-image-remove" onClick={() => removeGalleryImage(g.id)} aria-label="Remove photo">×</button>
                                        </div>
                                      ))}
                                    </div>
                                    <ImageUploadButton label="+ Add Angle Photo" onUploaded={(url) => addGalleryImage(cw.color, url)} />
                                  </div>
                                )
                              })
                            )}
                            <div className="rk-admin-add-row" style={{ marginTop: colorways.length ? '0.875rem' : 0 }}>
                              <input
                                className="rk-admin-add-input"
                                placeholder="New colorway name, e.g. Triple Black"
                                value={newColorwayName}
                                onChange={(e) => setNewColorwayName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addColorway()}
                              />
                              <button className="rk-admin-add-btn" onClick={addColorway} disabled={!newColorwayName.trim()}>+ Add Colorway</button>
                            </div>

                            <div className="rk-variants-section">
                              <div className="rk-variants-title">Sizes, Colors &amp; Stock</div>
                              {variants.length === 0 ? (
                                <p className="rk-admin-empty">No variants yet — add a size/color/stock combo below.</p>
                              ) : (
                                variants.map((v) => {
                                  const inv = inventoryBySku[v.sku]
                                  return (
                                    <div key={v.id} className="rk-variant-row">
                                      <span className="rk-variant-size">{v.size}</span>
                                      <span className="rk-variant-color">{v.color}</span>
                                      <span className="rk-variant-sku">{v.sku}</span>
                                      <input
                                        className="rk-variant-stock"
                                        type="number"
                                        value={inv?.quantity_on_hand ?? 0}
                                        onChange={(e) => updateStock(v.sku, Number(e.target.value))}
                                      />
                                      <button className="rk-admin-icon-btn" onClick={() => removeVariant(v.id)} aria-label="Remove variant"><TrashIcon /></button>
                                    </div>
                                  )
                                })
                              )}
                              <div className="rk-variant-add-row">
                                <label className="rk-field">
                                  <span className="rk-field-label">Size(s)</span>
                                  <input
                                    style={{ width: '11rem' }}
                                    placeholder="e.g. 8, 9, 10"
                                    title="Enter multiple sizes separated by commas or spaces to add them all at once, using the same color and stock."
                                    value={variantForm.size}
                                    onChange={(e) => setVariantForm((f) => ({ ...f, size: e.target.value }))}
                                  />
                                </label>
                                <label className="rk-field">
                                  <span className="rk-field-label">Color</span>
                                  <select style={{ width: '9rem' }} value={variantForm.color} onChange={(e) => setVariantForm((f) => ({ ...f, color: e.target.value }))}>
                                    <option value="">{colorways.length === 0 ? 'Add a colorway above' : 'Select colorway…'}</option>
                                    {colorways.map((cw) => <option key={cw.id} value={cw.color}>{cw.color}</option>)}
                                  </select>
                                </label>
                                <label className="rk-field">
                                  <span className="rk-field-label">SKU (optional)</span>
                                  <input value={variantForm.sku} onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))} />
                                </label>
                                <label className="rk-field">
                                  <span className="rk-field-label">Stock (each size)</span>
                                  <input type="number" style={{ width: '5rem' }} value={variantForm.quantity_on_hand} onChange={(e) => setVariantForm((f) => ({ ...f, quantity_on_hand: e.target.value }))} />
                                </label>
                                <button className="rk-admin-add-btn" onClick={addVariant} disabled={!variantForm.size.trim() || !variantForm.color} style={{ alignSelf: 'flex-end' }}>+ Add Size(s)</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
