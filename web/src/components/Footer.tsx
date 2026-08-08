import { useState } from 'react'
import Logo from './Logo'

const footerColumns = [
  {
    title: 'Resources',
    links: ['Become a Member', 'Shoe Size Guide', 'Student Discounts', 'Site Feedback'],
  },
  {
    title: 'Help',
    links: ['Order Status', 'Delivery Info', 'Returns & Exchanges', 'Order History', 'Contact Us'],
  },
  {
    title: 'Company',
    links: ['About Rhayz Kicks', 'News & Press', 'Careers', 'Investors', 'Sustainability'],
  },
]

const legalLinks = ['Terms of Sale', 'Terms of Use', 'Privacy Policy', 'Cookie Settings']

export default function Footer() {
  const [openColumn, setOpenColumn] = useState<string | null>(null)

  return (
    <footer className="rk-footer">
      <style>{`
        .rk-footer {
          background: var(--dark-surface);
          color: #ffffff;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .rk-footer-inner {
          padding: 3rem 1.5rem;
        }
        .rk-footer-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .rk-footer-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          font-size: 1.5rem;
          color: #ffffff;
          line-height: 1;
        }
        .rk-footer-dot {
          color: var(--accent-red);
        }
        .rk-footer-tagline {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin: 4px 0 0;
        }
        .rk-footer-columns {
          display: none;
        }
        .rk-footer-col-title {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.26em;
          color: rgba(255, 255, 255, 0.3);
          margin: 0 0 1.25rem;
        }
        .rk-footer-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .rk-footer-links a,
        .rk-footer-accordion-links a {
          color: rgba(255, 255, 255, 0.65);
          text-decoration: none;
          font-size: 0.875rem;
        }
        .rk-footer-links a:hover,
        .rk-footer-accordion-links a:hover {
          color: #ffffff;
        }
        .rk-footer-accordion {
          margin-bottom: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .rk-footer-accordion-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .rk-footer-accordion-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
        }
        .rk-footer-accordion-btn:hover {
          color: #ffffff;
        }
        .rk-footer-chevron-open {
          transform: rotate(90deg);
        }
        .rk-footer-accordion-btn svg {
          transition: transform 0.2s ease;
        }
        .rk-footer-accordion-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .rk-footer-accordion-links-open {
          max-height: 300px;
          padding-bottom: 1rem;
        }
        .rk-footer-accordion-links li {
          padding: 0.4rem 0;
        }
        .rk-footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .rk-footer-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
        }
        .rk-footer-location {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .rk-footer-legal {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .rk-footer-legal a {
          color: rgba(255, 255, 255, 0.35);
          text-decoration: none;
          font-size: 11px;
        }
        .rk-footer-legal a:hover {
          color: #ffffff;
        }
        @media (min-width: 768px) {
          .rk-footer-inner {
            padding: 3rem 3rem;
          }
          .rk-footer-columns {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2.5rem;
            margin-bottom: 3rem;
          }
          .rk-footer-accordion {
            display: none;
          }
          .rk-footer-bottom {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
      `}</style>
      <div className="rk-footer-inner">
        <div className="rk-footer-brand">
          <Logo size={94} ring ringColor="rgba(255,255,255,0.2)" />
          <div>
            <div className="rk-footer-wordmark">RHAYZ<span className="rk-footer-dot">.</span></div>
            <p className="rk-footer-tagline">Footwear &amp; Apparel — Philippines</p>
          </div>
        </div>

        <div className="rk-footer-columns">
          {footerColumns.map((col) => (
            <div key={col.title} className="rk-footer-col">
              <h4 className="rk-footer-col-title">{col.title}</h4>
              <ul className="rk-footer-links">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rk-footer-accordion">
          {footerColumns.map((col) => (
            <div key={col.title} className="rk-footer-accordion-row">
              <button
                className="rk-footer-accordion-btn"
                onClick={() => setOpenColumn((c) => (c === col.title ? null : col.title))}
              >
                {col.title}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={openColumn === col.title ? 'rk-footer-chevron-open' : ''}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <ul className={`rk-footer-accordion-links ${openColumn === col.title ? 'rk-footer-accordion-links-open' : ''}`}>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rk-footer-bottom">
          <div className="rk-footer-meta">
            <span className="rk-footer-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              Philippines
            </span>
            <span>© 2025 Rhayz Kicks, Inc. All Rights Reserved</span>
          </div>
          <div className="rk-footer-legal">
            {legalLinks.map((link) => (
              <a key={link} href="#">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
