import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconTags } from './adminIcons'
import ImageUploadButton from './ImageUploadButton'
import { useUndoLog } from '../../context/useUndoLog'
import { EmptyState, Modal, Notice, Pill, SectionHead } from './adminUi'

function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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

interface NavCategoryRow {
  id: string
  slug: string
  label: string
  image_url: string
  sort_order: number
  is_visible: boolean
}

const emptyForm = { slug: '', label: '', image_url: '' }

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<NavCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NavCategoryRow | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase.from('nav_categories').select('*').order('sort_order', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setCategories((data ?? []) as NavCategoryRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const active =
    editingId && draft ? { label: `Category — ${draft.label || 'Untitled'}`, previewPath: `/category/${draft.slug}` } : null

  const { record } = useUndoLog({ sessionLabel: 'Categories', previewPath: '/', onAfterUndo: load, active })

  const addCategory = async () => {
    if (!form.label.trim()) return
    const nextOrder = (categories.at(-1)?.sort_order ?? 0) + 1
    const { data, error: insertError } = await supabase
      .from('nav_categories')
      .insert({
        slug: slugify(form.slug || form.label),
        label: form.label.trim(),
        image_url: form.image_url.trim(),
        sort_order: nextOrder,
      })
      .select()
      .single()
    if (insertError) return setError(insertError.message)
    record('Add category', async () => {
      await supabase.from('nav_categories').delete().eq('id', data.id)
    })
    setForm(emptyForm)
    setAdding(false)
    load()
  }

  const startEdit = (c: NavCategoryRow) => {
    setEditingId(c.id)
    setDraft({ ...c })
  }

  const saveEdit = async () => {
    if (!draft) return
    const previous = categories.find((c) => c.id === draft.id)
    const { error: updateError } = await supabase
      .from('nav_categories')
      .update({ label: draft.label, slug: draft.slug, image_url: draft.image_url })
      .eq('id', draft.id)
    if (updateError) return setError(updateError.message)
    if (previous) {
      record('Edit category', async () => {
        await supabase
          .from('nav_categories')
          .update({ label: previous.label, slug: previous.slug, image_url: previous.image_url })
          .eq('id', previous.id)
      })
    }
    setEditingId(null)
    setDraft(null)
    load()
  }

  const toggleVisible = async (c: NavCategoryRow) => {
    const { error: updateError } = await supabase.from('nav_categories').update({ is_visible: !c.is_visible }).eq('id', c.id)
    if (updateError) return setError(updateError.message)
    record(c.is_visible ? 'Hide category' : 'Show category', async () => {
      await supabase.from('nav_categories').update({ is_visible: c.is_visible }).eq('id', c.id)
    })
    load()
  }

  const removeCategory = async (id: string) => {
    const previous = categories.find((c) => c.id === id)
    const { error: deleteError } = await supabase.from('nav_categories').delete().eq('id', id)
    if (deleteError) return setError(deleteError.message)
    if (previous) {
      record('Delete category', async () => {
        await supabase.from('nav_categories').insert(previous)
      })
    }
    load()
  }

  const moveCategory = async (id: string, direction: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((r) => r.id === id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      supabase.from('nav_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('nav_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    record('Reorder categories', async () => {
      await Promise.all([
        supabase.from('nav_categories').update({ sort_order: a.sort_order }).eq('id', a.id),
        supabase.from('nav_categories').update({ sort_order: b.sort_order }).eq('id', b.id),
      ])
    })
    load()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const [confirmDelete, setConfirmDelete] = useState<NavCategoryRow | null>(null)

  // Same fields for "add" and "edit".
  const renderFields = (
    v: { label: string; slug: string; image_url: string },
    set: (key: 'label' | 'slug' | 'image_url', value: string) => void,
    isNew: boolean,
  ) => (
    <div className="rk-ui-form">
      <label className="rk-ui-field">
        <span>Name (required)</span>
        <input placeholder="e.g. Running" value={v.label} onChange={(e) => set('label', e.target.value)} />
        <span className="rk-ui-field-hint">What shoppers see in the menu and on the card.</span>
      </label>
      <label className="rk-ui-field">
        <span>Category ID{isNew ? ' (optional)' : ''}</span>
        <input placeholder={isNew ? 'Made from the name if left blank' : ''} value={v.slug} onChange={(e) => set('slug', e.target.value)} />
        <span className="rk-ui-field-hint">
          Must match the category chosen on products, e.g. <code>running</code>. Use <code>new-releases</code> to show shoes added in the last 30 days.
          {!isNew && ' Changing it changes which shoes appear.'}
        </span>
      </label>
      <div className="rk-ui-field rk-ui-field-full">
        <span>Card photo</span>
        <div className="rk-cms-upload-row">
          <div className="rk-cms-thumb">{v.image_url ? <img src={v.image_url} alt="" /> : 'No photo'}</div>
          <ImageUploadButton label={v.image_url ? 'Change photo' : '+ Upload photo'} aspect={4 / 5} onUploaded={(url) => set('image_url', url)} />
        </div>
        <span className="rk-ui-field-hint">Used on the “Shop by Activity” cards. Cropped to a tall 4:5.</span>
      </div>
    </div>
  )

  const visibleCount = categories.filter((c) => c.is_visible).length

  return (
    <div>
      <style>{adminCardStyles}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}

      <div className="rk-admin-card">
        <SectionHead
          icon={<IconTags />}
          title="Menu Categories"
          desc="The links in the store’s top menu and the “Shop by Activity” cards on the homepage, in this order. Each one shows every product with a matching category."
          actions={
            <>
              {!loading && <Pill tone={visibleCount > 0 ? 'ok' : 'neutral'}>{visibleCount} of {categories.length} showing</Pill>}
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
                {adding ? 'Close' : '+ Add category'}
              </button>
            </>
          }
        />

        {adding && (
          <div className="rk-cms-add-panel">
            <p className="rk-cms-panel-title">New category</p>
            {renderFields(form, (k, val) => setForm((f) => ({ ...f, [k]: val })), true)}
            <div className="rk-cms-form-actions">
              {!form.label.trim() && <span className="rk-cms-form-actions-note">Add a name to save this category.</span>}
              <button type="button" className="rk-ui-btn" onClick={() => { setAdding(false); setForm(emptyForm) }}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addCategory} disabled={!form.label.trim()}>Add category</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            hint="Categories become the links in the store’s top menu, like “Running” or “Basketball”."
            action={!adding && <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAdding(true)}>+ Add your first category</button>}
          />
        ) : (
          <div className="rk-ui-list rk-cms-list">
            {categories.map((c, i) => {
              const isEditing = editingId === c.id && draft
              return (
                <div key={c.id}>
                  <div className={`rk-ui-list-row ${c.is_visible ? '' : 'rk-cms-row-hidden'}`}>
                    <MoveButtons
                      what="category"
                      onUp={() => moveCategory(c.id, -1)}
                      onDown={() => moveCategory(c.id, 1)}
                      upDisabled={i === 0}
                      downDisabled={i === categories.length - 1}
                    />
                    <div className="rk-cms-thumb">{c.image_url ? <img src={c.image_url} alt="" /> : 'No photo'}</div>
                    <div className="rk-ui-list-main">
                      <div className="rk-ui-list-title">{c.label || 'Untitled category'}</div>
                      <div className="rk-ui-list-meta">Page: /category/{c.slug}</div>
                    </div>
                    <div className="rk-ui-list-side">
                      <Pill tone={c.is_visible ? 'ok' : 'neutral'}>{c.is_visible ? 'Showing' : 'Hidden'}</Pill>
                      <button type="button" className="rk-ui-btn" onClick={() => toggleVisible(c)}>{c.is_visible ? 'Hide' : 'Show'}</button>
                      {!isEditing && (
                        <button type="button" className="rk-ui-btn" onClick={() => startEdit(c)}>
                          <EditIcon /> Edit
                        </button>
                      )}
                      <button type="button" className="rk-ui-btn rk-ui-btn-danger" onClick={() => setConfirmDelete(c)}>
                        <TrashIcon /> Delete
                      </button>
                    </div>
                  </div>
                  {isEditing && draft && (
                    <div className="rk-cms-edit-panel">
                      <p className="rk-cms-panel-title">Editing category</p>
                      {renderFields(draft, (k, val) => setDraft({ ...draft, [k]: val }), false)}
                      <div className="rk-cms-form-actions">
                        <button type="button" className="rk-ui-btn" onClick={cancelEdit}>Cancel</button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={saveEdit}>Save category</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <Modal
          title="Delete this category?"
          subtitle={confirmDelete.label || 'Untitled category'}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmDelete(null)}>Keep it</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger"
                onClick={() => {
                  removeCategory(confirmDelete.id)
                  setConfirmDelete(null)
                }}
              >
                <TrashIcon /> Yes, delete
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            The menu link and card disappear from the store right away. Products in this category are not deleted. To take it off the menu for now, use <b>Hide</b> instead. Deleted by mistake? Click <b>Undo</b> at the top of this page.
          </p>
        </Modal>
      )}
    </div>
  )
}
