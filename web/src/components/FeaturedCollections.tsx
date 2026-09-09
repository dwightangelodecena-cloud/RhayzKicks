import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImgSlot from './ImgSlot'
import { useInView } from '../hooks/useInView'
import { getCollections, type Collection } from '../lib/storeData'

export default function FeaturedCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const navigate = useNavigate()
  const [ref, isInView] = useInView<HTMLElement>()

  useEffect(() => {
    getCollections({ homeOnly: true }).then(setCollections).catch(() => setCollections([]))
  }, [])

  if (collections.length === 0) return null

  return (
    <section ref={ref} className={`rk-fc-section ${isInView ? 'rk-animate-fade-up' : ''}`} style={{ opacity: isInView ? undefined : 0 }}>
      <style>{`
        .rk-fc-section {
          padding: 5rem 1.5rem;
        }
        .rk-fc-heading {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.26em;
          color: var(--text-faint);
          margin: 0 0 2rem;
        }
        .rk-collections-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        .rk-collection-card {
          position: relative;
          min-height: 280px;
          border-radius: var(--radius-card);
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          transition: box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out);
        }
        .rk-collection-card:hover {
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.35);
          transform: translateY(-2px);
        }
        .rk-collection-wide {
          grid-column: span 2;
          min-height: 520px;
        }
        .rk-collection-img {
          position: absolute;
          inset: 0;
          transition: transform var(--duration-slow) var(--ease-out);
        }
        .rk-collection-card:hover .rk-collection-img {
          transform: scale(1.06);
        }
        .rk-collection-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent 60%);
        }
        .rk-collection-overlay {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          padding: 1.5rem;
        }
        .rk-collection-wide .rk-collection-overlay {
          padding: 2rem;
        }
        .rk-collection-tag {
          color: rgba(255, 255, 255, 0.55);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 4px;
        }
        .rk-collection-wide .rk-collection-tag {
          font-size: 12px;
          margin-bottom: 6px;
        }
        .rk-collection-title {
          color: #ffffff;
          font-weight: 900;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.125rem;
          line-height: 1.2;
          margin: 0;
        }
        .rk-collection-wide .rk-collection-title {
          font-size: 1.75rem;
          margin-bottom: 1rem;
        }
        .rk-collection-cta {
          padding: 0.625rem 1.5rem;
          background: #ffffff;
          color: #111111;
          font-size: 0.8125rem;
          font-weight: 700;
          border: none;
          border-radius: 999px;
          cursor: pointer;
        }
        .rk-collection-cta:hover {
          background: #f0f0f0;
        }
        @media (min-width: 768px) {
          .rk-fc-section {
            padding: 6rem 3rem;
          }
          .rk-collections-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
          }
          .rk-collection-card {
            min-height: 320px;
          }
          .rk-collection-wide {
            grid-column: span 1;
            grid-row: span 2;
            min-height: 660px;
          }
          .rk-collection-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
      <h2 className="rk-fc-heading">Featured Collections</h2>
      <div className="rk-collections-grid">
        {collections.map((c) => (
          <div
            key={c.id}
            className={`rk-collection-card ${c.size === 'wide' ? 'rk-collection-wide' : ''}`}
            onClick={() => navigate('/collections')}
          >
            <ImgSlot label={c.title} size="600 × 400 px" className="rk-collection-img" src={c.imageUrl} />
            <div className="rk-collection-gradient" />
            <div className="rk-collection-overlay">
              <p className="rk-collection-tag">{c.tag}</p>
              <h3 className="rk-collection-title">{c.title}</h3>
              {c.ctaLabel && <button className="rk-collection-cta">{c.ctaLabel}</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
