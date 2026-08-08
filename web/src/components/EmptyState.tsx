import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  subtitle: string
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="rk-empty-state">
      <style>{`
        .rk-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 1rem;
          padding: 4rem 1rem;
          color: var(--text-muted);
        }
        .rk-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-faint);
        }
        .rk-empty-title {
          font-weight: 700;
          color: var(--text);
          font-size: 0.9375rem;
        }
        .rk-empty-subtitle {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
      `}</style>
      <div className="rk-empty-icon">{icon}</div>
      <div className="rk-empty-title">{title}</div>
      <div className="rk-empty-subtitle">{subtitle}</div>
    </div>
  )
}
