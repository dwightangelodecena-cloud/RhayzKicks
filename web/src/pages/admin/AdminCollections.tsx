import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconLayers } from './adminIcons'
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

  const active = editingId && draft ? { label: `Collection — ${draft.title || 'Untitled'}`, previewPath: '/collections' } : null

  const { record } = useUndoLog({ sessionLabel: 'Collections', previewPath: '/collections', onAfterUndo: load, active })

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

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  // One shared "Are you sure?" dialog for deletes.
  const [confirmDelete, setConfirmDelete] = useState<CollectionRow | null>(null)

  // Same fields for "add" and "edit"; the slug is only asked for on add
  // (editing never changed it, so that stays as it was).
  const renderFields = (
    v: { tag: string; title: string; description: string; image_url: string; cta_label: string; slug?: string },
    set: (key: 'tag' | 'title' | 'description' | 'image_url' | 'cta_label' | 'slug', value: string) => void,
    withSlug: boolean,
  ) => (
    <div className="rk-ui-form">
      <label className="rk-ui-field">
        <span>Title (required)</span>
        <input placeholder="e.g. Court Classics" value={v.title} onChange={(e) => set('title', e.target.value)} />
        <span className="rk-ui-field-hint">The big name on the tile.</span>
      </label>
      <label className="rk-ui-field">
        <span>Small label</span>
        <input placeholder="e.g. Elevated Essentials" value={v.tag} onChange={(e) => set('tag', e.target.value)} />
        <span className="rk-ui-field-hint">Optional. Shown in small capitals above the title.</span>
      </label>
      <label className="rk-ui-field rk-ui-field-full">
        <span>Description</span>
        <textarea rows={2} value={v.description} onChange={(e) => set('description', e.target.value)} />
        <span className="rk-ui-field-hint">One short sentence about what’s in this collection.</span>
      </label>
      <div className="rk-ui-field rk-ui-field-full">
        <span>Tile photo</span>
        <div className="rk-cms-upload-row">
          <div className="rk-cms-thumb">{v.image_url ? <img src={v.image_url} alt="" /> : 'No photo'}</div>
          <ImageUploadButton label={v.image_url ? 'Change photo' : '+ Upload photo'} aspect={3 / 2} onUploaded={(url) => set('image_url', url)} />
        </div>
        <span className="rk-ui-field-hint">Cropped to 3:2.</span>
      </div>
      <label className="rk-ui-field">
        <span>Button text</span>
        <input placeholder="Shop Now" value={v.cta_label} onChange={(e) => set('cta_label', e.target.value)} />
      </label>
      {withSlug && (
        <label className="rk-ui-field">
          <span>Short ID (optional)</span>
          <input placeholder="Made from the title if left blank" value={v.slug ?? ''} onChange={(e) => set('slug', e.target.value)} />
          <span className="rk-ui-field-hint">Lowercase words joined by dashes, e.g. court-classics.</span>
        </label>
      )}
    </div>
  )

  const liveCount = collections.filter((c) => c.is_active).length
  const homeCount = collections.filter((c) => c.is_active && c.show_on_home).length

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-cms-coll-size {
          display: inline-flex;
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
          background: var(--bg);
        }
        .rk-cms-coll-size button {
          border: none;
          background: none;
          padding: 0.45rem 0.75rem;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
        }
        .rk-cms-coll-size button:hover { color: var(--text); }
        .rk-cms-coll-size button[aria-pressed='true'] {
          background: var(--text);
          color: var(--bg);
        }
        .rk-cms-coll-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.625rem;
        }
        .rk-cms-coll-controls-label {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-faint);
        }
      `}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}

      <div className="rk-admin-card">
        <SectionHead
          icon={<IconLayers />}
          title="Collections"
          desc="Groups of shoes shown as photo tiles. Every showing collection appears on the Collections page; turn on “Homepage” to also feature it on the homepage. Wide tiles show bigger in the grid."
          actions={
            <>
              {!loading && <Pill tone={liveCount > 0 ? 'ok' : 'neutral'}>{liveCount} showing · {homeCount} on homepage</Pill>}
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
                {adding ? 'Close' : '+ Add collection'}
              </button>
            </>
          }
        />

        {adding && (
          <div className="rk-cms-add-panel">
            <p className="rk-cms-panel-title">New collection</p>
            {renderFields(form, (k, val) => setForm((f) => ({ ...f, [k]: val })), true)}
            <div className="rk-cms-form-actions">
              {!form.title.trim() && <span className="rk-cms-form-actions-note">Add a title to save this collection.</span>}
              <button type="button" className="rk-ui-btn" onClick={() => { setAdding(false); setForm(emptyForm) }}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addCollection} disabled={!form.title.trim()}>Add collection</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            hint="Collections group shoes into themes like “Running” or “New Season” for shoppers to browse."
            action={!adding && <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAdding(true)}>+ Add your first collection</button>}
          />
        ) : (
          <div className="rk-ui-list rk-cms-list">
            {collections.map((c, i) => {
              const isEditing = editingId === c.id && draft
              return (
                <div key={c.id}>
                  <div className={`rk-ui-list-row ${c.is_active ? '' : 'rk-cms-row-hidden'}`}>
                    <MoveButtons
                      what="collection"
                      onUp={() => moveCollection(c.id, -1)}
                      onDown={() => moveCollection(c.id, 1)}
                      upDisabled={i === 0}
                      downDisabled={i === collections.length - 1}
                    />
                    <div className="rk-cms-thumb rk-cms-thumb-wide">{c.image_url ? <img src={c.image_url} alt="" /> : 'No photo'}</div>
                    <div className="rk-ui-list-main">
                      {c.tag && <div className="rk-cms-eyebrow" style={{ color: 'var(--text-faint)' }}>{c.tag}</div>}
                      <div className="rk-ui-list-title">{c.title || 'Untitled collection'}</div>
                      {c.description && <div className="rk-ui-list-meta">{c.description}</div>}
                      <div className="rk-cms-coll-controls">
                        <span className="rk-cms-coll-controls-label">Tile size</span>
                        <div className="rk-cms-coll-size" role="group" aria-label="Tile size">
                          <button type="button" aria-pressed={c.size === 'regular'} onClick={() => setSize(c, 'regular')} title="Normal tile">Regular</button>
                          <button type="button" aria-pressed={c.size === 'wide'} onClick={() => setSize(c, 'wide')} title="Bigger tile">Wide</button>
                        </div>
                        <span className="rk-cms-coll-controls-label">Homepage</span>
                        <button
                          type="button"
                          className="rk-ui-btn"
                          onClick={() => toggleField(c, 'show_on_home')}
                          aria-pressed={c.show_on_home}
                          title={c.show_on_home ? 'Remove from the homepage (stays on the Collections page)' : 'Also feature on the homepage'}
                        >
                          {c.show_on_home ? '✓ Featured on homepage' : 'Not on homepage'}
                        </button>
                      </div>
                    </div>
                    <div className="rk-ui-list-side">
                      <Pill tone={c.is_active ? 'ok' : 'neutral'}>{c.is_active ? 'Showing' : 'Hidden'}</Pill>
                      <button type="button" className="rk-ui-btn" onClick={() => toggleField(c, 'is_active')}>{c.is_active ? 'Hide' : 'Show'}</button>
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
                      <p className="rk-cms-panel-title">Editing collection</p>
                      {renderFields(draft, (k, val) => setDraft({ ...draft, [k]: val }), false)}
                      <div className="rk-cms-form-actions">
                        <button type="button" className="rk-ui-btn" onClick={cancelEdit}>Cancel</button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={saveEdit}>Save collection</button>
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
          title="Delete this collection?"
          subtitle={confirmDelete.title || 'Untitled collection'}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmDelete(null)}>Keep it</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger"
                onClick={() => {
                  removeCollection(confirmDelete.id)
                  setConfirmDelete(null)
                }}
              >
                <TrashIcon /> Yes, delete
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            The tile disappears from the store right away. To take it off the store for now, use <b>Hide</b> instead. Deleted by mistake? Click <b>Undo</b> at the top of this page.
          </p>
        </Modal>
      )}
    </div>
  )
}
