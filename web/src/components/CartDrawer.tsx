import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Drawer from './Drawer'
import EmptyState from './EmptyState'
import ImgSlot from './ImgSlot'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import { formatPeso } from '../data/catalog'
import { refundCancellationPolicy } from '../data/policies'
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
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)

  useEffect(() => {
    if (!showPolicyModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showPolicyModal])

  const checkout = async () => {
    if (!isAuthenticated) {
      closeDrawers()
      navigate('/join', { state: { from: '/' } })
      return
    }
    if (!agreedToPolicy) {
      setCheckoutError('Please read and agree to the Refund & Cancellation Policy before checking out.')
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
              .rk-cart-agree {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                font-size: 0.8125rem;
                color: var(--text-muted);
                line-height: 1.4;
              }
              .rk-cart-agree input[type='checkbox'] {
                margin-top: 2px;
                width: 17px;
                height: 17px;
                accent-color: var(--accent-red);
                flex-shrink: 0;
                cursor: pointer;
              }
              .rk-cart-agree button {
                background: none;
                border: none;
                padding: 0;
                color: var(--text);
                font-weight: 700;
                text-decoration: underline;
                cursor: pointer;
                font-size: inherit;
              }
              .rk-policy-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 95;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
                animation: rk-fade-in var(--duration-base) var(--ease-out) both;
              }
              .rk-policy-modal {
                animation: rk-scale-in var(--duration-base) var(--ease-out) both;
                background: var(--bg);
                color: var(--text);
                border-radius: 1rem;
                max-width: 480px;
                width: 100%;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
              }
              .rk-policy-modal-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1.25rem 1.5rem;
                border-bottom: 1px solid var(--border);
              }
              .rk-policy-modal-title {
                font-family: 'Barlow Condensed', sans-serif;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: -0.02em;
                font-size: 1.125rem;
              }
              .rk-policy-modal-close {
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text);
                padding: 0.25rem;
              }
              .rk-policy-modal-body {
                padding: 1.25rem 1.5rem;
                overflow-y: auto;
                overscroll-behavior: contain;
                font-size: 0.875rem;
                line-height: 1.6;
              }
              .rk-policy-modal-body h4 {
                font-size: 0.9375rem;
                margin: 1rem 0 0.375rem;
              }
              .rk-policy-modal-body h4:first-child {
                margin-top: 0;
              }
              .rk-policy-modal-body ul {
                margin: 0;
                padding-left: 1.125rem;
              }
              .rk-policy-modal-body li {
                margin-bottom: 0.375rem;
              }
              .rk-policy-modal-footer {
                padding: 1.25rem 1.5rem;
                border-top: 1px solid var(--border);
              }
              .rk-policy-modal-agree {
                width: 100%;
                background: var(--text);
                color: var(--bg);
                border: none;
                border-radius: 999px;
                padding: 0.875rem;
                font-weight: 900;
                font-size: 0.8125rem;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                cursor: pointer;
              }
            `}</style>
            <div className="rk-cart-subtotal-row">
              <span>Subtotal</span>
              <span>{formatPeso(cartSubtotal)}</span>
            </div>
            <label className="rk-cart-agree">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onClick={(e) => {
                  if (!agreedToPolicy) {
                    e.preventDefault()
                    setShowPolicyModal(true)
                  }
                }}
                onChange={(e) => {
                  if (!e.target.checked) setAgreedToPolicy(false)
                }}
              />
              <span>
                I have read and agree to the{' '}
                <button type="button" onClick={() => setShowPolicyModal(true)}>
                  Refund &amp; Cancellation Policy
                </button>
                . (Open and read the policy to check this box.)
              </span>
            </label>
            <button className="rk-cart-checkout" onClick={checkout} disabled={checkingOut || !agreedToPolicy}>
              {checkingOut ? 'Redirecting to payment…' : 'Checkout'}
            </button>
            {checkoutError ? (
              <p className="rk-cart-error">{checkoutError}</p>
            ) : (
              <p className="rk-cart-note">Pay securely with GCash, GrabPay, or card via PayMongo.</p>
            )}
            {showPolicyModal && (
              <div className="rk-policy-overlay" onClick={() => setShowPolicyModal(false)}>
                <div
                  className="rk-policy-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={refundCancellationPolicy.title}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rk-policy-modal-head">
                    <span className="rk-policy-modal-title">{refundCancellationPolicy.title}</span>
                    <button className="rk-policy-modal-close" onClick={() => setShowPolicyModal(false)} aria-label="Close">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                  <div className="rk-policy-modal-body">
                    {refundCancellationPolicy.sections.map((section) => (
                      <div key={section.heading}>
                        <h4>{section.heading}</h4>
                        <ul>
                          {section.body.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="rk-policy-modal-footer">
                    <button
                      className="rk-policy-modal-agree"
                      onClick={() => {
                        setAgreedToPolicy(true)
                        setCheckoutError(null)
                        setShowPolicyModal(false)
                      }}
                    >
                      I Understand & Agree
                    </button>
                  </div>
                </div>
              </div>
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
