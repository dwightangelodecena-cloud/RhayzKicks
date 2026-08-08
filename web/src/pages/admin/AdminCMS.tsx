import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import AdminBanners from './AdminBanners'
import AdminCollections from './AdminCollections'
import AdminCategories from './AdminCategories'
import AdminProducts from './AdminProducts'
import { EditSessionProvider, useEditSession } from '../../context/EditSessionContext'
import { IconBox, IconEye, IconLayers, IconMegaphone, IconMonitor, IconRefresh, IconReset, IconSave, IconSmartphone, IconTags, IconUndo } from './adminIcons'

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

const sections = [
  { key: 'banners', label: 'Hero & Banners', icon: IconMegaphone, Component: AdminBanners },
  { key: 'collections', label: 'Collections', icon: IconLayers, Component: AdminCollections },
  { key: 'categories', label: 'Categories', icon: IconTags, Component: AdminCategories },
  { key: 'products', label: 'Products', icon: IconBox, Component: AdminProducts },
] as const

type SectionKey = (typeof sections)[number]['key']

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

  const handleSave = async () => {
    if (!session) return
    await session.save()
    reloadPreview()
  }

  const handleUndo = () => {
    session?.undo()
  }

  const handleReset = () => {
    session?.reset()
  }

  return (
    <div>
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
          transition: opacity 0.15s ease, background-color 0.15s ease;
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

        .rk-cms-subnav {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.5rem;
          padding-bottom: 0.25rem;
          background: var(--bg-secondary);
        }
        .rk-cms-subnav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-muted);
          padding: 0.625rem 1.125rem;
          border-radius: 999px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .rk-cms-subnav-item svg {
          flex-shrink: 0;
        }
        .rk-cms-subnav-item:hover {
          border-color: var(--text-faint);
          color: var(--text);
        }
        .rk-cms-subnav-item-active {
          background: var(--text);
          border-color: var(--text);
          color: var(--bg);
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
        .rk-cms-preview-mode-toggle {
          display: flex;
          gap: 0.125rem;
          flex-shrink: 0;
        }
        .rk-cms-preview-mode-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          color: var(--text-muted);
          padding: 0.3125rem;
          border-radius: 0.375rem;
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
            transition: background-color 0.15s ease, height 0.15s ease;
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
          <div>
            <h2 className="rk-cms-topbar-title">Content Management</h2>
            <div className="rk-cms-topbar-sub">
              {session ? (
                <>
                  Editing <strong>{session.label}</strong>
                  {session.isDirty ? ' — unsaved changes' : session.canUndo ? ' — saved automatically, Undo/Reset to revert' : ''}
                </>
              ) : (
                'Everything else on this tab saves instantly — Save/Undo/Reset apply to whatever you have open for editing.'
              )}
            </div>
          </div>
          <div className="rk-cms-topbar-actions">
            <button className="rk-cms-topbar-btn" onClick={handleUndo} disabled={!session?.canUndo} title="Undo last change">
              <IconUndo size={14} /> Undo
            </button>
            <button className="rk-cms-topbar-btn" onClick={handleReset} disabled={!session} title="Reset to last saved values">
              <IconReset size={14} /> Reset
            </button>
            <button className="rk-cms-topbar-btn rk-cms-topbar-btn-save" onClick={handleSave} disabled={!session?.isDirty} title="Save changes">
              <IconSave size={14} /> Save
            </button>
            <button
              className={`rk-cms-topbar-btn ${previewOpen ? 'rk-cms-topbar-btn-active' : ''}`}
              onClick={() => setPreviewOpen((v) => !v)}
              title={previewOpen ? 'Hide live preview' : 'Show live preview'}
            >
              <IconEye size={14} /> Preview
            </button>
          </div>
        </div>

        <div className="rk-cms-subnav" ref={subnavRef}>
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.key}
                className={`rk-cms-subnav-item ${section === s.key ? 'rk-cms-subnav-item-active' : ''}`}
                onClick={() => setSection(s.key)}
              >
                <Icon size={16} /> {s.label}
              </button>
            )
          })}
        </div>

        <div
          className="rk-cms-layout"
          style={previewOpen ? ({ '--cms-preview-width': `${previewWidth}px` } as CSSProperties) : undefined}
        >
        <div className="rk-cms-editor">
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
                <span className="rk-cms-preview-label">Live preview — {previewPath}</span>
                <div className="rk-cms-preview-mode-toggle">
                  <button
                    className={`rk-cms-preview-mode-btn ${previewMode === 'desktop' ? 'rk-cms-preview-mode-btn-active' : ''}`}
                    onClick={() => setPreviewMode('desktop')}
                    title="Preview desktop layout"
                    aria-label="Preview desktop layout"
                  >
                    <IconMonitor size={14} />
                  </button>
                  <button
                    className={`rk-cms-preview-mode-btn ${previewMode === 'mobile' ? 'rk-cms-preview-mode-btn-active' : ''}`}
                    onClick={() => setPreviewMode('mobile')}
                    title="Preview mobile layout"
                    aria-label="Preview mobile layout"
                  >
                    <IconSmartphone size={14} />
                  </button>
                </div>
                <button className="rk-cms-preview-reload" onClick={reloadPreview}>
                  <IconRefresh size={12} /> Reload
                </button>
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
