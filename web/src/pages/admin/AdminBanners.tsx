import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconLayers, IconMegaphone } from './adminIcons'
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

interface AnnouncementRow {
  id: string
  message: string
  sort_order: number
  is_active: boolean
}

interface HeroSlideRow {
  id: string
  eyebrow: string
  headline: string
  subtext: string
  image_url: string
  primary_cta_label: string
  primary_cta_link: string
  secondary_cta_label: string | null
  secondary_cta_link: string | null
  sort_order: number
  is_active: boolean
}

interface PromoBannerRow {
  id: boolean
  is_active: boolean
  image_url: string | null
  label: string
  headline: string
  subtext: string
  primary_cta_label: string
  primary_cta_link: string
  secondary_cta_label: string | null
  secondary_cta_link: string | null
}

const emptySlideForm = {
  eyebrow: '',
  headline: '',
  subtext: '',
  image_url: '',
  primary_cta_label: 'Shop Now',
  primary_cta_link: '/collections',
  secondary_cta_label: '',
  secondary_cta_link: '',
}

function reorder<T extends { id: string; sort_order: number }>(list: T[], id: string, direction: -1 | 1): [T, T] | null {
  const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order)
  const idx = sorted.findIndex((r) => r.id === id)
  const swapIdx = idx + direction
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return null
  return [sorted[idx], sorted[swapIdx]]
}

export default function AdminBanners() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
  const [slides, setSlides] = useState<HeroSlideRow[]>([])
  const [promoBanner, setPromoBanner] = useState<PromoBannerRow | null>(null)
  const [promoDraft, setPromoDraft] = useState<PromoBannerRow | null>(null)
  const [editingPromo, setEditingPromo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null)
  const [announcementDraft, setAnnouncementDraft] = useState('')

  const [addingSlide, setAddingSlide] = useState(false)
  const [slideForm, setSlideForm] = useState(emptySlideForm)
  const [editingSlide, setEditingSlide] = useState<string | null>(null)
  const [slideDraft, setSlideDraft] = useState<HeroSlideRow | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [announcementsRes, slidesRes, promoRes] = await Promise.all([
      supabase.from('announcements').select('*').order('sort_order', { ascending: true }),
      supabase.from('hero_slides').select('*').order('sort_order', { ascending: true }),
      supabase.from('promo_banner_settings').select('*').eq('id', true).maybeSingle(),
    ])
    if (announcementsRes.error || slidesRes.error || promoRes.error) {
      setError((announcementsRes.error ?? slidesRes.error ?? promoRes.error)?.message ?? 'Failed to load.')
      setLoading(false)
      return
    }
    setAnnouncements((announcementsRes.data ?? []) as AnnouncementRow[])
    setSlides((slidesRes.data ?? []) as HeroSlideRow[])
    setPromoBanner((promoRes.data ?? null) as PromoBannerRow | null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const active =
    editingSlide && slideDraft
      ? { label: `Hero Slide — ${slideDraft.headline || 'Untitled'}`, previewPath: '/' }
      : editingPromo && promoDraft
        ? { label: 'Promo Banner', previewPath: '/' }
        : null

  const { record } = useUndoLog({ sessionLabel: 'Hero & Banners', previewPath: '/', onAfterUndo: load, active })

  const addAnnouncement = async () => {
    if (!newAnnouncement.trim()) return
    const nextOrder = (announcements.at(-1)?.sort_order ?? 0) + 1
    const { data, error: insertError } = await supabase
      .from('announcements')
      .insert({ message: newAnnouncement.trim(), sort_order: nextOrder })
      .select()
      .single()
    if (insertError) return setError(insertError.message)
    record('Add announcement', async () => {
      await supabase.from('announcements').delete().eq('id', data.id)
    })
    setNewAnnouncement('')
    load()
  }

  const saveAnnouncement = async (id: string) => {
    const previous = announcements.find((a) => a.id === id)
    const { error: updateError } = await supabase.from('announcements').update({ message: announcementDraft }).eq('id', id)
    if (updateError) return setError(updateError.message)
    if (previous) {
      record('Edit announcement', async () => {
        await supabase.from('announcements').update({ message: previous.message }).eq('id', id)
      })
    }
    setEditingAnnouncement(null)
    load()
  }

  const removeAnnouncement = async (id: string) => {
    const previous = announcements.find((a) => a.id === id)
    const { error: deleteError } = await supabase.from('announcements').delete().eq('id', id)
    if (deleteError) return setError(deleteError.message)
    if (previous) {
      record('Delete announcement', async () => {
        await supabase.from('announcements').insert(previous)
      })
    }
    load()
  }

  const moveAnnouncement = async (id: string, direction: -1 | 1) => {
    const pair = reorder(announcements, id, direction)
    if (!pair) return
    const [a, b] = pair
    await Promise.all([
      supabase.from('announcements').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('announcements').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    record('Reorder announcements', async () => {
      await Promise.all([
        supabase.from('announcements').update({ sort_order: a.sort_order }).eq('id', a.id),
        supabase.from('announcements').update({ sort_order: b.sort_order }).eq('id', b.id),
      ])
    })
    load()
  }

  const addSlide = async () => {
    if (!slideForm.headline.trim()) return
    const nextOrder = (slides.at(-1)?.sort_order ?? 0) + 1
    const { data, error: insertError } = await supabase
      .from('hero_slides')
      .insert({
        eyebrow: slideForm.eyebrow.trim(),
        headline: slideForm.headline.trim(),
        subtext: slideForm.subtext.trim(),
        image_url: slideForm.image_url.trim(),
        primary_cta_label: slideForm.primary_cta_label.trim(),
        primary_cta_link: slideForm.primary_cta_link.trim() || '/',
        secondary_cta_label: slideForm.secondary_cta_label.trim() || null,
        secondary_cta_link: slideForm.secondary_cta_link.trim() || null,
        sort_order: nextOrder,
      })
      .select()
      .single()
    if (insertError) return setError(insertError.message)
    record('Add hero slide', async () => {
      await supabase.from('hero_slides').delete().eq('id', data.id)
    })
    setSlideForm(emptySlideForm)
    setAddingSlide(false)
    load()
  }

  const startEditSlide = (s: HeroSlideRow) => {
    setEditingSlide(s.id)
    setSlideDraft({ ...s })
  }

  const saveSlide = async () => {
    if (!slideDraft) return
    const previous = slides.find((s) => s.id === slideDraft.id)
    const { error: updateError } = await supabase
      .from('hero_slides')
      .update({
        eyebrow: slideDraft.eyebrow,
        headline: slideDraft.headline,
        subtext: slideDraft.subtext,
        image_url: slideDraft.image_url,
        primary_cta_label: slideDraft.primary_cta_label,
        primary_cta_link: slideDraft.primary_cta_link,
        secondary_cta_label: slideDraft.secondary_cta_label || null,
        secondary_cta_link: slideDraft.secondary_cta_link || null,
      })
      .eq('id', slideDraft.id)
    if (updateError) return setError(updateError.message)
    if (previous) {
      record('Edit hero slide', async () => {
        await supabase
          .from('hero_slides')
          .update({
            eyebrow: previous.eyebrow,
            headline: previous.headline,
            subtext: previous.subtext,
            image_url: previous.image_url,
            primary_cta_label: previous.primary_cta_label,
            primary_cta_link: previous.primary_cta_link,
            secondary_cta_label: previous.secondary_cta_label,
            secondary_cta_link: previous.secondary_cta_link,
          })
          .eq('id', previous.id)
      })
    }
    setEditingSlide(null)
    setSlideDraft(null)
    load()
  }

  const toggleSlideActive = async (s: HeroSlideRow) => {
    const { error: updateError } = await supabase.from('hero_slides').update({ is_active: !s.is_active }).eq('id', s.id)
    if (updateError) return setError(updateError.message)
    record(s.is_active ? 'Hide hero slide' : 'Show hero slide', async () => {
      await supabase.from('hero_slides').update({ is_active: s.is_active }).eq('id', s.id)
    })
    load()
  }

  const removeSlide = async (id: string) => {
    const previous = slides.find((s) => s.id === id)
    const { error: deleteError } = await supabase.from('hero_slides').delete().eq('id', id)
    if (deleteError) return setError(deleteError.message)
    if (previous) {
      record('Delete hero slide', async () => {
        await supabase.from('hero_slides').insert(previous)
      })
    }
    load()
  }

  const startEditPromo = () => {
    if (!promoBanner) return
    setEditingPromo(true)
    setPromoDraft({ ...promoBanner })
  }

  const savePromo = async () => {
    if (!promoDraft) return
    const previous = promoBanner
    const { error: updateError } = await supabase
      .from('promo_banner_settings')
      .update({
        image_url: promoDraft.image_url,
        label: promoDraft.label,
        headline: promoDraft.headline,
        subtext: promoDraft.subtext,
        primary_cta_label: promoDraft.primary_cta_label,
        primary_cta_link: promoDraft.primary_cta_link,
        secondary_cta_label: promoDraft.secondary_cta_label || null,
        secondary_cta_link: promoDraft.secondary_cta_link || null,
      })
      .eq('id', true)
    if (updateError) return setError(updateError.message)
    if (previous) {
      record('Edit promo banner', async () => {
        await supabase
          .from('promo_banner_settings')
          .update({
            image_url: previous.image_url,
            label: previous.label,
            headline: previous.headline,
            subtext: previous.subtext,
            primary_cta_label: previous.primary_cta_label,
            primary_cta_link: previous.primary_cta_link,
            secondary_cta_label: previous.secondary_cta_label,
            secondary_cta_link: previous.secondary_cta_link,
          })
          .eq('id', true)
      })
    }
    setEditingPromo(false)
    setPromoDraft(null)
    load()
  }

  const togglePromoActive = async () => {
    if (!promoBanner) return
    const { error: updateError } = await supabase
      .from('promo_banner_settings')
      .update({ is_active: !promoBanner.is_active })
      .eq('id', true)
    if (updateError) return setError(updateError.message)
    record(promoBanner.is_active ? 'Hide promo banner' : 'Show promo banner', async () => {
      await supabase.from('promo_banner_settings').update({ is_active: promoBanner.is_active }).eq('id', true)
    })
    load()
  }

  const moveSlide = async (id: string, direction: -1 | 1) => {
    const pair = reorder(slides, id, direction)
    if (!pair) return
    const [a, b] = pair
    await Promise.all([
      supabase.from('hero_slides').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('hero_slides').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    record('Reorder hero slides', async () => {
      await Promise.all([
        supabase.from('hero_slides').update({ sort_order: a.sort_order }).eq('id', a.id),
        supabase.from('hero_slides').update({ sort_order: b.sort_order }).eq('id', b.id),
      ])
    })
    load()
  }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-reorder-col {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .rk-reorder-btn {
          width: 22px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          color: var(--text-faint);
          cursor: pointer;
          border-radius: 0.25rem;
        }
        .rk-reorder-btn:hover:not(:disabled) {
          color: var(--text);
          background: var(--bg);
        }
        .rk-reorder-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .rk-slide-card {
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 1rem;
          margin-bottom: 0.75rem;
          display: flex;
          gap: 0.875rem;
        }
        .rk-slide-thumb {
          width: 96px;
          height: 64px;
          flex-shrink: 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg);
        }
        .rk-slide-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-slide-body {
          flex: 1;
          min-width: 0;
        }
        .rk-slide-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-red);
        }
        .rk-slide-headline {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 1.0625rem;
          color: var(--text);
          margin: 0.125rem 0;
        }
        .rk-slide-subtext {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-slide-ctas {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .rk-slide-cta-chip {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.25rem 0.625rem;
          border-radius: 999px;
          background: var(--bg-secondary);
          color: var(--text-muted);
        }
        .rk-slide-actions {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          align-items: flex-end;
        }
        .rk-slide-edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .rk-slide-edit-grid input,
        .rk-slide-edit-grid textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.8125rem;
          background: var(--bg);
          color: var(--text);
        }
        .rk-slide-edit-full {
          grid-column: 1 / -1;
        }
      `}</style>

      {error && (
        <div className="rk-admin-card">
          <p className="rk-admin-card-desc" style={{ color: 'var(--accent-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="rk-admin-card">
        <h2 className="rk-admin-card-title"><IconMegaphone /> Announcement Bar</h2>
        <p className="rk-admin-card-desc">Rotating messages shown at the top of the store.</p>
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="rk-admin-empty">No announcements yet.</p>
        ) : (
          announcements.map((a, i) => (
            <div key={a.id} className="rk-admin-row">
              <div className="rk-reorder-col">
                <button className="rk-reorder-btn" onClick={() => moveAnnouncement(a.id, -1)} disabled={i === 0} aria-label="Move up"><UpIcon /></button>
                <button className="rk-reorder-btn" onClick={() => moveAnnouncement(a.id, 1)} disabled={i === announcements.length - 1} aria-label="Move down"><DownIcon /></button>
              </div>
              {editingAnnouncement === a.id ? (
                <input type="text" value={announcementDraft} onChange={(e) => setAnnouncementDraft(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveAnnouncement(a.id)} />
              ) : (
                <span>{a.message}</span>
              )}
              {editingAnnouncement === a.id ? (
                <button className="rk-admin-icon-btn" onClick={() => saveAnnouncement(a.id)} aria-label="Save">✓</button>
              ) : (
                <button className="rk-admin-icon-btn" onClick={() => { setEditingAnnouncement(a.id); setAnnouncementDraft(a.message) }} aria-label="Edit">
                  <EditIcon />
                </button>
              )}
              <button className="rk-admin-icon-btn" onClick={() => removeAnnouncement(a.id)} aria-label="Delete">
                <TrashIcon />
              </button>
            </div>
          ))
        )}
        <div className="rk-admin-add-row">
          <input
            className="rk-admin-add-input"
            type="text"
            placeholder="New announcement text..."
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAnnouncement()}
          />
          <button className="rk-admin-add-btn" onClick={addAnnouncement}>Add</button>
        </div>
      </div>

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconLayers /> Hero Carousel</h2>
            <p className="rk-admin-card-desc">Edit the rotating hero banners on the homepage.</p>
          </div>
          <button className="rk-admin-primary-btn" onClick={() => setAddingSlide((a) => !a)}>+ Add Slide</button>
        </div>

        {addingSlide && (
          <div className="rk-admin-form-panel">
            <div className="rk-slide-edit-grid">
              <label className="rk-field">
                <span className="rk-field-label">Eyebrow</span>
                <input placeholder="e.g. New Drop" value={slideForm.eyebrow} onChange={(e) => setSlideForm((f) => ({ ...f, eyebrow: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Headline</span>
                <input value={slideForm.headline} onChange={(e) => setSlideForm((f) => ({ ...f, headline: e.target.value }))} />
              </label>
              <label className="rk-field rk-slide-edit-full">
                <span className="rk-field-label">Subtext</span>
                <textarea rows={2} value={slideForm.subtext} onChange={(e) => setSlideForm((f) => ({ ...f, subtext: e.target.value }))} />
              </label>
              <label className="rk-field rk-slide-edit-full">
                <span className="rk-field-label">Image</span>
                <div className="rk-field-upload-row">
                  {slideForm.image_url && <img className="rk-field-thumb" src={slideForm.image_url} alt="" />}
                  <ImageUploadButton label={slideForm.image_url ? 'Change Image' : '+ Upload Image'} aspect={16 / 9} onUploaded={(url) => setSlideForm((f) => ({ ...f, image_url: url }))} />
                </div>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Primary button label</span>
                <input value={slideForm.primary_cta_label} onChange={(e) => setSlideForm((f) => ({ ...f, primary_cta_label: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Primary button link</span>
                <input value={slideForm.primary_cta_link} onChange={(e) => setSlideForm((f) => ({ ...f, primary_cta_link: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Secondary button label (optional)</span>
                <input value={slideForm.secondary_cta_label} onChange={(e) => setSlideForm((f) => ({ ...f, secondary_cta_label: e.target.value }))} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Secondary button link (optional)</span>
                <input value={slideForm.secondary_cta_link} onChange={(e) => setSlideForm((f) => ({ ...f, secondary_cta_link: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button className="rk-admin-add-btn" onClick={addSlide}>Save Slide</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : slides.length === 0 ? (
          <p className="rk-admin-empty">No hero slides yet.</p>
        ) : (
          slides.map((s, i) => {
            const isEditing = editingSlide === s.id
            return (
              <div key={s.id} className="rk-slide-card">
                <div className="rk-reorder-col">
                  <button className="rk-reorder-btn" onClick={() => moveSlide(s.id, -1)} disabled={i === 0} aria-label="Move up"><UpIcon /></button>
                  <button className="rk-reorder-btn" onClick={() => moveSlide(s.id, 1)} disabled={i === slides.length - 1} aria-label="Move down"><DownIcon /></button>
                </div>
                <div className="rk-slide-thumb">
                  {s.image_url ? <img src={s.image_url} alt="" /> : null}
                </div>
                {isEditing && slideDraft ? (
                  <div className="rk-slide-body">
                    <div className="rk-slide-edit-grid">
                      <label className="rk-field">
                        <span className="rk-field-label">Eyebrow</span>
                        <input value={slideDraft.eyebrow} onChange={(e) => setSlideDraft({ ...slideDraft, eyebrow: e.target.value })} />
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Headline</span>
                        <input value={slideDraft.headline} onChange={(e) => setSlideDraft({ ...slideDraft, headline: e.target.value })} />
                      </label>
                      <label className="rk-field rk-slide-edit-full">
                        <span className="rk-field-label">Subtext</span>
                        <textarea rows={2} value={slideDraft.subtext} onChange={(e) => setSlideDraft({ ...slideDraft, subtext: e.target.value })} />
                      </label>
                      <label className="rk-field rk-slide-edit-full">
                        <span className="rk-field-label">Image</span>
                        <div className="rk-field-upload-row">
                          {slideDraft.image_url && <img className="rk-field-thumb" src={slideDraft.image_url} alt="" />}
                          <ImageUploadButton label={slideDraft.image_url ? 'Change Image' : '+ Upload Image'} aspect={16 / 9} onUploaded={(url) => setSlideDraft({ ...slideDraft, image_url: url })} />
                        </div>
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Primary button label</span>
                        <input value={slideDraft.primary_cta_label} onChange={(e) => setSlideDraft({ ...slideDraft, primary_cta_label: e.target.value })} />
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Primary button link</span>
                        <input value={slideDraft.primary_cta_link} onChange={(e) => setSlideDraft({ ...slideDraft, primary_cta_link: e.target.value })} />
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Secondary button label</span>
                        <input value={slideDraft.secondary_cta_label ?? ''} onChange={(e) => setSlideDraft({ ...slideDraft, secondary_cta_label: e.target.value })} />
                      </label>
                      <label className="rk-field">
                        <span className="rk-field-label">Secondary button link</span>
                        <input value={slideDraft.secondary_cta_link ?? ''} onChange={(e) => setSlideDraft({ ...slideDraft, secondary_cta_link: e.target.value })} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rk-slide-body">
                    <div className="rk-slide-eyebrow">{s.eyebrow || '—'}</div>
                    <div className="rk-slide-headline">{s.headline}</div>
                    <div className="rk-slide-subtext">{s.subtext}</div>
                    <div className="rk-slide-ctas">
                      {s.primary_cta_label && <span className="rk-slide-cta-chip">{s.primary_cta_label}</span>}
                      {s.secondary_cta_label && <span className="rk-slide-cta-chip">{s.secondary_cta_label}</span>}
                    </div>
                  </div>
                )}
                <div className="rk-slide-actions">
                  <button
                    className={`rk-admin-badge ${s.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
                    style={{ border: 'none', cursor: 'pointer' }}
                    onClick={() => toggleSlideActive(s)}
                  >
                    {s.is_active ? 'Live' : 'Hidden'}
                  </button>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {isEditing ? (
                      <button className="rk-admin-icon-btn" onClick={saveSlide} aria-label="Save">✓</button>
                    ) : (
                      <button className="rk-admin-icon-btn" onClick={() => startEditSlide(s)} aria-label="Edit"><EditIcon /></button>
                    )}
                    <button className="rk-admin-icon-btn" onClick={() => removeSlide(s.id)} aria-label="Delete"><TrashIcon /></button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="rk-admin-card">
        <div className="rk-admin-card-head">
          <div>
            <h2 className="rk-admin-card-title"><IconMegaphone /> Promotional Banner</h2>
            <p className="rk-admin-card-desc">The membership promo banner shown between sections on the homepage.</p>
          </div>
          {promoBanner && (
            <button
              className={`rk-admin-badge ${promoBanner.is_active ? 'rk-admin-badge-ok' : 'rk-admin-badge-off'}`}
              style={{ border: 'none', cursor: 'pointer' }}
              onClick={togglePromoActive}
            >
              {promoBanner.is_active ? 'Live' : 'Hidden'}
            </button>
          )}
        </div>

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : !promoBanner ? (
          <p className="rk-admin-empty">Promo banner settings not found.</p>
        ) : editingPromo && promoDraft ? (
          <div className="rk-admin-form-panel">
            <div className="rk-slide-edit-grid">
              <label className="rk-field">
                <span className="rk-field-label">Label</span>
                <input value={promoDraft.label} onChange={(e) => setPromoDraft({ ...promoDraft, label: e.target.value })} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Headline</span>
                <input value={promoDraft.headline} onChange={(e) => setPromoDraft({ ...promoDraft, headline: e.target.value })} />
              </label>
              <label className="rk-field rk-slide-edit-full">
                <span className="rk-field-label">Subtext</span>
                <textarea rows={2} value={promoDraft.subtext} onChange={(e) => setPromoDraft({ ...promoDraft, subtext: e.target.value })} />
              </label>
              <label className="rk-field rk-slide-edit-full">
                <span className="rk-field-label">Background image</span>
                <div className="rk-field-upload-row">
                  {promoDraft.image_url && <img className="rk-field-thumb" src={promoDraft.image_url} alt="" />}
                  <ImageUploadButton label={promoDraft.image_url ? 'Change Image' : '+ Upload Image'} aspect={12 / 5} onUploaded={(url) => setPromoDraft({ ...promoDraft, image_url: url })} />
                </div>
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Primary button label</span>
                <input value={promoDraft.primary_cta_label} onChange={(e) => setPromoDraft({ ...promoDraft, primary_cta_label: e.target.value })} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Primary button link</span>
                <input value={promoDraft.primary_cta_link} onChange={(e) => setPromoDraft({ ...promoDraft, primary_cta_link: e.target.value })} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Secondary button label (optional)</span>
                <input value={promoDraft.secondary_cta_label ?? ''} onChange={(e) => setPromoDraft({ ...promoDraft, secondary_cta_label: e.target.value })} />
              </label>
              <label className="rk-field">
                <span className="rk-field-label">Secondary button link (optional)</span>
                <input value={promoDraft.secondary_cta_link ?? ''} onChange={(e) => setPromoDraft({ ...promoDraft, secondary_cta_link: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="rk-admin-icon-btn" onClick={() => { setEditingPromo(false); setPromoDraft(null) }} aria-label="Cancel">✕</button>
              <button className="rk-admin-add-btn" onClick={savePromo}>Save Banner</button>
            </div>
          </div>
        ) : (
          <div className="rk-slide-card">
            <div className="rk-slide-thumb">
              {promoBanner.image_url ? <img src={promoBanner.image_url} alt="" /> : null}
            </div>
            <div className="rk-slide-body">
              <div className="rk-slide-eyebrow">{promoBanner.label}</div>
              <div className="rk-slide-headline">{promoBanner.headline}</div>
              <div className="rk-slide-subtext">{promoBanner.subtext}</div>
              <div className="rk-slide-ctas">
                {promoBanner.primary_cta_label && <span className="rk-slide-cta-chip">{promoBanner.primary_cta_label}</span>}
                {promoBanner.secondary_cta_label && <span className="rk-slide-cta-chip">{promoBanner.secondary_cta_label}</span>}
              </div>
            </div>
            <div className="rk-slide-actions">
              <button className="rk-admin-icon-btn" onClick={startEditPromo} aria-label="Edit"><EditIcon /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
