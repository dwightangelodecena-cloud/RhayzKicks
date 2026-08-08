import ImgSlot from './ImgSlot'
import Logo from './Logo'

export default function PromoBanner() {
  return (
    <section className="rk-promo">
      <style>{`
        .rk-promo {
          position: relative;
          margin: 0 1rem 3rem;
          border-radius: var(--radius-card);
          overflow: hidden;
          background: var(--dark-surface);
        }
        .rk-promo-bg {
          position: absolute;
          inset: 0;
          opacity: 0.14;
        }
        .rk-promo-content {
          position: relative;
          padding: 5.5rem 2rem;
          text-align: center;
        }
        .rk-promo-logo {
          margin: 0 auto 1.5rem;
          display: block;
        }
        .rk-promo-label {
          color: var(--accent-red);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          margin: 0 0 0.75rem;
        }
        .rk-promo-headline {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          color: #ffffff;
          font-size: clamp(2.5rem, 7vw, 5rem);
          line-height: 1;
          margin: 0 0 1rem;
        }
        .rk-promo-subtext {
          color: rgba(255, 255, 255, 0.55);
          max-width: 28rem;
          margin: 0 auto 2rem;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .rk-promo-ctas {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
        }
        .rk-promo-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem 2.25rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          background: #ffffff;
          color: #111111;
        }
        .rk-promo-btn-primary:hover {
          background: #f0f0f0;
        }
        .rk-promo-btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem 2.25rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #ffffff;
        }
        .rk-promo-btn-outline:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @media (min-width: 640px) {
          .rk-promo-ctas {
            flex-direction: row;
          }
        }
        @media (min-width: 768px) {
          .rk-promo {
            margin: 0 2rem 3rem;
          }
          .rk-promo-content {
            padding: 5.5rem 4rem;
          }
        }
      `}</style>
      <div className="rk-promo-bg">
        <ImgSlot label="Promo Background" size="1200 × 500 px" />
      </div>
      <div className="rk-promo-content">
        <Logo size={124} ring ringColor="var(--accent-red)" ringOffset={2} className="rk-promo-logo" />
        <p className="rk-promo-label">Members Only</p>
        <h2 className="rk-promo-headline">
          LIMITED DROPS
          <br />
          EVERY WEEK
        </h2>
        <p className="rk-promo-subtext">
          Get early access to the most anticipated releases. Join Rhayz Kicks Members and never miss
          a drop again.
        </p>
        <div className="rk-promo-ctas">
          <button className="rk-promo-btn-primary">Join Free</button>
          <button className="rk-promo-btn-outline">Notify Me</button>
        </div>
      </div>
    </section>
  )
}
