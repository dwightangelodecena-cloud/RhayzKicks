import { useNavigate } from 'react-router-dom'
import Logo from './Logo'

const APP_PROMO_URL = '/app'

export default function MemberCTA() {
  const navigate = useNavigate()
  return (
    <section className="rk-member-cta">
      <style>{`
        .rk-member-cta {
          padding: 6rem 1rem;
          text-align: center;
        }
        .rk-member-logo {
          margin: 0 auto 1.5rem;
          display: block;
        }
        .rk-member-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text);
          font-size: 2.25rem;
          line-height: 1;
          margin: 0 0 1rem;
        }
        .rk-member-subtext {
          color: var(--text-muted);
          max-width: 28rem;
          margin: 0 auto 2rem;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .rk-member-ctas {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
        }
        .rk-member-btn-primary,
        .rk-member-btn-outline {
          padding: 0.875rem 2.5rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .rk-member-btn-primary {
          background: var(--text);
          color: var(--bg);
          border: none;
        }
        .rk-member-btn-primary:hover {
          opacity: 0.85;
        }
        .rk-member-btn-outline {
          background: transparent;
          border: 1px solid var(--chip-border);
          color: var(--text);
        }
        .rk-member-btn-outline:hover {
          border-color: var(--text);
        }
        @media (min-width: 640px) {
          .rk-member-ctas {
            flex-direction: row;
          }
        }
        @media (min-width: 768px) {
          .rk-member-cta {
            padding: 6rem 2rem;
          }
          .rk-member-title {
            font-size: 3.75rem;
          }
          .rk-member-subtext {
            font-size: 1rem;
          }
        }
      `}</style>
      <Logo size={124} ring className="rk-member-logo" />
      <h2 className="rk-member-title">Become A Member</h2>
      <p className="rk-member-subtext">
        Enjoy free delivery, member-only products, exclusive discounts, and priority access to
        every new Rhayz Kicks drop.
      </p>
      <div className="rk-member-ctas">
        <button className="rk-member-btn-primary" onClick={() => navigate(APP_PROMO_URL)}>
          Join Free Today
        </button>
        <button className="rk-member-btn-outline">Learn More</button>
      </div>
    </section>
  )
}
