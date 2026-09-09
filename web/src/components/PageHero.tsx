import type { ReactNode } from 'react'

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  dark?: boolean
}

export default function PageHero({ eyebrow, title, subtitle, dark }: PageHeroProps) {
  return (
    <div className={`rk-page-hero ${dark ? 'rk-page-hero-dark' : ''}`}>
      <style>{`
        .rk-page-hero {
          background: var(--bg-secondary);
          padding: 3rem 1.25rem;
        }
        .rk-page-hero-dark {
          background: var(--dark-surface);
          color: var(--dark-surface-text);
        }
        .rk-page-hero-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-red);
          margin-bottom: 0.5rem;
        }
        .rk-page-hero-title {
          font-size: clamp(2.5rem, 8vw, 4rem);
          margin: 0;
        }
        .rk-page-hero-dark .rk-page-hero-title {
          color: var(--dark-surface-text);
        }
        .rk-page-hero-subtitle {
          margin-top: 0.75rem;
          font-size: 0.9375rem;
          color: var(--text-muted);
          max-width: 40rem;
        }
        .rk-page-hero-dark .rk-page-hero-subtitle {
          color: rgba(255, 255, 255, 0.65);
        }
        @media (min-width: 768px) {
          .rk-page-hero {
            padding: 4rem 3rem;
          }
        }
      `}</style>
      {eyebrow && <div className="rk-page-hero-eyebrow rk-animate-fade-up" style={{ animationDelay: '0ms' }}>{eyebrow}</div>}
      <h1 className="rk-page-hero-title rk-heading rk-animate-fade-up" style={{ animationDelay: '60ms' }}>{title}</h1>
      {subtitle && <p className="rk-page-hero-subtitle rk-animate-fade-up" style={{ animationDelay: '120ms' }}>{subtitle}</p>}
    </div>
  )
}
