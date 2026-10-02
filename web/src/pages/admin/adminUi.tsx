import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Shared admin UI building blocks — the visual language introduced with the
// Inventory tab. Styles live in adminUiStyles (included in adminCardStyles,
// so any tab that renders <style>{adminCardStyles}</style> gets them).

export type Tone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info'

// Clickable summary tile: big number, label, small subtext. Pass onClick +
// active to use it as a filter.
export function StatTile({
  value,
  label,
  sub,
  tone = 'neutral',
  active,
  onClick,
  icon,
}: {
  value: ReactNode
  label: string
  sub?: ReactNode
  tone?: Tone
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
}) {
  const className = `rk-ui-stat rk-ui-stat-${tone} ${active ? 'rk-ui-stat-active' : ''} ${onClick ? 'rk-ui-stat-clickable' : ''}`
  const body = (
    <>
      <span className="rk-ui-stat-top">
        <span className="rk-ui-stat-label">{label}</span>
        {icon && <span className="rk-ui-stat-icon">{icon}</span>}
      </span>
      <span className="rk-ui-stat-value">{value}</span>
      {sub && <span className="rk-ui-stat-sub">{sub}</span>}
    </>
  )
  return onClick ? (
    <button type="button" className={className} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="rk-ui-stats">{children}</div>
}

// Pill-shaped segmented control for filters / sub-tabs.
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode; count?: number }[]
  onChange: (value: T) => void
  label?: string
}) {
  return (
    <div className="rk-ui-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'rk-ui-seg-active' : ''}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
        >
          {o.label}
          {o.count !== undefined && <span className="rk-ui-seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="rk-ui-search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="rk-ui-toolbar">{children}</div>
}

// Status label with a colored dot — color is never the only signal.
export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`rk-ui-pill rk-ui-pill-${tone}`}>{children}</span>
}

// Success / error banners at the top of a card.
export function Notice({ tone, children, onDismiss }: { tone: 'ok' | 'alert' | 'info'; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div className={`rk-ui-notice rk-ui-notice-${tone}`} role={tone === 'alert' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  )
}

// Section header inside a card: title + optional description + right-side actions.
export function SectionHead({ title, desc, icon, actions }: { title: ReactNode; desc?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rk-ui-section-head">
      <div>
        <h2 className="rk-admin-card-title">
          {icon}
          {title}
        </h2>
        {desc && <p className="rk-ui-section-desc">{desc}</p>}
      </div>
      {actions && <div className="rk-ui-section-actions">{actions}</div>}
    </div>
  )
}

// Empty state with an optional call to action.
export function EmptyState({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rk-ui-empty">
      <div className="rk-ui-empty-title">{title}</div>
      {hint && <div className="rk-ui-empty-hint">{hint}</div>}
      {action && <div className="rk-ui-empty-action">{action}</div>}
    </div>
  )
}

// Centered dialog, portalled to <body> so admin panels can't clip it.
// Closes on Esc and backdrop click; locks page scroll while open.
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 38,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="rk-ui-modal-backdrop" onClick={onClose}>
      <style>{adminUiStyles}</style>
      <div className="rk-ui-modal" role="dialog" aria-modal="true" style={{ maxWidth: `${width}rem` }} onClick={(e) => e.stopPropagation()}>
        <div className="rk-ui-modal-head">
          <div>
            <h2 className="rk-ui-modal-title">{title}</h2>
            {subtitle && <p className="rk-ui-modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="rk-ui-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="rk-ui-modal-body">{children}</div>
        {footer && <div className="rk-ui-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export const adminUiStyles = `
  /* Inputs are width: 100% + padding — keep them inside their box. */
  .rk-ui-field input, .rk-ui-field select, .rk-ui-field textarea, .rk-ui-search input { box-sizing: border-box; }

  /* ---- stat tiles ---- */
  .rk-ui-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .rk-ui-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
    text-align: left;
    font: inherit;
    color: var(--text);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-top: 3px solid var(--text);
    border-radius: 0.875rem;
    padding: 0.875rem 1rem;
    min-width: 0;
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  .rk-ui-stat-clickable { cursor: pointer; }
  .rk-ui-stat-clickable:hover { transform: translateY(-1px); border-color: var(--text-muted); }
  .rk-ui-stat-active { box-shadow: 0 0 0 2px var(--text) inset; }
  .rk-ui-stat-ok { border-top-color: #0ca30c; }
  .rk-ui-stat-warn { border-top-color: #f5a400; }
  .rk-ui-stat-alert { border-top-color: var(--accent-red); }
  .rk-ui-stat-info { border-top-color: #3b82f6; }
  .rk-ui-stat-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; width: 100%; }
  .rk-ui-stat-label {
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .rk-ui-stat-icon { color: var(--text-muted); display: flex; }
  .rk-ui-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.875rem;
    line-height: 1.05;
    margin-top: 0.25rem;
  }
  .rk-ui-stat-warn .rk-ui-stat-value { color: #d98f00; }
  .rk-ui-stat-alert .rk-ui-stat-value { color: var(--accent-red); }
  .rk-ui-stat-ok .rk-ui-stat-value { color: #0ca30c; }
  .rk-ui-stat-sub { font-size: 0.75rem; color: var(--text-muted); }

  /* ---- toolbar / search / segmented ---- */
  .rk-ui-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .rk-ui-search { position: relative; flex: 1; min-width: 14rem; }
  .rk-ui-search input {
    width: 100%;
    padding: 0.7rem 1rem 0.7rem 2.5rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.875rem;
  }
  .rk-ui-search input:focus { outline: none; border-color: var(--text-muted); }
  .rk-ui-search svg { position: absolute; top: 50%; left: 0.9rem; transform: translateY(-50%); color: var(--text-faint); }
  .rk-ui-seg {
    display: inline-flex;
    flex-wrap: wrap;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.2rem;
    gap: 0.125rem;
  }
  .rk-ui-seg button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }
  .rk-ui-seg button:hover { color: var(--text); }
  .rk-ui-seg .rk-ui-seg-active { background: var(--text); color: var(--bg); }
  .rk-ui-seg-active:hover { color: var(--bg); }
  .rk-ui-seg-count {
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: var(--border);
    color: var(--text);
  }
  .rk-ui-seg-active .rk-ui-seg-count { background: rgba(127, 127, 127, 0.35); color: inherit; }

  /* ---- pills ---- */
  .rk-ui-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.3rem 0.625rem;
    border-radius: 999px;
    white-space: nowrap;
    background: var(--bg-secondary);
    color: var(--text-muted);
  }
  .rk-ui-pill::before { content: ''; width: 0.4rem; height: 0.4rem; border-radius: 50%; background: currentColor; }
  .rk-ui-pill-ok { background: rgba(12, 163, 12, 0.12); color: #0a8f0a; }
  .rk-ui-pill-warn { background: rgba(245, 164, 0, 0.15); color: #b57800; }
  .rk-ui-pill-alert { background: rgba(254, 0, 0, 0.1); color: var(--accent-red); }
  .rk-ui-pill-info { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
  [data-theme='dark'] .rk-ui-pill-ok { color: #2fd12f; }
  [data-theme='dark'] .rk-ui-pill-warn { color: #f5b400; }
  [data-theme='dark'] .rk-ui-pill-info { color: #7aa7ff; }

  /* ---- buttons ---- */
  .rk-ui-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s ease, filter 0.15s ease, transform 0.1s ease;
  }
  .rk-ui-btn:hover { border-color: var(--text-muted); }
  .rk-ui-btn:active { transform: scale(0.97); }
  .rk-ui-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .rk-ui-btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
  .rk-ui-btn-primary:hover { filter: brightness(1.12); border-color: var(--text); }
  .rk-ui-btn-danger { color: var(--accent-red); border-color: rgba(254, 0, 0, 0.35); }
  .rk-ui-btn-danger:hover { border-color: var(--accent-red); background: rgba(254, 0, 0, 0.06); }
  .rk-ui-btn-ghost { border-color: transparent; background: transparent; color: var(--text-muted); }
  .rk-ui-btn-ghost:hover { color: var(--text); background: var(--bg-secondary); border-color: transparent; }
  .rk-ui-btn-lg { padding: 0.75rem 1.25rem; font-size: 0.8125rem; }

  /* ---- notices ---- */
  .rk-ui-notice {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.625rem 0.875rem;
    border-radius: 0.625rem;
    margin-bottom: 1rem;
    border: 1px solid;
  }
  .rk-ui-notice button { background: none; border: none; color: inherit; font-size: 1.125rem; cursor: pointer; line-height: 1; }
  .rk-ui-notice-ok { background: rgba(12, 163, 12, 0.1); color: #0a8f0a; border-color: rgba(12, 163, 12, 0.3); }
  .rk-ui-notice-alert { background: rgba(254, 0, 0, 0.07); color: var(--accent-red); border-color: rgba(254, 0, 0, 0.3); }
  .rk-ui-notice-info { background: var(--bg-secondary); color: var(--text-muted); border-color: var(--border); }
  [data-theme='dark'] .rk-ui-notice-ok { color: #2fd12f; }

  /* ---- section head ---- */
  .rk-ui-section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
  .rk-ui-section-desc { font-size: 0.8125rem; color: var(--text-muted); margin: 0.3rem 0 0; max-width: 46rem; }
  .rk-ui-section-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }

  /* ---- empty state ---- */
  .rk-ui-empty {
    text-align: center;
    padding: 2rem 1rem;
    border: 1px dashed var(--border);
    border-radius: 0.875rem;
  }
  .rk-ui-empty-title { font-weight: 800; font-size: 0.9375rem; color: var(--text); }
  .rk-ui-empty-hint { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; }
  .rk-ui-empty-action { margin-top: 0.875rem; }

  /* ---- modal ---- */
  .rk-ui-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .rk-ui-modal {
    width: 100%;
    max-height: calc(100vh - 2rem);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 1rem;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  .rk-ui-modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .rk-ui-modal-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.625rem;
    text-transform: uppercase;
    line-height: 1.05;
    margin: 0;
  }
  .rk-ui-modal-sub { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-muted); }
  .rk-ui-modal-close {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rk-ui-modal-body { padding: 1.25rem 1.5rem 1.5rem; overflow-y: auto; }
  .rk-ui-modal-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  /* ---- form fields (use with .rk-ui-form) ---- */
  .rk-ui-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.875rem; }
  .rk-ui-field { display: flex; flex-direction: column; gap: 0.375rem; min-width: 0; }
  .rk-ui-field-full { grid-column: 1 / -1; }
  .rk-ui-field > span:first-child { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
  .rk-ui-field-hint { font-size: 0.6875rem; color: var(--text-faint); }
  .rk-ui-field input,
  .rk-ui-field select,
  .rk-ui-field textarea {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.875rem;
  }
  .rk-ui-field input:focus,
  .rk-ui-field select:focus,
  .rk-ui-field textarea:focus { outline: none; border-color: var(--text-muted); box-shadow: 0 0 0 3px rgba(127, 127, 127, 0.15); }

  /* ---- list rows (card-style rows instead of dense tables) ---- */
  .rk-ui-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 0.875rem; overflow: hidden; }
  .rk-ui-list-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border-left: 3px solid transparent;
  }
  .rk-ui-list-row + .rk-ui-list-row { border-top: 1px solid var(--border); }
  .rk-ui-list-row:hover { background: var(--bg-secondary); }
  .rk-ui-list-row-warn { border-left-color: #f5a400; }
  .rk-ui-list-row-alert { border-left-color: var(--accent-red); }
  .rk-ui-list-row-ok { border-left-color: #0ca30c; }
  .rk-ui-list-main { flex: 1; min-width: 0; }
  .rk-ui-list-title { font-weight: 800; font-size: 0.9375rem; color: var(--text); }
  .rk-ui-list-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem; }
  .rk-ui-list-side { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }
  @media (max-width: 40rem) {
    .rk-ui-list-row { flex-wrap: wrap; }
    .rk-ui-list-side { width: 100%; justify-content: flex-start; }
  }
`
