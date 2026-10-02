import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { adminCardStyles } from './adminCardStyles'
import { IconLayers, IconMegaphone } from './adminIcons'
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

// Shape shared by the new-slide form, a slide draft and the promo draft, so
// one field layout can render all three.
interface BannerFieldValues {
  eyebrow?: string
  label?: string
  headline: string
  subtext: string
  image_url: string | null
  primary_cta_label: string
  primary_cta_link: string
  secondary_cta_label: string | null
  secondary_cta_link: string | null
}
type BannerFieldKey = keyof BannerFieldValues

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

  const toggleAnnouncementActive = async (a: AnnouncementRow) => {
    const { error: updateError } = await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id)
    if (updateError) return setError(updateError.message)
    record(a.is_active ? 'Hide announcement' : 'Show announcement', async () => {
      await supabase.from('announcements').update({ is_active: a.is_active }).eq('id', a.id)
    })
    load()
  }

  const cancelEditSlide = () => {
    setEditingSlide(null)
    setSlideDraft(null)
  }

  const cancelEditPromo = () => {
    setEditingPromo(false)
    setPromoDraft(null)
  }

  // One shared "Are you sure?" dialog for every delete on this page.
  const [confirmDelete, setConfirmDelete] = useState<{ what: string; name: string; onConfirm: () => void } | null>(null)

  // The same field layout is used for adding a slide, editing a slide and
  // editing the promo banner — only the small top line differs.
  const renderBannerFields = (
    v: BannerFieldValues,
    set: (key: BannerFieldKey, value: string) => void,
    kind: 'slide' | 'promo',
  ) => {
    const topKey = kind === 'slide' ? 'eyebrow' : 'label'
    const topValue = (kind === 'slide' ? v.eyebrow : v.label) ?? ''
    return (
      <div className="rk-ui-form">
        <label className="rk-ui-field">
          <span>Small text above the headline</span>
          <input placeholder={kind === 'slide' ? 'e.g. New Drop' : 'e.g. Members only'} value={topValue} onChange={(e) => set(topKey, e.target.value)} />
          <span className="rk-ui-field-hint">Optional. Shown in small red capitals.</span>
        </label>
        <label className="rk-ui-field">
          <span>Headline{kind === 'slide' ? ' (required)' : ''}</span>
          <input placeholder="e.g. Fresh pairs just landed" value={v.headline} onChange={(e) => set('headline', e.target.value)} />
          <span className="rk-ui-field-hint">The big bold line shoppers read first.</span>
        </label>
        <label className="rk-ui-field rk-ui-field-full">
          <span>Supporting text</span>
          <textarea rows={2} value={v.subtext} onChange={(e) => set('subtext', e.target.value)} />
          <span className="rk-ui-field-hint">One or two short sentences under the headline.</span>
        </label>
        <div className="rk-ui-field rk-ui-field-full">
          <span>Background photo</span>
          <div className="rk-cms-upload-row">
            <div className="rk-cms-thumb">{v.image_url ? <img src={v.image_url} alt="" /> : 'No photo'}</div>
            <ImageUploadButton
              label={v.image_url ? 'Change photo' : '+ Upload photo'}
              aspect={kind === 'slide' ? 16 / 9 : 12 / 5}
              onUploaded={(url) => set('image_url', url)}
            />
          </div>
          <span className="rk-ui-field-hint">{kind === 'slide' ? 'Wide photo, cropped to 16:9.' : 'Very wide photo, cropped to 12:5.'}</span>
        </div>
        <label className="rk-ui-field">
          <span>Main button text</span>
          <input placeholder="e.g. Shop Now" value={v.primary_cta_label} onChange={(e) => set('primary_cta_label', e.target.value)} />
        </label>
        <label className="rk-ui-field">
          <span>Main button goes to</span>
          <input placeholder="e.g. /collections" value={v.primary_cta_link} onChange={(e) => set('primary_cta_link', e.target.value)} />
          <span className="rk-ui-field-hint">A page on your store, like /collections or /category/running.</span>
        </label>
        <label className="rk-ui-field">
          <span>Second button text (optional)</span>
          <input value={v.secondary_cta_label ?? ''} onChange={(e) => set('secondary_cta_label', e.target.value)} />
        </label>
        <label className="rk-ui-field">
          <span>Second button goes to (optional)</span>
          <input value={v.secondary_cta_link ?? ''} onChange={(e) => set('secondary_cta_link', e.target.value)} />
          <span className="rk-ui-field-hint">Leave both blank to show only one button.</span>
        </label>
      </div>
    )
  }

  const renderButtonChips = (b: { primary_cta_label: string; primary_cta_link: string; secondary_cta_label: string | null; secondary_cta_link: string | null }) => (
    <div className="rk-cms-chips">
      {b.primary_cta_label && <span className="rk-cms-chip" title={`Goes to ${b.primary_cta_link}`}>Button: {b.primary_cta_label} → {b.primary_cta_link}</span>}
      {b.secondary_cta_label && <span className="rk-cms-chip" title={`Goes to ${b.secondary_cta_link ?? ''}`}>Button: {b.secondary_cta_label} → {b.secondary_cta_link}</span>}
    </div>
  )

  const liveAnnouncements = announcements.filter((a) => a.is_active).length
  const liveSlides = slides.filter((s) => s.is_active).length

  return (
    <div>
      <style>{adminCardStyles}</style>

      {error && <Notice tone="alert" onDismiss={() => setError(null)}>{error}</Notice>}

      {/* ---------------- Announcement bar ---------------- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconMegaphone />}
          title="Announcement Bar"
          desc="Short messages that rotate in the thin strip at the very top of every page — e.g. “Free shipping over ₱3,000”."
          actions={!loading && <Pill tone={liveAnnouncements > 0 ? 'ok' : 'neutral'}>{liveAnnouncements} of {announcements.length} showing</Pill>}
        />
        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : announcements.length === 0 ? (
          <EmptyState title="No announcements yet" hint="Type a message below and click “Add message” — it shows up at the top of the store straight away." />
        ) : (
          <div className="rk-ui-list rk-cms-list">
            {announcements.map((a, i) => {
              const isEditing = editingAnnouncement === a.id
              return (
                <div key={a.id} className={`rk-ui-list-row ${a.is_active ? '' : 'rk-cms-row-hidden'}`}>
                  <MoveButtons
                    what="message"
                    onUp={() => moveAnnouncement(a.id, -1)}
                    onDown={() => moveAnnouncement(a.id, 1)}
                    upDisabled={i === 0}
                    downDisabled={i === announcements.length - 1}
                  />
                  <div className="rk-ui-list-main">
                    {isEditing ? (
                      <input
                        className="rk-cms-inline-input"
                        type="text"
                        value={announcementDraft}
                        onChange={(e) => setAnnouncementDraft(e.target.value)}
                        autoFocus
                        aria-label="Announcement text"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAnnouncement(a.id)
                          if (e.key === 'Escape') setEditingAnnouncement(null)
                        }}
                      />
                    ) : (
                      <>
                        <div className="rk-ui-list-title">{a.message}</div>
                        <div className="rk-ui-list-meta">Message {i + 1} of {announcements.length}</div>
                      </>
                    )}
                  </div>
                  <div className="rk-ui-list-side">
                    {isEditing ? (
                      <>
                        <button type="button" className="rk-ui-btn" onClick={() => setEditingAnnouncement(null)}>Cancel</button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => saveAnnouncement(a.id)}>Save</button>
                      </>
                    ) : (
                      <>
                        <Pill tone={a.is_active ? 'ok' : 'neutral'}>{a.is_active ? 'Showing' : 'Hidden'}</Pill>
                        <button type="button" className="rk-ui-btn" onClick={() => toggleAnnouncementActive(a)}>{a.is_active ? 'Hide' : 'Show'}</button>
                        <button type="button" className="rk-ui-btn" onClick={() => { setEditingAnnouncement(a.id); setAnnouncementDraft(a.message) }}>
                          <EditIcon /> Edit
                        </button>
                        <button
                          type="button"
                          className="rk-ui-btn rk-ui-btn-danger"
                          onClick={() => setConfirmDelete({ what: 'announcement', name: a.message, onConfirm: () => removeAnnouncement(a.id) })}
                        >
                          <TrashIcon /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="rk-cms-add-row">
          <input
            className="rk-cms-inline-input"
            type="text"
            placeholder="New message, e.g. Free shipping on orders over ₱3,000"
            aria-label="New announcement text"
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAnnouncement()}
          />
          <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addAnnouncement} disabled={!newAnnouncement.trim()}>+ Add message</button>
        </div>
      </div>

      {/* ---------------- Hero carousel ---------------- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconLayers />}
          title="Homepage Slideshow"
          desc="The large rotating banners at the top of the homepage. Slides play in the order shown here; hidden slides are skipped."
          actions={
            <>
              {!loading && <Pill tone={liveSlides > 0 ? 'ok' : 'warn'}>{liveSlides} of {slides.length} showing</Pill>}
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg"
                onClick={() => setAddingSlide((a) => !a)}
                aria-expanded={addingSlide}
              >
                {addingSlide ? 'Close' : '+ Add slide'}
              </button>
            </>
          }
        />

        {addingSlide && (
          <div className="rk-cms-add-panel">
            <p className="rk-cms-panel-title">New slide</p>
            {renderBannerFields(slideForm, (k, val) => setSlideForm((f) => ({ ...f, [k]: val })), 'slide')}
            <div className="rk-cms-form-actions">
              {!slideForm.headline.trim() && <span className="rk-cms-form-actions-note">Add a headline to save this slide.</span>}
              <button type="button" className="rk-ui-btn" onClick={() => { setAddingSlide(false); setSlideForm(emptySlideForm) }}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={addSlide} disabled={!slideForm.headline.trim()}>Add slide</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : slides.length === 0 ? (
          <EmptyState
            title="No slides yet"
            hint="The homepage needs at least one slide to show a banner at the top."
            action={!addingSlide && <button type="button" className="rk-ui-btn rk-ui-btn-primary" onClick={() => setAddingSlide(true)}>+ Add your first slide</button>}
          />
        ) : (
          <div className="rk-ui-list rk-cms-list">
            {slides.map((s, i) => {
              const isEditing = editingSlide === s.id && slideDraft
              return (
                <div key={s.id}>
                  <div className={`rk-ui-list-row ${s.is_active ? '' : 'rk-cms-row-hidden'}`}>
                    <MoveButtons
                      what="slide"
                      onUp={() => moveSlide(s.id, -1)}
                      onDown={() => moveSlide(s.id, 1)}
                      upDisabled={i === 0}
                      downDisabled={i === slides.length - 1}
                    />
                    <div className="rk-cms-thumb rk-cms-thumb-wide">{s.image_url ? <img src={s.image_url} alt="" /> : 'No photo'}</div>
                    <div className="rk-ui-list-main">
                      {s.eyebrow && <div className="rk-cms-eyebrow">{s.eyebrow}</div>}
                      <div className="rk-ui-list-title">{s.headline || 'Untitled slide'}</div>
                      {s.subtext && <div className="rk-ui-list-meta">{s.subtext}</div>}
                      {renderButtonChips(s)}
                    </div>
                    <div className="rk-ui-list-side">
                      <Pill tone={s.is_active ? 'ok' : 'neutral'}>{s.is_active ? 'Showing' : 'Hidden'}</Pill>
                      <button type="button" className="rk-ui-btn" onClick={() => toggleSlideActive(s)}>{s.is_active ? 'Hide' : 'Show'}</button>
                      {!isEditing && (
                        <button type="button" className="rk-ui-btn" onClick={() => startEditSlide(s)}>
                          <EditIcon /> Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="rk-ui-btn rk-ui-btn-danger"
                        onClick={() => setConfirmDelete({ what: 'slide', name: s.headline || 'Untitled slide', onConfirm: () => removeSlide(s.id) })}
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                  </div>
                  {isEditing && slideDraft && (
                    <div className="rk-cms-edit-panel">
                      <p className="rk-cms-panel-title">Editing slide</p>
                      {renderBannerFields(slideDraft, (k, val) => setSlideDraft({ ...slideDraft, [k]: val }), 'slide')}
                      <div className="rk-cms-form-actions">
                        <button type="button" className="rk-ui-btn" onClick={cancelEditSlide}>Cancel</button>
                        <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={saveSlide}>Save slide</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---------------- Promo banner ---------------- */}
      <div className="rk-admin-card">
        <SectionHead
          icon={<IconMegaphone />}
          title="Promo Banner"
          desc="One wide membership/promo banner shown between sections on the homepage."
          actions={
            promoBanner && (
              <>
                <Pill tone={promoBanner.is_active ? 'ok' : 'neutral'}>{promoBanner.is_active ? 'Showing' : 'Hidden'}</Pill>
                <button type="button" className="rk-ui-btn" onClick={togglePromoActive}>{promoBanner.is_active ? 'Hide banner' : 'Show banner'}</button>
              </>
            )
          }
        />

        {loading ? (
          <p className="rk-admin-empty">Loading…</p>
        ) : !promoBanner ? (
          <EmptyState title="Promo banner isn’t set up" hint="The promo banner settings row is missing from the database, so there’s nothing to edit here yet." />
        ) : editingPromo && promoDraft ? (
          <div className="rk-cms-add-panel">
            <p className="rk-cms-panel-title">Editing promo banner</p>
            {renderBannerFields(promoDraft, (k, val) => setPromoDraft({ ...promoDraft, [k]: val }), 'promo')}
            <div className="rk-cms-form-actions">
              <button type="button" className="rk-ui-btn" onClick={cancelEditPromo}>Cancel</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-primary rk-ui-btn-lg" onClick={savePromo}>Save banner</button>
            </div>
          </div>
        ) : (
          <div className="rk-ui-list rk-cms-list">
            <div className={`rk-ui-list-row ${promoBanner.is_active ? '' : 'rk-cms-row-hidden'}`}>
              <div className="rk-cms-thumb rk-cms-thumb-wide">{promoBanner.image_url ? <img src={promoBanner.image_url} alt="" /> : 'No photo'}</div>
              <div className="rk-ui-list-main">
                {promoBanner.label && <div className="rk-cms-eyebrow">{promoBanner.label}</div>}
                <div className="rk-ui-list-title">{promoBanner.headline || 'No headline'}</div>
                {promoBanner.subtext && <div className="rk-ui-list-meta">{promoBanner.subtext}</div>}
                {renderButtonChips(promoBanner)}
              </div>
              <div className="rk-ui-list-side">
                <button type="button" className="rk-ui-btn" onClick={startEditPromo}>
                  <EditIcon /> Edit banner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <Modal
          title={`Delete this ${confirmDelete.what}?`}
          subtitle={confirmDelete.name}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmDelete(null)}>Keep it</button>
              <button
                type="button"
                className="rk-ui-btn rk-ui-btn-danger"
                onClick={() => {
                  confirmDelete.onConfirm()
                  setConfirmDelete(null)
                }}
              >
                <TrashIcon /> Yes, delete
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            It disappears from the store right away. If you only want to take it off the store for now, use <b>Hide</b> instead. Deleted by mistake? Click <b>Undo</b> at the top of this page.
          </p>
        </Modal>
      )}
    </div>
  )
}
