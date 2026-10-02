import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLoyaltySettings } from '../lib/loyaltySettings'

function StarIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// Pops up whenever the signed-in customer's loyalty_points goes up while
// they're on the site — AuthContext keeps the customer row live over
// Realtime, so this fires for both paid online orders and in-store POS
// sales. Decreases (redeeming points for a voucher) are ignored, and the
// first value seen after sign-in is just the baseline.
export default function LoyaltyPointsPopup() {
  const { customer } = useAuth()
  const { pointsPerVoucher } = useLoyaltySettings()
  const baseline = useRef<{ id: string; points: number } | null>(null)
  const [earned, setEarned] = useState<{ points: number; total: number } | null>(null)

  useEffect(() => {
    if (!customer) {
      baseline.current = null
      return
    }
    const prev = baseline.current
    baseline.current = { id: customer.id, points: customer.loyaltyPoints }
    if (!prev || prev.id !== customer.id) return
    const delta = customer.loyaltyPoints - prev.points
    if (delta > 0) {
      // Two awards landing back-to-back stack into one popup.
      setEarned((e) => ({ points: (e?.points ?? 0) + delta, total: customer.loyaltyPoints }))
    }
  }, [customer])

  useEffect(() => {
    if (!earned) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEarned(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [earned])

  if (!earned) return null

  const close = () => setEarned(null)

  return (
    <div className="rk-loyalty-pop-backdrop" onClick={close}>
      <style>{`
        .rk-loyalty-pop-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: rk-loyalty-fade 0.2s ease;
        }
        .rk-loyalty-pop {
          position: relative;
          width: 100%;
          max-width: 22rem;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 2rem 1.5rem 1.5rem;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          animation: rk-loyalty-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rk-loyalty-pop-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: rgba(245, 180, 0, 0.15);
          color: #f5b400;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rk-loyalty-pop-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .rk-loyalty-pop-points {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 2.75rem;
          line-height: 1.1;
          margin: 0.25rem 0;
        }
        .rk-loyalty-pop-note {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 1.25rem;
        }
        .rk-loyalty-pop-actions {
          display: flex;
          gap: 0.5rem;
        }
        .rk-loyalty-pop-btn {
          flex: 1;
          padding: 0.7rem 1rem;
          border-radius: 999px;
          font-weight: 800;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          text-align: center;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          text-decoration: none;
        }
        .rk-loyalty-pop-btn-primary {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        @keyframes rk-loyalty-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rk-loyalty-pop {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div className="rk-loyalty-pop" role="dialog" aria-modal="true" aria-labelledby="rk-loyalty-pop-title" onClick={(e) => e.stopPropagation()}>
        <div className="rk-loyalty-pop-icon"><StarIcon /></div>
        <div className="rk-loyalty-pop-eyebrow" id="rk-loyalty-pop-title">You earned loyalty points!</div>
        <div className="rk-loyalty-pop-points">+{earned.points} pts</div>
        <p className="rk-loyalty-pop-note">
          Thanks for your purchase. You now have <strong>{earned.total}</strong> points
          {earned.total >= pointsPerVoucher ? ' — enough to redeem a voucher!' : ` — ${pointsPerVoucher - earned.total} more to unlock a voucher.`}
        </p>
        <div className="rk-loyalty-pop-actions">
          <button type="button" className="rk-loyalty-pop-btn" onClick={close}>Nice!</button>
          <Link to="/account" className="rk-loyalty-pop-btn rk-loyalty-pop-btn-primary" onClick={close}>View Points</Link>
        </div>
      </div>
    </div>
  )
}
