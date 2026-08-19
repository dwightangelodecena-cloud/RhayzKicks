import { useLocation, useNavigate } from 'react-router-dom'
import ImgSlot from './ImgSlot'
import { formatPeso } from '../data/catalog'
import type { Product } from '../lib/storeData'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'

interface ProductCardProps {
  product: Product
  badgeOverride?: string
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function ProductCard({ product, badgeOverride }: ProductCardProps) {
  const { toggleWishlist, isWishlisted } = useShop()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const badge = badgeOverride ?? (product.isNew ? 'New' : undefined)
  const wishlisted = isWishlisted(product.id)

  const requireAuth = () => {
    navigate('/join', { state: { from: location.pathname } })
  }

  return (
    <div className="rk-product-card">
      <style>{`
        .rk-product-card {
          display: flex;
          flex-direction: column;
        }
        .rk-product-media {
          position: relative;
          aspect-ratio: 4 / 3;
          cursor: pointer;
        }
        .rk-product-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          background: var(--text);
          color: var(--bg);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.25rem 0.5rem;
          z-index: 1;
        }
        .rk-product-fav {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 1;
          width: 32px;
          height: 32px;
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
        .rk-product-quickadd {
          margin-top: 0.75rem;
          width: 100%;
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: 999px;
          padding: 0.75rem;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .rk-product-quickadd:hover {
          transform: scale(1.02);
        }
        .rk-product-name {
          margin-top: 0.875rem;
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
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
      `}</style>
      <div className="rk-product-media" onClick={() => navigate(`/product/${product.id}`)}>
        {badge && <span className="rk-product-badge">{badge}</span>}
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
      </div>
      <button className="rk-product-quickadd" onClick={() => navigate(`/product/${product.id}`)}>Select Size</button>
      <button className="rk-product-name" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
      <span className="rk-product-price">{formatPeso(product.price)}</span>
    </div>
  )
}
