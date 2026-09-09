import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconTags } from './adminIcons'
import ImageUploadButton from './ImageUploadButton'
import { useUndoLog } from '../../context/useUndoLog'

function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}
function UpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
}
function DownIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-cat-row {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 0.75rem 1rem;
          margin-bottom: 0.625rem;
        }
        .rk-cat-thumb {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg);
        }
        .rk-cat-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-cat-body {
          flex: 1;
          min-width: 0;
        }
        .rk-cat-label {
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--text);
        }
        .rk-cat-slug {
          font-size: 0.75rem;
          color: var(--text-faint);
        }
        .rk-cat-edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          flex: 1;
        }
        .rk-cat-edit-grid input {
          width: 100%;
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
            <h2 className="rk-admin-card-title"><IconTags /> Navigation Categories</h2>
            <p className="rk-admin-card-desc">
              Drives the main nav and the "Shop by Activity" cards. Each slug matches a product's category —
              use <code>new-releases</code> to show items added in the last 30 days instead.
            </p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAdding((a) => !a)}>+ Add Category</button>
        </div>

        {adding && (
          <div className="rk-admin-form-panel">
            <div className="rk-admin-form-grid">
              <label className="rk-field">
                <span className="rk-field-label">Label</span>
                <input placeholder="e.g. Running" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Slug / category value</span>
                <input placeholder="Optional, auto from label" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Image</span>
                <div className="rk-field-upload-row">
                  {form.image_url && <img className="rk-field-thumb" src={form.image_url} alt="" />}
                  <ImageUploadButton label={form.image_url ? 'Change Image' : '+ Upload Image'} aspect={4 / 5} onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))} />
                </div>
              </label>
              <div className="rk-admin-form-actions">
                <button className="rk-admin-add-btn" onClick={addCategory}>Save Category</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="rk-admin-empty">No categories yet.</p>
        ) : (
          categories.map((c, i) => {
            const isEditing = editingId === c.id
            return (
              <div key={c.id} className="rk-cat-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <button className="rk-admin-icon-btn" onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label="Move up"><UpIcon /></button>
                  <button className="rk-admin-icon-btn" onClick={() => moveCategory(c.id, 1)} disabled={i === categories.length - 1} aria-label="Move down"><DownIcon /></button>
                </div>
                <div className="rk-cat-thumb">
                  {c.image_url ? <img src={c.image_url} alt="" /> : null}
                </div>
                {isEditing && draft ? (
                  <div className="rk-cat-edit-grid">
                    <label className="rk-field">
                      <span className="rk-field-label">Label</span>
                      <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                    </label>
                    <label className="rk-field">
                      <span className="rk-field-label">Slug</span>
                      <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                    </label>
                    <label className="rk-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="rk-field-label">Image</span>
                      <div className="rk-field-upload-row">
                        {draft.image_url && <img className="rk-field-thumb" src={draft.image_url} alt="" />}
                        <ImageUploadButton label={draft.image_url ? 'Change Image' : '+ Upload Image'} aspect={4 / 5} onUploaded={(url) => setDraft({ ...draft, image_url: url })} />
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="rk-cat-body">
                    <div className="rk-cat-label">{c.label}</div>
                    <div className="rk-cat-slug">/category/{c.slug}</div>
                  </div>
                )}
                <button
                  className={`rk-admin-badge ${c.is_visible ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={() => toggleVisible(c)}
                >
                  {c.is_visible ? 'Visible' : 'Hidden'}
                </button>
                <div className="rk-admin-table-actions">
                  {isEditing ? (
                    <button className="rk-admin-icon-btn" onClick={saveEdit} aria-label="Save">✓</button>
                  ) : (
                    <button className="rk-admin-icon-btn" onClick={() => startEdit(c)} aria-label="Edit"><EditIcon /></button>
                  )}
                  <button className="rk-admin-icon-btn" onClick={() => removeCategory(c.id)} aria-label="Delete"><TrashIcon /></button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
