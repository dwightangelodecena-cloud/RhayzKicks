import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ImgSlot from './ImgSlot'
import { getNavCategories, type NavCategory } from '../lib/storeData'

export default function ShopByActivity() {
  const [categories, setCategories] = useState<NavCategory[]>([])
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getNavCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const scrollBy = (amount: number) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  if (categories.length === 0) return null

  return (
    <section className="rk-activity-section">
      <style>{`
        .rk-activity-section {
          padding: 3rem 1rem;
        }
        .rk-activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .rk-activity-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text);
          font-size: 1.5rem;
          margin: 0;
        }
        .rk-activity-nav {
          display: flex;
          gap: 0.5rem;
        }
        .rk-activity-nav button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--chip-border);
          background: var(--bg);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .rk-activity-nav button:hover {
          border-color: var(--text);
          transform: scale(1.08);
        }
        .rk-activity-nav button:active {
          transform: scale(0.95);
        }
        .rk-activity-scroller {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          /* Custom arrow buttons replace the scrollbar — hide the native one. */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .rk-activity-scroller::-webkit-scrollbar {
          display: none;
        }
        .rk-activity-card {
          scroll-snap-align: start;
          flex: 0 0 192px;
          text-decoration: none;
          color: var(--text);
          display: block;
        }
        .rk-activity-img-wrap {
          position: relative;
          height: 240px;
          border-radius: var(--radius-card);
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          transition: box-shadow 0.3s ease;
        }
        .rk-activity-card:hover .rk-activity-img-wrap {
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.35);
        }
        .rk-activity-img-inner {
          position: absolute;
          inset: 0;
          transition: transform 0.4s ease;
        }
        .rk-activity-card:hover .rk-activity-img-inner {
          transform: scale(1.06);
        }
        .rk-activity-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.15) 45%, transparent 70%);
        }
        .rk-activity-label {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 0.9rem;
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
          font-family: 'Barlow Condensed', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .rk-activity-arrow {
          position: absolute;
          bottom: 0.9rem;
          right: 0.9rem;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          color: #111111;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .rk-activity-card:hover .rk-activity-arrow {
          opacity: 1;
          transform: translateX(0);
        }
        @media (min-width: 768px) {
          .rk-activity-section {
            padding: 3rem 2rem;
          }
          .rk-activity-title {
            font-size: 2.25rem;
          }
          .rk-activity-card {
            flex-basis: 224px;
          }
          .rk-activity-img-wrap {
            height: 280px;
          }
        }
      `}</style>
      <div className="rk-activity-header">
        <h2 className="rk-activity-title">Shop By Activity</h2>
        <div className="rk-activity-nav">
          <button onClick={() => scrollBy(-300)} aria-label="Scroll left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={() => scrollBy(300)} aria-label="Scroll right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
      <div className="rk-activity-scroller" ref={scrollerRef}>
        {categories.map((c) => (
          <Link key={c.slug} to={`/category/${c.slug}`} className="rk-activity-card">
            <div className="rk-activity-img-wrap">
              <div className="rk-activity-img-inner">
                <ImgSlot label={c.label} size="400 × 500 px" src={c.imageUrl} />
              </div>
              <div className="rk-activity-gradient" />
              <span className="rk-activity-label">{c.label}</span>
              <span className="rk-activity-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
