import { useEffect, type ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export default function Drawer({ open, title, onClose, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <style>{`
        .rk-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 90;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--duration-base) var(--ease-out);
        }
        .rk-drawer-overlay-open {
          opacity: 1;
          pointer-events: auto;
        }
        .rk-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(450px, 100vw);
          background: var(--bg);
          z-index: 91;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform var(--duration-slow) var(--ease-out);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        }
        .rk-drawer-open {
          transform: translateX(0);
        }
        .rk-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .rk-drawer-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: 1.25rem;
          color: var(--text);
        }
        .rk-drawer-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text);
          padding: 0.5rem;
          border-radius: 999px;
        }
        .rk-drawer-close:hover {
          background: var(--bg-secondary);
        }
        .rk-drawer-body {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 1.5rem;
        }
        .rk-drawer-footer {
          border-top: 1px solid var(--border);
          padding: 1.25rem 1.5rem;
          padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
        }
      `}</style>
      <div
        className={`rk-drawer-overlay ${open ? 'rk-drawer-overlay-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`rk-drawer ${open ? 'rk-drawer-open' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="rk-drawer-head">
          <span className="rk-drawer-title">{title}</span>
          <button className="rk-drawer-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="rk-drawer-body">{children}</div>
        {footer && <div className="rk-drawer-footer">{footer}</div>}
      </div>
    </>
  )
}
