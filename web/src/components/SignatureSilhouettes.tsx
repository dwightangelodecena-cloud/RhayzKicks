import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImgSlot from './ImgSlot'
import { formatPeso } from '../data/catalog'
import { getActiveProducts, type Product } from '../lib/storeData'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function SignatureSilhouettes() {
  const [products, setProducts] = useState<Product[]>([])
  const [activeFilter, setActiveFilter] = useState('All')
  const { addToCart, toggleWishlist, isWishlisted } = useShop()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getActiveProducts().then(setProducts).catch(() => setProducts([]))
  }, [])

  const requireAuth = () => navigate('/join', { state: { from: '/' } })

  const filterChips = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const visible = (activeFilter === 'All' ? products : products.filter((p) => p.category === activeFilter)).slice(0, 8)

  if (products.length === 0) return null

  return (
    <section className="rk-sil-section">
      <style>{`
        .rk-sil-section {
          padding: 3rem 1rem;
          background: var(--bg-secondary);
        }
        .rk-sil-header {
          margin-bottom: 2rem;
        }
        .rk-sil-eyebrow {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.26em;
          color: var(--text-faint);
          margin: 0 0 0.5rem;
        }
        .rk-sil-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text);
          font-size: 1.875rem;
          margin: 0 0 1.5rem;
        }
        .rk-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .rk-chip {
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--chip-border);
        }
        .rk-chip:hover {
          border-color: var(--text);
        }
        .rk-chip-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
          transform: scale(1.05);
        }
        .rk-chip-active:hover {
          border-color: var(--text);
        }
        .rk-product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .rk-product-card {
          background: var(--bg);
          border-radius: var(--radius-card);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .rk-product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .rk-product-media {
          position: relative;
          padding-bottom: 75%;
          background: var(--placeholder-bg);
          cursor: pointer;
        }
        .rk-product-fav {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--bg);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text);
          box-shadow: var(--shadow-elevated);
        }
        .rk-product-fav-active {
          color: var(--accent-red);
        }
        .rk-product-media .img-slot,
        .rk-product-media .img-slot-photo {
          position: absolute;
          inset: 0;
        }
        .rk-product-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 1;
          padding: 2px 10px;
          background: var(--text);
          color: var(--bg);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 999px;
        }
        .rk-quick-add-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .rk-product-card:hover .rk-quick-add-bar {
          opacity: 1;
          transform: translateY(0);
        }
        .rk-quick-add-btn {
          width: 100%;
          padding: 0.5rem;
          background: #111111;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          border-radius: 999px;
          cursor: pointer;
        }
        .rk-quick-add-btn:hover {
          background: #333333;
        }
        .rk-product-info {
          padding: 1rem;
        }
        .rk-product-name {
          display: block;
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text);
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          padding: 0;
        }
        .rk-product-price {
          display: block;
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-top: 2px;
        }
        .rk-view-all {
          display: flex;
          justify-content: center;
          margin-top: 2.5rem;
        }
        .rk-view-all-btn {
          padding: 0.875rem 2.5rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          background: transparent;
          border: 1px solid var(--chip-border);
          color: var(--text);
          cursor: pointer;
        }
        .rk-view-all-btn:hover {
          border-color: var(--text);
        }
        @media (min-width: 640px) {
          .rk-product-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 768px) {
          .rk-sil-section {
            padding: 3rem 2rem;
          }
          .rk-sil-heading {
            font-size: 3rem;
          }
        }
        @media (min-width: 1024px) {
          .rk-product-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
      <div className="rk-sil-header">
        <p className="rk-sil-eyebrow">Spotlight</p>
        <h2 className="rk-sil-heading">Signature Silhouettes</h2>
        <div className="rk-chips">
          {filterChips.map((chip) => (
            <button
              key={chip}
              className={`rk-chip ${activeFilter === chip ? 'rk-chip-active' : ''}`}
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="rk-product-grid">
        {visible.map((product) => {
          const wishlisted = isWishlisted(product.id)
          return (
            <div key={product.id} className="rk-product-card">
              <div className="rk-product-media" onClick={() => navigate(`/product/${product.id}`)}>
                {product.isNew && <span className="rk-product-badge">New</span>}
                <button
                  className={`rk-product-fav ${wishlisted ? 'rk-product-fav-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isAuthenticated) return requireAuth()
                    toggleWishlist(product)
                  }}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <HeartIcon filled={wishlisted} />
                </button>
                <ImgSlot label={product.name} size="400 × 300 px" src={product.imageUrl} />
                <div className="rk-quick-add-bar">
                  <button
                    className="rk-quick-add-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isAuthenticated) return requireAuth()
                      addToCart(product)
                    }}
                  >
                    + Quick Add
                  </button>
                </div>
              </div>
              <div className="rk-product-info">
                <button className="rk-product-name" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
                <span className="rk-product-price">{formatPeso(product.price)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rk-view-all">
        <button className="rk-view-all-btn" onClick={() => navigate('/category/new-releases')}>View All Products</button>
      </div>
    </section>
  )
}
