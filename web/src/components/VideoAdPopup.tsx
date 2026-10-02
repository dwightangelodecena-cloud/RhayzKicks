import { useEffect, useRef, useState } from 'react'
import { useShop } from '../context/ShopContext'

const DISMISS_KEY = 'rk-video-ad-dismissed'
const MARGIN = 16

export default function VideoAdPopup() {
  const { isCartOpen, isWishlistOpen } = useShop()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [expanded, setExpanded] = useState(false)
  const [muted, setMuted] = useState(true)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    dragging: boolean
    moved: boolean
    startX: number
    startY: number
    startLeft: number
    startBottom: number
  } | null>(null)

  const close = () => {
    setDismissed(true)
    setExpanded(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const reopen = () => {
    setDismissed(false)
    try {
      sessionStorage.removeItem(DISMISS_KEY)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const state = dragState.current
      if (!state || !state.dragging) return
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true

      const width = boxRef.current?.offsetWidth ?? 0
      const height = boxRef.current?.offsetHeight ?? 0
      const maxLeft = window.innerWidth - width - MARGIN
      const maxBottom = window.innerHeight - height - MARGIN

      const nextLeft = Math.min(Math.max(state.startLeft + dx, MARGIN), Math.max(maxLeft, MARGIN))
      const nextBottom = Math.min(Math.max(state.startBottom - dy, MARGIN), Math.max(maxBottom, MARGIN))
      setPos({ left: nextLeft, bottom: nextBottom })
    }

    const handleUp = (e: PointerEvent) => {
      const state = dragState.current
      if (!state || !state.dragging) return
      state.dragging = false
      if (!state.moved) {
        const target = e.target as HTMLElement | null
        if (!target?.closest('.rk-video-ad-mute') && !target?.closest('.rk-video-ad-close')) {
          setExpanded(true)
        }
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.rk-video-ad-close, .rk-video-ad-mute')) return
    const rect = boxRef.current?.getBoundingClientRect()
    const currentLeft = rect?.left ?? MARGIN
    const currentBottom = rect ? window.innerHeight - rect.bottom : MARGIN
    dragState.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: currentLeft,
      startBottom: currentBottom,
    }
    setPos({ left: currentLeft, bottom: currentBottom })
  }

  const sharedStyles = (
    <style>{`
      .rk-video-ad {
        position: fixed;
        right: 1rem;
        bottom: calc(1rem + env(safe-area-inset-bottom));
        z-index: 85;
        width: 220px;
        border-radius: 14px;
        overflow: hidden;
        background: var(--bg);
        border: 1px solid var(--border);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        cursor: grab;
        touch-action: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .rk-video-ad:active {
        cursor: grabbing;
      }
      /* Phones: a smaller thumbnail so it doesn't cover the page. */
      @media (max-width: 30rem) {
        .rk-video-ad {
          width: 132px;
          right: 0.75rem;
          bottom: calc(0.75rem + env(safe-area-inset-bottom));
        }
      }
      .rk-video-ad-hidden {
        opacity: 0;
        transform: translateY(0.5rem);
        pointer-events: none;
      }
      .rk-video-ad-video {
        display: block;
        width: 100%;
        height: 124px;
        object-fit: cover;
        pointer-events: none;
      }
      .rk-video-ad-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 0.55rem;
        background: var(--bg);
      }
      .rk-video-ad-label {
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .rk-video-ad-actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .rk-video-ad-mute,
      .rk-video-ad-close {
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 0.85rem;
        line-height: 1;
        padding: 0.15rem 0.3rem;
        border-radius: 6px;
      }
      .rk-video-ad-mute:hover,
      .rk-video-ad-close:hover {
        background: var(--border);
        color: var(--text);
      }
      .rk-video-ad-reopen {
        position: fixed;
        right: 1rem;
        bottom: calc(1rem + env(safe-area-inset-bottom));
        z-index: 85;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        border: 1px solid var(--border);
        background: var(--bg);
        color: var(--text);
        border-radius: 999px;
        padding: 0.55rem 0.9rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .rk-video-ad-reopen:hover {
        background: var(--border);
      }
      .rk-video-ad-overlay {
        position: fixed;
        inset: 0;
        z-index: 95;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        padding: 1.5rem;
      }
      .rk-video-ad-expanded {
        position: relative;
        width: min(680px, 92vw);
        border-radius: 16px;
        overflow: hidden;
        background: var(--bg);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      }
      .rk-video-ad-expanded-video {
        display: block;
        width: 100%;
        max-height: 80vh;
        object-fit: contain;
        background: #000;
      }
      .rk-video-ad-expanded-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0.9rem;
      }
      .rk-video-ad-expanded-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .rk-video-ad-expanded-btn {
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.35rem 0.7rem;
        border-radius: 8px;
      }
      .rk-video-ad-expanded-btn:hover {
        background: var(--border);
      }
    `}</style>
  )

  if (dismissed) {
    return (
      <>
        {sharedStyles}
        <button type="button" className="rk-video-ad-reopen" onClick={reopen}>
          ▶ Ad
        </button>
      </>
    )
  }

  if (expanded) {
    return (
      <>
        {sharedStyles}
        <div className="rk-video-ad-overlay" onClick={() => setExpanded(false)}>
          <div className="rk-video-ad-expanded" onClick={(e) => e.stopPropagation()}>
            <video
              className="rk-video-ad-expanded-video"
              src="/videos/shoe-ad.mp4"
              autoPlay
              loop
              muted={muted}
              controls
              playsInline
            />
            <div className="rk-video-ad-expanded-bar">
              <span className="rk-video-ad-label">Ad</span>
              <div className="rk-video-ad-expanded-actions">
                <button type="button" className="rk-video-ad-expanded-btn" onClick={() => setExpanded(false)}>
                  Minimize
                </button>
                <button type="button" className="rk-video-ad-expanded-btn" onClick={close}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const hidden = isCartOpen || isWishlistOpen

  return (
    <div
      ref={boxRef}
      className={`rk-video-ad ${hidden ? 'rk-video-ad-hidden' : ''}`}
      style={pos ? { left: pos.left, bottom: pos.bottom, right: 'auto' } : undefined}
      onPointerDown={startDrag}
    >
      {sharedStyles}
      <video
        className="rk-video-ad-video"
        src="/videos/shoe-ad.mp4"
        autoPlay
        loop
        muted={muted}
        playsInline
      />
      <div className="rk-video-ad-bar">
        <span className="rk-video-ad-label">Ad</span>
        <div className="rk-video-ad-actions">
          <button
            type="button"
            className="rk-video-ad-mute"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="rk-video-ad-close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={close}
            aria-label="Close advertisement"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
