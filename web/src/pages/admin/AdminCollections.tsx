import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconLayers } from './adminIcons'
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

interface CollectionRow {
  id: string
  slug: string
  tag: string
  title: string
  description: string
  image_url: string
  cta_label: string
  size: 'regular' | 'wide'
  show_on_home: boolean
  sort_order: number
  is_active: boolean
}

const emptyForm = { slug: '', tag: '', title: '', description: '', image_url: '', cta_label: 'Shop Now' }

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminCollections() {
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CollectionRow | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase.from('collections').select('*').order('sort_order', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setCollections((data ?? []) as CollectionRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const { record } = useUndoLog({ sessionLabel: 'Collections', previewPath: '/collections', onAfterUndo: load })

  const addCollection = async () => {
    if (!form.title.trim()) return
    const nextOrder = (collections.at(-1)?.sort_order ?? 0) + 1
    const { data, error: insertError } = await supabase
      .from('collections')
      .insert({
        slug: slugify(form.slug || form.title),
        tag: form.tag.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim(),
        cta_label: form.cta_label.trim() || 'Shop Now',
        sort_order: nextOrder,
      })
      .select()
      .single()
    if (insertError) return setError(insertError.message)
    record('Add collection', async () => {
      await supabase.from('collections').delete().eq('id', data.id)
    })
    setForm(emptyForm)
    setAdding(false)
    load()
  }

  const startEdit = (c: CollectionRow) => {
    setEditingId(c.id)
    setDraft({ ...c })
  }

  const saveEdit = async () => {
    if (!draft) return
    const previous = collections.find((c) => c.id === draft.id)
    const { error: updateError } = await supabase
      .from('collections')
      .update({
        tag: draft.tag,
        title: draft.title,
        description: draft.description,
        image_url: draft.image_url,
        cta_label: draft.cta_label,
      })
      .eq('id', draft.id)
    if (updateError) return setError(updateError.message)
    if (previous) {
      record('Edit collection', async () => {
        await supabase
          .from('collections')
          .update({
            tag: previous.tag,
            title: previous.title,
            description: previous.description,
            image_url: previous.image_url,
            cta_label: previous.cta_label,
          })
          .eq('id', previous.id)
      })
    }
    setEditingId(null)
    setDraft(null)
    load()
  }

  const setSize = async (c: CollectionRow, size: 'regular' | 'wide') => {
    if (c.size === size) return
    const { error: updateError } = await supabase.from('collections').update({ size }).eq('id', c.id)
    if (updateError) return setError(updateError.message)
    record(`Set ${c.title} size to ${size}`, async () => {
      await supabase.from('collections').update({ size: c.size }).eq('id', c.id)
    })
    load()
  }

  const toggleField = async (c: CollectionRow, field: 'show_on_home' | 'is_active') => {
    const { error: updateError } = await supabase.from('collections').update({ [field]: !c[field] }).eq('id', c.id)
    if (updateError) return setError(updateError.message)
    record(`Toggle ${field === 'show_on_home' ? 'On Home' : 'Live'}`, async () => {
      await supabase.from('collections').update({ [field]: c[field] }).eq('id', c.id)
    })
    load()
  }

  const removeCollection = async (id: string) => {
    const previous = collections.find((c) => c.id === id)
    const { error: deleteError } = await supabase.from('collections').delete().eq('id', id)
    if (deleteError) return setError(deleteError.message)
    if (previous) {
      record('Delete collection', async () => {
        await supabase.from('collections').insert(previous)
      })
    }
    load()
  }

  const moveCollection = async (id: string, direction: -1 | 1) => {
    const sorted = [...collections].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((r) => r.id === id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      supabase.from('collections').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('collections').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    record('Reorder collections', async () => {
      await Promise.all([
        supabase.from('collections').update({ sort_order: a.sort_order }).eq('id', a.id),
        supabase.from('collections').update({ sort_order: b.sort_order }).eq('id', b.id),
      ])
    })
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-coll-card {
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 1rem;
          margin-bottom: 0.75rem;
          display: flex;
          gap: 0.875rem;
        }
        .rk-coll-thumb {
          width: 96px;
          height: 72px;
          flex-shrink: 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg);
        }
        .rk-coll-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-coll-body {
          flex: 1;
          min-width: 0;
        }
        .rk-coll-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .rk-coll-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 1.0625rem;
          color: var(--text);
          margin: 0.125rem 0;
        }
        .rk-coll-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-coll-edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .rk-coll-edit-grid input,
        .rk-coll-edit-grid textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.8125rem;
          background: var(--bg);
          color: var(--text);
        }
        .rk-coll-edit-full {
          grid-column: 1 / -1;
        }
        .rk-coll-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .rk-size-toggle {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
        }
        .rk-size-toggle button {
          border: none;
          background: none;
          padding: 0.25rem 0.625rem;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
        }
        .rk-size-toggle button.active {
          background: var(--text);
          color: var(--bg);
        }
        .rk-coll-flags {
          display: flex;
          gap: 0.375rem;
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
            <h2 className="rk-admin-card-title"><IconLayers /> Collections</h2>
            <p className="rk-admin-card-desc">Homepage Featured Collections tiles + the /collections page. Wide tiles get a bigger grid footprint.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAdding((a) => !a)}>+ Add Collection</button>
        </div>

        {adding && (
          <div className="rk-admin-form-panel">
            <div className="rk-coll-edit-grid">
              <label className="rk-field">
                <span className="rk-field-label">Tag</span>
                <input placeholder="e.g. Elevated Essentials" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Title</span>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="rk-field rk-coll-edit-full">
                <span className="rk-field-label">Description</span>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="rk-field rk-coll-edit-full">
                <span className="rk-field-label">Image</span>
                <div className="rk-field-upload-row">
                  {form.image_url && <img className="rk-field-thumb" src={form.image_url} alt="" />}
                  <ImageUploadButton label={form.image_url ? 'Change Image' : '+ Upload Image'} aspect={3 / 2} onUploaded={(url) => setForm((f) => ({ ...f, image_url: url }))} />
                </div>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Button label</span>
                <input value={form.cta_label} onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Slug</span>
                <input placeholder="Optional, auto from title" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button className="rk-admin-add-btn" onClick={addCollection}>Save Collection</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : collections.length === 0 ? (
          <p className="rk-admin-empty">No collections yet.</p>
        ) : (
          collections.map((c, i) => {
            const isEditing = editingId === c.id
            return (
              <div key={c.id} className="rk-coll-card">
                <div className="rk-reorder-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <button className="rk-admin-icon-btn" onClick={() => moveCollection(c.id, -1)} disabled={i === 0} aria-label="Move up"><UpIcon /></button>
                  <button className="rk-admin-icon-btn" onClick={() => moveCollection(c.id, 1)} disabled={i === collections.length - 1} aria-label="Move down"><DownIcon /></button>
                </div>
                <div className="rk-coll-thumb">
                  {c.image_url ? <img src={c.image_url} alt="" /> : null}
                </div>
                {isEditing && draft ? (
                  <div className="rk-coll-body">
                    <div className="rk-coll-edit-grid">
                      <label className="rk-field">
                        <span className="rk-field-label">Tag</span>
                        <input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Title</span>
                        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                      </label>
                      <label className="rk-field rk-coll-edit-full">
                        <span className="rk-field-label">Description</span>
                        <textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                      </label>
                      <label className="rk-field rk-coll-edit-full">
                        <span className="rk-field-label">Image</span>
                        <div className="rk-field-upload-row">
                          {draft.image_url && <img className="rk-field-thumb" src={draft.image_url} alt="" />}
                          <ImageUploadButton label={draft.image_url ? 'Change Image' : '+ Upload Image'} aspect={3 / 2} onUploaded={(url) => setDraft({ ...draft, image_url: url })} />
                        </div>
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Button label</span>
                        <input value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rk-coll-body">
                    <div className="rk-coll-tag">{c.tag || '—'}</div>
                    <div className="rk-coll-title">{c.title}</div>
                    <div className="rk-coll-desc">{c.description}</div>
                  </div>
                )}
                <div className="rk-coll-actions">
                  <div className="rk-size-toggle">
                    <button className={c.size === 'regular' ? 'active' : ''} onClick={() => setSize(c, 'regular')}>Regular</button>
                    <button className={c.size === 'wide' ? 'active' : ''} onClick={() => setSize(c, 'wide')}>Wide</button>
                  </div>
                  <div className="rk-coll-flags">
                    <button
                      className={`rk-admin-badge ${c.show_on_home ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => toggleField(c, 'show_on_home')}
                    >
                      {c.show_on_home ? 'On Home' : 'Home Off'}
                    </button>
                    <button
                      className={`rk-admin-badge ${c.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => toggleField(c, 'is_active')}
                    >
                      {c.is_active ? 'Live' : 'Hidden'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {isEditing ? (
                      <button className="rk-admin-icon-btn" onClick={saveEdit} aria-label="Save">✓</button>
                    ) : (
                      <button className="rk-admin-icon-btn" onClick={() => startEdit(c)} aria-label="Edit"><EditIcon /></button>
                    )}
                    <button className="rk-admin-icon-btn" onClick={() => removeCollection(c.id)} aria-label="Delete"><TrashIcon /></button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
