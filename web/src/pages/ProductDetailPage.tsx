import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ImgSlot from '../components/ImgSlot'
import ProductCard from '../components/ProductCard'
import { formatPeso } from '../data/catalog'
import { detailBulletsForCategory, getProductDetail, getRecommendedProducts, type Product, type ProductDetail } from '../lib/storeData'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null | undefined>(undefined)
  const [recommended, setRecommended] = useState<Product[]>([])
  const { addToCart, toggleWishlist, isWishlisted, openCart } = useShop()
  const { isAuthenticated } = useAuth()

  const [size, setSize] = useState<string | null>(null)
  const [colorway, setColorway] = useState<string | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!id) return
    setProduct(undefined)
    setSize(null)
    setColorway(null)
    setActivePhoto(0)
    setAdded(false)
    getProductDetail(id).then((detail) => {
      setProduct(detail)
      if (detail) {
        setColorway(detail.variants[0]?.color ?? null)
        getRecommendedProducts(detail).then(setRecommended).catch(() => setRecommended([]))
      }
    }).catch(() => setProduct(null))
  }, [id])

  if (product === undefined) return null
  if (product === null) return <Navigate to="/" replace />

  const variantsForColorway = colorway ? product.variants.filter((v) => v.color === colorway) : product.variants
  const sizes = Array.from(new Set(variantsForColorway.map((v) => v.size)))
  const colorways = Array.from(new Set(product.variants.map((v) => v.color)))
  const selectedVariant = product.variants.find((v) => v.size === size && v.color === colorway)
  const wishlisted = isWishlisted(product.id)
  const detailBullets = detailBulletsForCategory(product.category)

  const photos = (colorway && product.galleryByColor[colorway]) || (product.imageUrl ? [product.imageUrl] : [])
  const activeImage = photos[activePhoto] ?? photos[0] ?? null

  const selectColorway = (c: string) => {
    setColorway(c)
    setSize(null)
    setActivePhoto(0)
  }
  const prevPhoto = () => setActivePhoto((i) => (i - 1 + photos.length) % photos.length)
  const nextPhoto = () => setActivePhoto((i) => (i + 1) % photos.length)

  const requireAuth = () => navigate('/join', { state: { from: `/product/${product.id}` } })

  const addToBag = () => {
    if (!size) return
    if (!isAuthenticated) return requireAuth()
    const { variants: _variants, ...baseProduct } = product
    addToCart(baseProduct, { size, colorway: colorway ?? undefined })
    setAdded(true)
  }

  return (
    <div className="rk-pdp">
      <style>{`
        .rk-pdp {
          padding: 1.25rem;
          max-width: 72rem;
          margin: 0 auto;
        }
        .rk-pdp-back {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          padding: 0;
        }
        .rk-pdp-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .rk-pdp-gallery {
          display: flex;
          flex-direction: column-reverse;
          gap: 0.75rem;
        }
        .rk-pdp-thumbs {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          overflow-x: auto;
        }
        .rk-pdp-thumb {
          flex: 0 0 56px;
          width: 56px;
          height: 56px;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          background: var(--bg-secondary);
          padding: 0;
        }
        .rk-pdp-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-pdp-thumb-active {
          border-color: var(--text);
        }
        .rk-pdp-media {
          position: relative;
          aspect-ratio: 4 / 3;
          background: var(--bg-secondary);
          border-radius: var(--radius-card);
          overflow: hidden;
          flex: 1;
          min-width: 0;
        }
        @media (min-width: 768px) {
          .rk-pdp-gallery {
            flex-direction: row;
          }
          .rk-pdp-thumbs {
            flex-direction: column;
            width: 64px;
            max-height: 30rem;
            overflow-y: auto;
            overflow-x: visible;
          }
          .rk-pdp-thumb {
            flex: 0 0 64px;
            width: 64px;
            height: 64px;
          }
        }
        .rk-pdp-nav-arrow {
          position: absolute;
          bottom: 0.75rem;
          z-index: 1;
          width: 34px;
          height: 34px;
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
        .rk-pdp-nav-prev {
          right: 3rem;
        }
        .rk-pdp-nav-next {
          right: 0.75rem;
        }
        .rk-pdp-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 1;
          background: var(--text);
          color: var(--bg);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.3rem 0.625rem;
        }
        .rk-pdp-fav {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 1;
          width: 40px;
          height: 40px;
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
        .rk-pdp-fav-active {
          color: var(--accent-red);
        }
        .rk-pdp-name {
          font-size: 2rem;
          margin: 0;
        }
        .rk-pdp-price {
          font-size: 1.125rem;
          color: var(--text-muted);
          margin: 0.375rem 0 1.5rem;
        }
        .rk-pdp-section-label {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-faint);
          margin-bottom: 0.75rem;
        }
        .rk-pdp-colorways {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .rk-pdp-colorway-swatch {
          width: 56px;
          height: 56px;
          border-radius: 0.625rem;
          overflow: hidden;
          border: 2px solid var(--chip-border);
          cursor: pointer;
          background: var(--bg-secondary);
          padding: 0;
        }
        .rk-pdp-colorway-swatch img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rk-pdp-colorway-swatch-active {
          border-color: var(--text);
        }
        .rk-pdp-sizes {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .rk-pdp-size {
          padding: 0.75rem 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid var(--chip-border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
        }
        .rk-pdp-size-active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .rk-pdp-size-oos {
          color: var(--text-faint);
          text-decoration: line-through;
          cursor: not-allowed;
        }
        .rk-pdp-size-oos:hover {
          background: var(--bg);
        }
        .rk-pdp-size-hint {
          font-size: 0.75rem;
          color: var(--accent-red);
          margin: 0.25rem 0 1.25rem;
        }
        .rk-pdp-add {
          width: 100%;
          background: var(--text);
          color: var(--bg);
          border: none;
          border-radius: 999px;
          padding: 1rem;
          font-weight: 900;
          font-size: 0.875rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 1.5rem;
        }
        .rk-pdp-add:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rk-pdp-added {
          margin-top: 0.75rem;
          text-align: center;
          font-size: 0.8125rem;
          color: #1a9c4a;
        }
        .rk-pdp-view-bag {
          display: block;
          text-align: center;
          margin-top: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
        }
        .rk-pdp-details {
          margin-top: 3.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .rk-pdp-details-title {
          font-size: 1.5rem;
          margin: 0 0 0.5rem;
        }
        .rk-pdp-details-desc {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--text-muted);
          margin: 0;
        }
        .rk-pdp-details-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .rk-pdp-details-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          font-size: 0.875rem;
          color: var(--text);
        }
        .rk-pdp-details-list svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
          color: var(--accent-red);
        }
        .rk-pdp-recs {
          margin-top: 3.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid var(--border);
        }
        .rk-pdp-recs-title {
          font-size: 1.5rem;
          margin: 0 0 1.5rem;
        }
        .rk-pdp-recs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem 1rem;
        }
        @media (min-width: 768px) {
          .rk-pdp {
            padding: 2rem 3rem;
          }
          .rk-pdp-layout {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
          }
          .rk-pdp-details {
            grid-template-columns: 1.1fr 1fr;
            gap: 3rem;
          }
          .rk-pdp-recs-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>

      <button type="button" onClick={() => navigate(-1)} className="rk-pdp-back">
        ← Back
      </button>

      <div className="rk-pdp-layout">
        <div className="rk-pdp-gallery">
          {photos.length > 1 && (
            <div className="rk-pdp-thumbs">
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  className={`rk-pdp-thumb ${activePhoto === i ? 'rk-pdp-thumb-active' : ''}`}
                  onClick={() => setActivePhoto(i)}
                  aria-label={`Photo ${i + 1} of ${photos.length}`}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="rk-pdp-media">
            {product.isNew && <span className="rk-pdp-badge">New</span>}
            <button
              className={`rk-pdp-fav ${wishlisted ? 'rk-pdp-fav-active' : ''}`}
              onClick={() => (isAuthenticated ? toggleWishlist(product) : requireAuth())}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <HeartIcon filled={wishlisted} />
            </button>
            <ImgSlot label={product.name} size="1200 × 900 px" src={activeImage} />
            {photos.length > 1 && (
              <>
                <button className="rk-pdp-nav-arrow rk-pdp-nav-prev" onClick={prevPhoto} aria-label="Previous photo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button className="rk-pdp-nav-arrow rk-pdp-nav-next" onClick={nextPhoto} aria-label="Next photo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <h1 className="rk-pdp-name rk-heading">{product.name}</h1>
          <p className="rk-pdp-price">{formatPeso(product.price)}</p>

          {colorways.length > 0 && (
            <>
              <div className="rk-pdp-section-label">Colorway — {colorway}</div>
              <div className="rk-pdp-colorways">
                {colorways.map((c) => {
                  const swatchImg = product.swatchByColor[c] ?? product.galleryByColor[c]?.[0] ?? product.imageUrl
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`rk-pdp-colorway-swatch ${colorway === c ? 'rk-pdp-colorway-swatch-active' : ''}`}
                      onClick={() => selectColorway(c)}
                      aria-label={c}
                      title={c}
                    >
                      {swatchImg ? <img src={swatchImg} alt={c} /> : null}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {sizes.length === 0 ? (
            <p className="rk-pdp-size-hint">This product isn't available for purchase yet.</p>
          ) : (
            <>
              <div className="rk-pdp-section-label">Size {size ? `— ${size}` : ''}</div>
              <div className="rk-pdp-sizes">
                {sizes.map((s) => {
                  const outOfStock = (variantsForColorway.find((v) => v.size === s)?.quantityOnHand ?? 0) === 0
                  return (
                    <button
                      key={s}
                      className={`rk-pdp-size ${size === s ? 'rk-pdp-size-active' : ''} ${outOfStock ? 'rk-pdp-size-oos' : ''}`}
                      onClick={() => setSize(s)}
                      disabled={outOfStock}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {!size && <p className="rk-pdp-size-hint">Select a size to add this to your bag.</p>}
              {size && selectedVariant?.quantityOnHand === 0 && <p className="rk-pdp-size-hint">Out of stock in this size/colorway.</p>}
            </>
          )}

          <button className="rk-pdp-add" disabled={!size || selectedVariant?.quantityOnHand === 0} onClick={addToBag}>
            Add to Bag
          </button>
          {added && (
            <>
              <p className="rk-pdp-added">Added to your bag.</p>
              <button className="rk-pdp-view-bag" onClick={openCart}>View Bag</button>
            </>
          )}
        </div>
      </div>

      <div className="rk-pdp-details">
        <div>
          <h2 className="rk-pdp-details-title rk-heading">Product Details</h2>
          <p className="rk-pdp-details-desc">
            {product.description ?? 'Crafted with quality materials and built for everyday performance.'}
          </p>
        </div>
        <ul className="rk-pdp-details-list">
          {detailBullets.map((bullet) => (
            <li key={bullet}>
              <CheckIcon />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {recommended.length > 0 && (
        <div className="rk-pdp-recs">
          <h2 className="rk-pdp-recs-title rk-heading">You Might Also Like</h2>
          <div className="rk-pdp-recs-grid">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
