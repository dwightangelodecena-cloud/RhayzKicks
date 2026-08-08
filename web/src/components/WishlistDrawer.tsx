import { useNavigate } from 'react-router-dom'
import Drawer from './Drawer'
import EmptyState from './EmptyState'
import ImgSlot from './ImgSlot'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import { formatPeso } from '../data/catalog'

function HeartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function WishlistDrawer() {
  const { isWishlistOpen, closeDrawers, wishlist, toggleWishlist, addToCart } = useShop()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const requireAuth = () => {
    closeDrawers()
    navigate('/join', { state: { from: '/' } })
  }

  return (
    <Drawer open={isWishlistOpen} title="Wishlist" onClose={closeDrawers}>
      <style>{`
        .rk-wishlist-row {
          display: flex;
          gap: 0.875rem;
          padding: 0.875rem 0;
          border-bottom: 1px solid var(--border);
        }
        .rk-wishlist-thumb {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          border-radius: 0.625rem;
          overflow: hidden;
        }
        .rk-wishlist-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .rk-wishlist-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text);
        }
        .rk-wishlist-price {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-wishlist-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .rk-wishlist-actions button {
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 999px;
          padding: 0.375rem 0.875rem;
          cursor: pointer;
          border: 1px solid var(--border);
          background: none;
          color: var(--text);
        }
        .rk-wishlist-actions .rk-wl-add {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
      `}</style>
      {wishlist.length === 0 ? (
        <EmptyState icon={<HeartIcon />} title="Nothing saved yet" subtitle="Heart items to save them for later." />
      ) : (
        wishlist.map((product) => (
          <div key={product.id} className="rk-wishlist-row">
            <div className="rk-wishlist-thumb">
              <ImgSlot label={product.name} size="" src={product.imageUrl} />
            </div>
            <div className="rk-wishlist-info">
              <span className="rk-wishlist-name">{product.name}</span>
              <span className="rk-wishlist-price">{formatPeso(product.price)}</span>
              <div className="rk-wishlist-actions">
                <button className="rk-wl-add" onClick={() => (isAuthenticated ? addToCart(product) : requireAuth())}>Add to Bag</button>
                <button onClick={() => (isAuthenticated ? toggleWishlist(product) : requireAuth())}>Remove</button>
              </div>
            </div>
          </div>
        ))
      )}
    </Drawer>
  )
}
