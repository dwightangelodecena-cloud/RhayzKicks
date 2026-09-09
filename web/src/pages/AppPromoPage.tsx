import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const perks = ['Faster Checkout', 'Order Tracking', 'Wishlist Sync', 'Exclusive App Drops']

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <line x1="14" y1="14" x2="14" y2="14.01" />
      <line x1="18" y1="14" x2="18" y2="14.01" />
      <line x1="14" y1="18" x2="14" y2="18.01" />
      <line x1="18" y1="18" x2="18" y2="18.01" />
      <line x1="14" y1="21" x2="14" y2="21.01" />
      <line x1="21" y1="18" x2="21" y2="18.01" />
      <line x1="21" y1="21" x2="21" y2="21.01" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.417 2.06-1.25 2.86-.833.8-1.79 1.24-2.87 1.16-.02-1.06.42-2.02 1.25-2.81.85-.82 1.85-1.28 2.87-1.21zM20.7 17.3c-.42.98-.93 1.9-1.55 2.77-.85 1.2-1.55 2.03-2.1 2.5-.85.77-1.76 1.16-2.75 1.18-.7 0-1.55-.2-2.53-.6-.99-.4-1.9-.6-2.73-.6-.86 0-1.79.2-2.79.6-1.0.4-1.8.6-2.4.62-.94.04-1.87-.36-2.78-1.2C.44 20.9-1.5 17.03.14 13.6 1.3 11.2 3.2 9.9 5.9 9.86c.83-.02 1.9.28 3.2.9 1.05.5 1.75.73 2.1.73.28 0 1.07-.27 2.37-.8 1.4-.57 2.58-.8 3.55-.7 1.95.16 3.42.93 4.4 2.32-1.75 1.06-2.62 2.55-2.6 4.46.02 1.9.9 3.3 2.78 4.53-.24.7-.5 1.36-.8 2.0z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.6 2.2c-.35.36-.55.87-.55 1.5v16.6c0 .63.2 1.14.55 1.5l.1.08L13 12.5v-.3L3.7 2.12z" />
      <path d="M16.1 9.6 13 12.35v.3l3.1 2.75.07-.04 3.68-2.1c1.05-.6 1.05-1.58 0-2.18l-3.65-2.08z" />
      <path d="M13 12.65 3.7 21.88c.35.37.93.42 1.58.06l10.85-6.16z" />
      <path d="M13 12.35l3.1-2.75-9.82-5.6c-.65-.37-1.23-.31-1.58.06z" />
    </svg>
  )
}

export default function AppPromoPage() {
  return (
    <div className="rk-app-promo">
      <style>{`
        .rk-app-promo {
          min-height: calc(100vh - 1px);
          background: #000;
          display: flex;
          flex-direction: column;
        }
        .rk-app-promo-panel {
          position: relative;
          padding: 3.5rem 1.5rem 2.75rem;
          text-align: center;
          color: #fff;
          overflow: hidden;
          background: #000;
        }
        .rk-app-promo-panel-bg {
          position: absolute;
          inset: -4%;
          z-index: 1;
          background-image: url('/login.png');
          background-size: cover;
          background-position: center;
          animation: rk-app-promo-kenburns 24s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes rk-app-promo-kenburns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -1.2%); }
        }
        .rk-app-promo-panel-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            radial-gradient(55% 50% at 50% 48%, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 80%),
            radial-gradient(60% 55% at 50% 0%, rgba(254, 0, 0, 0.22), transparent 70%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.2) 45%, rgba(0, 0, 0, 0.55) 100%);
        }
        .rk-app-promo-panel-inner {
          position: relative;
          z-index: 3;
          animation: rk-app-promo-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes rk-app-promo-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rk-app-promo-logo-halo {
          width: 104px;
          height: 104px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.22), transparent 72%);
          box-shadow: 0 0 50px rgba(254, 0, 0, 0.3);
        }
        .rk-app-promo-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          font-size: 2.25rem;
          color: #fff;
          text-shadow: 0 0 32px rgba(254, 0, 0, 0.28);
        }
        .rk-app-promo-wordmark span {
          color: var(--accent-red);
        }
        .rk-app-promo-tagline {
          margin: 1rem auto 0;
          max-width: 25rem;
          color: rgba(255, 255, 255, 0.58);
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        .rk-app-promo-perks {
          margin: 2rem auto 0;
          max-width: 26rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.625rem;
        }
        .rk-app-promo-perk {
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          padding: 0.5rem 0.9375rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(6px);
        }
        .rk-app-promo-card-wrap {
          background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
          border-radius: 1.75rem 1.75rem 0 0;
          padding: 2.5rem 1.5rem 3rem;
          box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
          overflow: hidden;
          animation: rk-app-promo-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.08s;
          text-align: center;
        }
        .rk-app-promo-card-wrap::before {
          content: '';
          position: absolute;
          top: -140px;
          right: -140px;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 0, 0, 0.13), transparent 70%);
          pointer-events: none;
        }
        .rk-app-promo-card-content {
          position: relative;
          z-index: 1;
          max-width: 24rem;
          margin: 0 auto;
        }
        .rk-app-promo-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-red);
          background: rgba(254, 0, 0, 0.08);
          border: 1px solid rgba(254, 0, 0, 0.18);
          padding: 0.4375rem 0.875rem;
          border-radius: 999px;
          margin: 0 0 1.25rem;
        }
        .rk-app-promo-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          font-size: 1.875rem;
          line-height: 1.05;
          color: #111;
          margin: 0 0 0.875rem;
        }
        .rk-app-promo-desc {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #666;
          margin: 0 0 2rem;
        }
        .rk-app-promo-qr {
          width: 128px;
          height: 128px;
          margin: 0 auto 0.75rem;
          border-radius: 1rem;
          border: 2px dashed #d8d8d8;
          background: #fafafa;
          color: #b3b3b3;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rk-app-promo-qr-caption {
          font-size: 0.75rem;
          color: #999;
          margin: 0 0 1.75rem;
        }
        .rk-app-promo-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 1.5rem;
        }
        .rk-app-promo-divider::before,
        .rk-app-promo-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #ececec;
        }
        .rk-app-promo-divider span {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #aaa;
          white-space: nowrap;
        }
        .rk-app-promo-stores {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin: 0 0 2rem;
        }
        .rk-app-promo-store-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.875rem;
          background: #111;
          color: #fff;
          border: none;
          cursor: not-allowed;
          text-align: left;
        }
        .rk-app-promo-store-text {
          flex: 1;
        }
        .rk-app-promo-store-label {
          display: block;
          font-size: 0.625rem;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.2;
        }
        .rk-app-promo-store-name {
          display: block;
          font-size: 0.9375rem;
          font-weight: 700;
          line-height: 1.3;
        }
        .rk-app-promo-soon {
          font-size: 0.625rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #111;
          background: #fff;
          padding: 0.25rem 0.625rem;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .rk-app-promo-footer {
          font-size: 0.8125rem;
          color: #777;
        }
        .rk-app-promo-footer a {
          color: var(--accent-red);
          font-weight: 700;
          text-decoration: none;
        }
        .rk-app-promo-footer a:hover {
          text-decoration: underline;
        }
        .rk-app-promo-back {
          display: block;
          margin-top: 1.25rem;
          font-size: 0.8125rem;
          color: #999;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .rk-app-promo-back:hover {
          color: #111;
        }
        @media (min-width: 1024px) {
          .rk-app-promo {
            flex-direction: row;
            align-items: stretch;
          }
          .rk-app-promo-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3rem;
          }
          .rk-app-promo-card-wrap {
            width: 520px;
            flex: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 3.5rem 3.25rem 3rem;
            border-radius: 0;
            box-shadow: -24px 0 60px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>

      <div className="rk-app-promo-panel">
        <div className="rk-app-promo-panel-bg" />
        <div className="rk-app-promo-panel-overlay" />
        <div className="rk-app-promo-panel-inner">
          <div className="rk-app-promo-logo-halo">
            <Logo size={80} ring ringColor="rgba(255, 255, 255, 0.18)" ringOffset={4} />
          </div>
          <div className="rk-app-promo-wordmark">RHAYZ<span>.</span></div>
          <p className="rk-app-promo-tagline">
            Membership, drops, and your bag — right in your pocket. Get early access the moment the app launches.
          </p>
          <div className="rk-app-promo-perks">
            {perks.map((perk) => (
              <span key={perk} className="rk-app-promo-perk">{perk}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="rk-app-promo-card-wrap">
        <div className="rk-app-promo-card-content">
          <p className="rk-app-promo-eyebrow"><PhoneIcon /> Mobile App</p>
          <h1 className="rk-app-promo-heading">Rhayz Kicks Is Coming To Mobile</h1>
          <p className="rk-app-promo-desc">
            We're putting the finishing touches on the Rhayz Kicks app so you can browse, save favorites, and manage
            your membership on the go. Scan the code or check back soon on the App Store and Google Play.
          </p>
          <div className="rk-app-promo-qr"><QrIcon /></div>
          <p className="rk-app-promo-qr-caption">Scan with your phone camera — QR coming soon</p>
          <div className="rk-app-promo-divider"><span>Or Download Directly</span></div>
          <div className="rk-app-promo-stores">
            <button type="button" className="rk-app-promo-store-btn" disabled>
              <AppleIcon />
              <span className="rk-app-promo-store-text">
                <span className="rk-app-promo-store-label">Download on the</span>
                <span className="rk-app-promo-store-name">App Store</span>
              </span>
              <span className="rk-app-promo-soon">Soon</span>
            </button>
            <button type="button" className="rk-app-promo-store-btn" disabled>
              <PlayIcon />
              <span className="rk-app-promo-store-text">
                <span className="rk-app-promo-store-label">Get it on</span>
                <span className="rk-app-promo-store-name">Google Play</span>
              </span>
              <span className="rk-app-promo-soon">Soon</span>
            </button>
          </div>
          <p className="rk-app-promo-footer">
            Want to join now instead? <Link to="/join">Sign up on the website →</Link>
          </p>
          <Link to="/" className="rk-app-promo-back">← Back to Store</Link>
        </div>
      </div>
    </div>
  )
}
