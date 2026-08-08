import { useEffect, useState } from 'react'
import PageHero from '../components/PageHero'
import ImgSlot from '../components/ImgSlot'
import { getCollections, type Collection } from '../lib/storeData'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    getCollections().then(setCollections).catch(() => setCollections([]))
  }, [])

  return (
    <div>
      <style>{`
        .rk-collections-body {
          padding: 1.5rem 1.25rem 3rem;
        }
        .rk-collections-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .rk-collection-card {
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .rk-collection-media {
          position: relative;
          aspect-ratio: 3 / 2;
        }
        .rk-collection-media-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1rem;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 60%);
          color: #fff;
          pointer-events: none;
        }
        .rk-collection-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
        }
        .rk-collection-title {
          font-size: 1.5rem;
        }
        .rk-collection-body {
          padding: 1.25rem;
        }
        .rk-collection-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
        }
        .rk-collection-btn {
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: 999px;
          padding: 0.75rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .rk-collections-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <PageHero
        title="Collections"
        subtitle="Explore our curated drops — each collection tells a story of style and purpose."
      />
      <div className="rk-collections-body">
        <div className="rk-collections-grid">
          {collections.map((c) => (
            <div key={c.id} className="rk-collection-card">
              <div className="rk-collection-media">
                <ImgSlot label={c.title} size="800 × 400 px" src={c.imageUrl} />
                <div className="rk-collection-media-overlay">
                  <span className="rk-collection-tag">{c.tag}</span>
                  <span className="rk-collection-title rk-heading">{c.title}</span>
                </div>
              </div>
              <div className="rk-collection-body">
                <p className="rk-collection-desc">{c.description}</p>
                <button className="rk-collection-btn">{c.ctaLabel}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
