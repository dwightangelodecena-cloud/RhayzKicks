import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Drawer from './Drawer'
import EmptyState from './EmptyState'
import ImgSlot from './ImgSlot'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import { formatPeso } from '../data/catalog'
import { supabase } from '../supabase'

function BagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

export default function CartDrawer() {
  const { isCartOpen, closeDrawers, cart, setQty, removeFromCart, cartSubtotal } = useShop()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const checkout = async () => {
    if (!isAuthenticated) {
      closeDrawers()
      navigate('/join', { state: { from: '/' } })
      return
    }
    setCheckingOut(true)
    setCheckoutError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      setCheckoutError('Your session expired — please sign in again.')
      setCheckingOut(false)
      return
    }
    const { data, error } = await supabase.functions.invoke('create-paymongo-checkout', {
      body: {
        lines: cart.map((l) => ({ itemId: l.product.id, size: l.size ?? '', color: l.colorway ?? '', quantity: l.qty })),
      },
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    if (error) {
      const context = (error as { context?: Response }).context
      const bodyMessage = context ? await context.clone().json().then((b) => b?.error).catch(() => null) : null
      setCheckoutError(bodyMessage ?? error.message)
      setCheckingOut(false)
      return
    }
    if (data?.error) {
      setCheckoutError(data.error)
      setCheckingOut(false)
      return
    }
    window.location.href = data.checkoutUrl
  }

  return (
    <Drawer
      open={isCartOpen}
      title="Your Bag"
      onClose={closeDrawers}
      footer={
        cart.length > 0 ? (
          <div className="rk-cart-footer">
            <style>{`
              .rk-cart-footer {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
              }
              .rk-cart-subtotal-row {
                display: flex;
                justify-content: space-between;
                font-weight: 700;
                font-size: 0.9375rem;
                color: var(--text);
              }
              .rk-cart-checkout {
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
              }
              .rk-cart-note {
                font-size: 0.75rem;
                color: var(--text-muted);
                text-align: center;
              }
              .rk-cart-checkout:disabled {
                opacity: 0.6;
                cursor: not-allowed;
              }
              .rk-cart-error {
                font-size: 0.75rem;
                color: var(--accent-red);
                text-align: center;
              }
            `}</style>
            <div className="rk-cart-subtotal-row">
              <span>Subtotal</span>
              <span>{formatPeso(cartSubtotal)}</span>
            </div>
            <button className="rk-cart-checkout" onClick={checkout} disabled={checkingOut}>
              {checkingOut ? 'Redirecting to payment…' : 'Checkout'}
            </button>
            {checkoutError ? (
              <p className="rk-cart-error">{checkoutError}</p>
            ) : (
              <p className="rk-cart-note">Pay securely with GCash, GrabPay, or card via PayMongo.</p>
            )}
          </div>
        ) : undefined
      }
    >
      <style>{`
        .rk-cart-row {
          display: flex;
          gap: 0.875rem;
          padding: 0.875rem 0;
          border-bottom: 1px solid var(--border);
        }
        .rk-cart-thumb {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          border-radius: 0.625rem;
          overflow: hidden;
        }
        .rk-cart-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .rk-cart-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text);
        }
        .rk-cart-price {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .rk-cart-variant {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .rk-cart-qty-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .rk-cart-qty-btn {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: var(--text);
          cursor: pointer;
          font-weight: 700;
          line-height: 1;
        }
        .rk-cart-qty-val {
          font-size: 0.8125rem;
          font-weight: 700;
          min-width: 1rem;
          text-align: center;
        }
        .rk-cart-remove {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--text-faint);
          cursor: pointer;
          font-size: 0.75rem;
          text-decoration: underline;
        }
      `}</style>
      {cart.length === 0 ? (
        <EmptyState icon={<BagIcon />} title="Your bag is empty" subtitle="Add some kicks to get started." />
      ) : (
        cart.map(({ product, qty, size, colorway }) => {
          const variant = { size, colorway }
          return (
            <div key={`${product.id}-${size ?? ''}-${colorway ?? ''}`} className="rk-cart-row">
              <div className="rk-cart-thumb">
                <ImgSlot label={product.name} size="" src={product.imageUrl} />
              </div>
              <div className="rk-cart-info">
                <span className="rk-cart-name">{product.name}</span>
                {(size || colorway) && (
                  <span className="rk-cart-variant">{[colorway, size].filter(Boolean).join(' · ')}</span>
                )}
                <span className="rk-cart-price">{formatPeso(product.price)}</span>
                <div className="rk-cart-qty-row">
                  <button className="rk-cart-qty-btn" onClick={() => setQty(product.id, qty - 1, variant)} aria-label="Decrease quantity">−</button>
                  <span className="rk-cart-qty-val">{qty}</span>
                  <button className="rk-cart-qty-btn" onClick={() => setQty(product.id, qty + 1, variant)} aria-label="Increase quantity">+</button>
                  <button className="rk-cart-remove" onClick={() => removeFromCart(product.id, variant)}>Remove</button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </Drawer>
  )
}
