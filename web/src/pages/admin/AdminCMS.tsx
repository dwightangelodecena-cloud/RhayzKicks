import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import AdminBanners from './AdminBanners'
import AdminCollections from './AdminCollections'
import AdminCategories from './AdminCategories'
import AdminProducts from './AdminProducts'
import { EditSessionProvider, useEditSession } from '../../context/EditSessionContext'
import { IconBox, IconEye, IconLayers, IconMegaphone, IconMonitor, IconRefresh, IconReset, IconSave, IconSmartphone, IconTags, IconUndo } from './adminIcons'
import { Modal, Pill } from './adminUi'
import { adminCardStyles } from './adminCardStyles'

// The preview pane is narrower than a real desktop viewport, so the iframe
// renders at a real desktop width and gets scaled down to fit — otherwise
// the storefront's own mobile breakpoint kicks in and the preview looks like
// a phone instead of the site.
const PREVIEW_DESKTOP_WIDTH = 1280

// Mobile preview renders at an actual phone viewport size (no scaling trick
// needed — the storefront's own mobile breakpoint kicks in here, which is
// the point) so admins can see how a page looks on the shopper's phone.
// This previews the responsive web storefront's mobile layout, which reads
// the same CMS content as the Flutter app — not a live render of the
// Flutter binary itself.
const PREVIEW_MOBILE_WIDTH = 390
const PREVIEW_MOBILE_HEIGHT = 780

const PREVIEW_MIN_WIDTH = 320
const PREVIEW_MAX_WIDTH = 960
const PREVIEW_DEFAULT_WIDTH = 736
const PREVIEW_WIDTH_STORAGE_KEY = 'rk-cms-preview-width'

function clampPreviewWidth(px: number) {
  return Math.min(PREVIEW_MAX_WIDTH, Math.max(PREVIEW_MIN_WIDTH, px))
}

// `desc` is the one-line, plain-language answer to "what does this change on
// the store?" — shown under each sub-section button.
const sections = [
  { key: 'banners', label: 'Hero & Banners', desc: 'Top announcement bar, homepage slideshow and promo banner', icon: IconMegaphone, Component: AdminBanners, previewPath: '/' },
  { key: 'collections', label: 'Collections', desc: 'Featured collection tiles on the homepage and Collections page', icon: IconLayers, Component: AdminCollections, previewPath: '/collections' },
  { key: 'categories', label: 'Categories', desc: 'Menu links at the top of the store and “Shop by Activity” cards', icon: IconTags, Component: AdminCategories, previewPath: '/' },
  { key: 'products', label: 'Products', desc: 'Shoes for sale — names, prices, photos, sizes and stock', icon: IconBox, Component: AdminProducts, previewPath: '/' },
] as const

type SectionKey = (typeof sections)[number]['key']

// Friendly name for whatever storefront route the preview is showing.
function describePreviewPath(path: string) {
  if (path === '/') return 'Homepage'
  if (path === '/collections') return 'Collections page'
  if (path.startsWith('/product/')) return 'Product page'
  if (path.startsWith('/category/')) return `Category page (${path.slice('/category/'.length)})`
  return path
}

function AdminCMSInner() {
  const [section, setSection] = useState<SectionKey>('banners')
  const [previewOpen, setPreviewOpen] = useState(true)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [previewPath, setPreviewPath] = useState('/')
  const [reloadKey, setReloadKey] = useState(0)
  const { session } = useEditSession()

  const active = sections.find((s) => s.key === section)!
  const ActiveComponent = active.Component

  // When a section starts editing something with its own preview route (e.g.
  // a specific product), jump the preview there automatically.
  useEffect(() => {
    if (session?.previewPath) setPreviewPath(session.previewPath)
  }, [session?.previewPath])

  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewDims, setPreviewDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = previewWrapRef.current
    if (!el || !previewOpen) return
    const update = () => setPreviewDims({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [previewOpen])

  const previewScale = previewDims.width > 0 ? previewDims.width / PREVIEW_DESKTOP_WIDTH : 1
  const previewFrameHeight = previewScale > 0 ? previewDims.height / previewScale : previewDims.height

  const [previewWidth, setPreviewWidth] = useState(() => {
    const stored = Number(window.localStorage.getItem(PREVIEW_WIDTH_STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0 ? clampPreviewWidth(stored) : PREVIEW_DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const previewWidthRef = useRef(previewWidth)
  useEffect(() => {
    previewWidthRef.current = previewWidth
  }, [previewWidth])

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsResizing(true)
    // The iframe is a separate document, so pointermove events over it never
    // reach this window listener — without blocking pointer events on it
    // mid-drag, the resize stutters/jumps every time the cursor crosses it.
    const prevBodyUserSelect = document.body.style.userSelect
    const prevBodyCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const startX = e.clientX
    const startWidth = previewWidthRef.current
    const onMove = (moveEvent: PointerEvent) => {
      const next = clampPreviewWidth(startWidth + (startX - moveEvent.clientX))
      previewWidthRef.current = next
      setPreviewWidth(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setIsResizing(false)
      document.body.style.userSelect = prevBodyUserSelect
      document.body.style.cursor = prevBodyCursor
      window.localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(previewWidthRef.current))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const resetPreviewWidth = () => {
    setPreviewWidth(PREVIEW_DEFAULT_WIDTH)
    window.localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(PREVIEW_DEFAULT_WIDTH))
  }

  // The topbar, subnav, and preview pane are each sticky, stacked at the
  // exact pixel heights of the real elements above them (measured, not
  // guessed) — so at rest their position already equals their sticky
  // threshold and there's nothing to "catch up" on when scrolling starts.
  const topbarRef = useRef<HTMLDivElement>(null)
  const subnavRef = useRef<HTMLDivElement>(null)
  const [stickyTops, setStickyTops] = useState({ topbar: 84, subnav: 140, preview: 196 })

  useEffect(() => {
    const topbarEl = topbarRef.current
    const subnavEl = subnavRef.current
    if (!topbarEl || !subnavEl) return
    const update = () => {
      const headerEl = document.querySelector('.rk-admin-header') as HTMLElement | null
      const headerHeight = headerEl?.offsetHeight ?? 84
      const topbarHeight = topbarEl.offsetHeight
      const subnavHeight = subnavEl.offsetHeight
      setStickyTops({
        topbar: headerHeight,
        subnav: headerHeight + topbarHeight,
        preview: headerHeight + topbarHeight + subnavHeight,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(topbarEl)
    observer.observe(subnavEl)
    const headerEl = document.querySelector('.rk-admin-header')
    if (headerEl) observer.observe(headerEl)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const reloadPreview = () => setReloadKey((k) => k + 1)

  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleSave = async () => {
    if (!session) return
    setSaving(true)
    try {
      await session.save()
    } finally {
      setSaving(false)
    }
    reloadPreview()
  }

  const handleUndo = () => {
    session?.undo()
  }

  const handleReset = () => {
    setConfirmReset(false)
    session?.reset()
  }

  // Reset only does something when there's an unsaved draft or a change to
  // reverse — otherwise it's disabled instead of silently doing nothing.
  const canReset = !!session && (session.isDirty || session.canUndo)

  // Status shown in the top bar: one clear pill + one plain sentence.
  const status = !session
    ? { tone: 'neutral' as const, pill: 'Nothing open', text: 'Changes on this tab go live as soon as you make them. Undo and Reset appear here after you change something.' }
    : session.isDirty
      ? { tone: 'warn' as const, pill: 'Unsaved changes', text: 'Click “Save changes” to put them on the store, or Reset to throw them away.' }
      : session.canUndo
        ? { tone: 'ok' as const, pill: 'Saved — live on the store', text: 'Changed your mind? Undo reverses the last change; Reset reverses all of them.' }
        : { tone: 'info' as const, pill: 'Editing', text: 'Nothing changed yet.' }

  return (
    <div>
      <style>{adminCardStyles}</style>
      <style>{`
        .rk-cms-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.25rem;
          background: var(--bg-secondary);
        }
        .rk-cms-topbar-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          font-size: 1.0625rem;
          color: var(--text);
          margin: 0;
        }
        .rk-cms-topbar-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
        }
        .rk-cms-topbar-sub strong {
          color: var(--text);
          font-weight: 700;
        }
        .rk-cms-topbar-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .rk-cms-topbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4375rem;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          padding: 0.5625rem 0.875rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
        }
        .rk-cms-topbar-btn:hover:not(:disabled) {
          background: var(--bg-secondary);
        }
        .rk-cms-topbar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .rk-cms-topbar-btn-save {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-cms-topbar-btn-save:hover:not(:disabled) {
          opacity: 0.85;
        }
        .rk-cms-topbar-btn-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }

        .rk-cms-topbar-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.375rem;
        }
        .rk-cms-topbar-editing {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-cms-topbar-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .rk-cms-subnav {
          display: grid;
          grid-template-columns: repeat(4, minmax(11rem, 1fr));
          gap: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.5rem;
          padding-bottom: 0.25rem;
          background: var(--bg-secondary);
        }
        .rk-cms-subnav-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          text-align: left;
          font: inherit;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          padding: 0.75rem 0.875rem;
          border-radius: 0.875rem;
          cursor: pointer;
          min-width: 0;
          transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
        }
        .rk-cms-subnav-item svg {
          flex-shrink: 0;
          margin-top: 0.0625rem;
          color: var(--text-muted);
        }
        .rk-cms-subnav-text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .rk-cms-subnav-label {
          font-size: 0.875rem;
          font-weight: 800;
        }
        .rk-cms-subnav-desc {
          font-size: 0.71875rem;
          line-height: 1.35;
          color: var(--text-muted);
        }
        .rk-cms-subnav-item:hover {
          border-color: var(--text-faint);
        }
        .rk-cms-subnav-item-active,
        .rk-cms-subnav-item-active:hover {
          background: var(--text);
          border-color: var(--text);
          color: var(--bg);
        }
        .rk-cms-subnav-item-active svg,
        .rk-cms-subnav-item-active .rk-cms-subnav-desc {
          color: var(--bg);
          opacity: 0.8;
        }
        @media (max-width: 48rem) {
          .rk-cms-topbar {
            flex-direction: column;
          }
          .rk-cms-topbar-actions {
            justify-content: flex-start;
          }
          .rk-cms-subnav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .rk-cms-subnav-desc {
            display: none;
          }
        }

        .rk-cms-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          align-items: stretch;
        }
        .rk-cms-editor {
          min-width: 0;
          flex: 1;
        }
        .rk-cms-resize-handle {
          display: none;
        }
        .rk-cms-preview {
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--bg);
          box-shadow: var(--shadow-elevated);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 32rem;
        }
        .rk-cms-preview-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }
        .rk-cms-preview-label {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-faint);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-cms-preview-reload {
          display: inline-flex;
          align-items: center;
          gap: 0.3125rem;
          border: none;
          background: none;
          color: var(--text-muted);
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.6875rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }
        .rk-cms-preview-reload:hover {
          background: var(--bg);
          color: var(--text);
        }
        /* ---- shared by the four sub-sections (Banners/Collections/Categories/Products),
           which only ever render inside this shell ---- */
        .rk-cms-list + .rk-cms-list { margin-top: 0.75rem; }
        /* Let the buttons drop under the title when the editor column is
           narrow (e.g. preview pane open) instead of squeezing the title. */
        .rk-cms-list .rk-ui-list-row { align-items: center; flex-wrap: wrap; }
        .rk-cms-list .rk-ui-list-main { min-width: 12rem; }
        .rk-cms-reorder {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex-shrink: 0;
        }
        .rk-cms-reorder button {
          width: 1.75rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-muted);
          border-radius: 0.375rem;
          cursor: pointer;
        }
        .rk-cms-reorder button:hover:not(:disabled) {
          color: var(--text);
          border-color: var(--text-muted);
        }
        .rk-cms-reorder button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .rk-cms-thumb {
          width: 3.5rem;
          height: 3.5rem;
          flex-shrink: 0;
          border-radius: 0.5rem;
          overflow: hidden;
          background: var(--placeholder-bg, var(--bg-secondary));
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--text-faint);
          text-align: center;
        }
        .rk-cms-thumb-wide {
          width: 6rem;
          height: 3.5rem;
        }
        .rk-cms-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-cms-row-hidden .rk-cms-thumb,
        .rk-cms-row-hidden .rk-ui-list-main {
          opacity: 0.55;
        }
        .rk-cms-eyebrow {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-red);
        }
        .rk-cms-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-top: 0.375rem;
        }
        .rk-cms-chip {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .rk-cms-edit-panel {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          padding: 1rem;
        }
        .rk-cms-add-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .rk-cms-panel-title {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 0.75rem;
        }
        .rk-cms-form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .rk-cms-form-actions-note {
          margin-right: auto;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-cms-upload-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .rk-cms-upload-row .rk-cms-thumb {
          width: 4.5rem;
          height: 3rem;
        }
        .rk-cms-inline-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-size: 0.875rem;
        }
        .rk-cms-inline-input:focus {
          outline: none;
          border-color: var(--text-muted);
        }
        .rk-cms-add-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.875rem;
          flex-wrap: wrap;
        }
        .rk-cms-add-row .rk-cms-inline-input {
          flex: 1;
          min-width: 12rem;
          width: auto;
        }
        .rk-cms-group {
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          background: var(--bg);
          padding: 1rem;
          margin: 0 0 0.875rem;
        }
        .rk-cms-group-title {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text);
          margin: 0;
        }
        .rk-cms-group-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0.875rem;
        }
        /* Products → Sizes & stock, grouped by colorway */
        .rk-cms-stock-color + .rk-cms-stock-color {
          margin-top: 1rem;
        }
        .rk-cms-stock-color-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }
        .rk-cms-stock-color-name {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text);
          text-transform: capitalize;
        }
        .rk-cms-stock-adder {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-cms-stock-adder input {
          box-sizing: border-box;
          width: 4.5rem;
          padding: 0.45rem 0.6rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--bg);
          color: var(--text);
          font: inherit;
        }
        .rk-cms-stock-ctl {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .rk-cms-stock-ctl button {
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text);
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          line-height: 1;
        }
        .rk-cms-stock-ctl button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .rk-cms-stock-ctl input {
          box-sizing: border-box;
          width: 3.75rem;
          height: 2rem;
          text-align: center;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--bg);
          color: var(--text);
          font: inherit;
          font-weight: 800;
        }
        .rk-cms-stock-ctl-unit {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: 0.125rem;
        }
        /* Products → Select mode (bulk delete) */
        .rk-cms-select-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem 1rem;
          flex-wrap: wrap;
          padding: 0.75rem 1rem;
          margin-bottom: 0.875rem;
          border: 1px solid var(--accent-red);
          border-radius: 0.75rem;
          background: rgba(254, 0, 0, 0.05);
        }
        .rk-cms-select-count {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .rk-cms-select-actions {
          margin-left: auto;
          display: flex;
          gap: 0.5rem;
        }
        .rk-cms-select-on {
          border-color: var(--text);
          box-shadow: 0 0 0 1px var(--text) inset;
        }
        /* While selecting, per-row buttons are hidden — the bar above does the deleting. */
        .rk-cms-selecting .rk-ui-list-side {
          display: none;
        }
        .rk-cms-row-check {
          width: 1.125rem;
          height: 1.125rem;
          flex-shrink: 0;
          accent-color: var(--accent-red);
          cursor: pointer;
        }
        .rk-ui-list-row.rk-cms-row-selected {
          background: rgba(254, 0, 0, 0.06);
          border-left-color: var(--accent-red);
        }
        @media (max-width: 40rem) {
          .rk-cms-select-actions { margin-left: 0; width: 100%; }
          .rk-cms-select-actions .rk-ui-btn { flex: 1; }
        }
        .rk-cms-check {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
          cursor: pointer;
        }
        .rk-cms-check input {
          width: 1rem;
          height: 1rem;
          margin-top: 0.125rem;
          accent-color: var(--text);
        }
        .rk-cms-reset-list {
          margin: 0.75rem 0 0;
          padding: 0.75rem 0.875rem;
          border-radius: 0.625rem;
          background: var(--bg-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text);
        }
        .rk-cms-preview-title {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .rk-cms-preview-page {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-cms-preview-tools {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .rk-cms-preview-note-wide {
          display: none;
        }
        .rk-cms-preview-note {
          padding: 0.375rem 0.875rem;
          font-size: 0.6875rem;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }
        .rk-cms-preview-mode-toggle {
          display: flex;
          gap: 0.125rem;
          flex-shrink: 0;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.125rem;
          background: var(--bg);
        }
        .rk-cms-preview-mode-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3125rem;
          border: none;
          background: none;
          color: var(--text-muted);
          padding: 0.3125rem 0.625rem;
          border-radius: 999px;
          font-size: 0.6875rem;
          font-weight: 700;
          cursor: pointer;
        }
        .rk-cms-preview-mode-btn:hover {
          background: var(--bg);
          color: var(--text);
        }
        .rk-cms-preview-mode-btn-active {
          background: var(--text);
          color: var(--bg);
        }
        .rk-cms-preview-frame-wrap {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #fff;
        }
        .rk-cms-preview-frame-wrap-mobile {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: auto;
          background: var(--bg-secondary);
          padding: 1rem;
        }
        .rk-cms-preview-frame {
          border: none;
          background: #fff;
          transform-origin: top left;
        }
        .rk-cms-preview-frame-mobile {
          border: 8px solid #1a1a1a;
          border-radius: 2rem;
          box-shadow: var(--shadow-elevated);
          flex-shrink: 0;
        }
        .rk-cms-preview-frame-wrap-resizing {
          position: relative;
        }
        .rk-cms-preview-frame-wrap-resizing .rk-cms-preview-frame {
          pointer-events: none;
        }

        @media (min-width: 76rem) {
          .rk-cms-topbar {
            position: sticky;
            top: var(--cms-topbar-top, 84px);
            z-index: 4;
            padding: 0.5rem 0;
          }
          .rk-cms-subnav {
            position: sticky;
            top: var(--cms-subnav-top, 140px);
            z-index: 4;
            padding-top: 0.375rem;
          }
          .rk-cms-layout {
            flex-direction: row;
            gap: 0;
          }
          .rk-cms-editor {
            padding-right: 1.25rem;
          }
          .rk-cms-preview {
            flex: 0 0 auto;
            width: var(--cms-preview-width, 46rem);
            position: sticky;
            top: var(--cms-preview-top, 196px);
            height: calc(100vh - var(--cms-preview-top, 196px) - 2rem);
          }
          .rk-cms-resize-handle {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            width: 1rem;
            cursor: col-resize;
            position: sticky;
            top: var(--cms-preview-top, 196px);
            height: calc(100vh - var(--cms-preview-top, 196px) - 2rem);
            touch-action: none;
          }
          .rk-cms-resize-handle::before {
            content: '';
            width: 3px;
            height: 2.5rem;
            border-radius: 999px;
            background: var(--border);
            transition: background-color var(--duration-fast) var(--ease-out), height var(--duration-fast) var(--ease-out);
          }
          .rk-cms-preview-note-wide {
            display: inline;
          }
          .rk-cms-resize-handle:hover::before,
          .rk-cms-resize-handle-dragging::before {
            background: var(--accent-red);
            height: 3.5rem;
          }
        }
      `}</style>

      <div
        style={
          {
            '--cms-topbar-top': `${stickyTops.topbar}px`,
            '--cms-subnav-top': `${stickyTops.subnav}px`,
            '--cms-preview-top': `${stickyTops.preview}px`,
          } as CSSProperties
        }
      >
        <div className="rk-cms-topbar" ref={topbarRef}>
          <div style={{ minWidth: 0 }}>
            <h2 className="rk-cms-topbar-title">Store Content</h2>
            <div className="rk-cms-topbar-status" aria-live="polite">
              <Pill tone={status.tone}>{status.pill}</Pill>
              {session && <span className="rk-cms-topbar-editing">{session.label}</span>}
            </div>
            <div className="rk-cms-topbar-sub">{status.text}</div>
          </div>
          <div className="rk-cms-topbar-actions">
            <button
              className="rk-cms-topbar-btn"
              onClick={handleUndo}
              disabled={!session?.canUndo}
              title={session?.canUndo ? 'Reverse your most recent change' : 'Nothing to undo yet'}
            >
              <IconUndo size={14} /> Undo
            </button>
            <button
              className="rk-cms-topbar-btn"
              onClick={() => setConfirmReset(true)}
              disabled={!canReset}
              title={canReset ? 'Reverse every change you made here' : 'Nothing to reset yet'}
            >
              <IconReset size={14} /> Reset
            </button>
            <button
              className="rk-cms-topbar-btn rk-cms-topbar-btn-save"
              onClick={handleSave}
              disabled={!session?.isDirty || saving}
              title={session?.isDirty ? 'Save your changes to the store' : 'Nothing unsaved — most changes here save instantly'}
            >
              <IconSave size={14} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className={`rk-cms-topbar-btn ${previewOpen ? 'rk-cms-topbar-btn-active' : ''}`}
              onClick={() => setPreviewOpen((v) => !v)}
              aria-pressed={previewOpen}
              title={previewOpen ? 'Hide the storefront preview' : 'Show what shoppers will see'}
            >
              <IconEye size={14} /> {previewOpen ? 'Hide preview' : 'Show preview'}
            </button>
          </div>
        </div>

        <div className="rk-cms-subnav" ref={subnavRef} role="tablist" aria-label="What do you want to edit?">
          {sections.map((s) => {
            const Icon = s.icon
            const isActive = section === s.key
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={isActive}
                className={`rk-cms-subnav-item ${isActive ? 'rk-cms-subnav-item-active' : ''}`}
                onClick={() => {
                  setSection(s.key)
                  setPreviewPath(s.previewPath)
                }}
                title={s.desc}
              >
                <Icon size={18} />
                <span className="rk-cms-subnav-text">
                  <span className="rk-cms-subnav-label">{s.label}</span>
                  <span className="rk-cms-subnav-desc">{s.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="rk-cms-layout"
          style={previewOpen ? ({ '--cms-preview-width': `${previewWidth}px` } as CSSProperties) : undefined}
        >
        <div className="rk-cms-editor rk-animate-fade-in" key={section}>
          <ActiveComponent />
        </div>

        {previewOpen && (
          <>
            <div
              className={`rk-cms-resize-handle ${isResizing ? 'rk-cms-resize-handle-dragging' : ''}`}
              onPointerDown={startResize}
              onDoubleClick={resetPreviewWidth}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize preview pane"
              title="Drag to resize · double-click to reset"
            />
            <div className="rk-cms-preview">
              <div className="rk-cms-preview-head">
                <div className="rk-cms-preview-title">
                  <span className="rk-cms-preview-label">Storefront preview</span>
                  <span className="rk-cms-preview-page" title={previewPath}>{describePreviewPath(previewPath)}</span>
                </div>
                <div className="rk-cms-preview-tools">
                  <div className="rk-cms-preview-mode-toggle" role="group" aria-label="Preview screen size">
                    <button
                      className={`rk-cms-preview-mode-btn ${previewMode === 'desktop' ? 'rk-cms-preview-mode-btn-active' : ''}`}
                      onClick={() => setPreviewMode('desktop')}
                      aria-pressed={previewMode === 'desktop'}
                      title="See it on a computer screen"
                    >
                      <IconMonitor size={14} /> Computer
                    </button>
                    <button
                      className={`rk-cms-preview-mode-btn ${previewMode === 'mobile' ? 'rk-cms-preview-mode-btn-active' : ''}`}
                      onClick={() => setPreviewMode('mobile')}
                      aria-pressed={previewMode === 'mobile'}
                      title="See it on a phone screen"
                    >
                      <IconSmartphone size={14} /> Phone
                    </button>
                  </div>
                  <button className="rk-cms-preview-reload" onClick={reloadPreview} title="Load the latest version of the page">
                    <IconRefresh size={12} /> Refresh
                  </button>
                </div>
              </div>
              <div className="rk-cms-preview-note">
                What shoppers see. Click Refresh after a change if it doesn’t show yet.
                <span className="rk-cms-preview-note-wide"> Drag the bar on the left edge to make it wider or narrower.</span>
              </div>
              <div
                className={`rk-cms-preview-frame-wrap ${isResizing ? 'rk-cms-preview-frame-wrap-resizing' : ''} ${previewMode === 'mobile' ? 'rk-cms-preview-frame-wrap-mobile' : ''}`}
                ref={previewWrapRef}
              >
                {previewMode === 'mobile' ? (
                  <iframe
                    key={reloadKey}
                    className="rk-cms-preview-frame rk-cms-preview-frame-mobile"
                    src={previewPath}
                    title="Storefront preview (mobile)"
                    style={{ width: PREVIEW_MOBILE_WIDTH, height: PREVIEW_MOBILE_HEIGHT }}
                  />
                ) : (
                  <iframe
                    key={reloadKey}
                    className="rk-cms-preview-frame"
                    src={previewPath}
                    title="Storefront preview"
                    style={{
                      width: PREVIEW_DESKTOP_WIDTH,
                      height: previewFrameHeight,
                      transform: `scale(${previewScale})`,
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {confirmReset && session && (
        <Modal
          title="Reset changes?"
          subtitle={session.isDirty ? 'Your unsaved edits will be thrown away.' : 'Every change listed below will be reversed on the live store.'}
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <button type="button" className="rk-ui-btn" onClick={() => setConfirmReset(false)}>Keep my changes</button>
              <button type="button" className="rk-ui-btn rk-ui-btn-danger" onClick={handleReset}>
                <IconReset size={14} /> Yes, reset
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {session.isDirty
              ? 'The item you have open goes back to how it was when you last saved it.'
              : 'This puts things back the way they were when you opened this section. If you only want to take back your last change, use Undo instead.'}
          </p>
          <div className="rk-cms-reset-list">{session.label}</div>
        </Modal>
      )}
    </div>
  )
}

export default function AdminCMS() {
  return (
    <EditSessionProvider>
      <AdminCMSInner />
    </EditSessionProvider>
  )
}
