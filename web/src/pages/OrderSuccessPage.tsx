import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { supabase } from '../supabase'
import { useShop } from '../context/ShopContext'
import { formatPeso } from '../data/catalog'

interface OrderRow {
  id: string
  order_number: string
  status: string
  total: number
}

const POLL_MS = 2500
const MAX_POLLS = 12 // ~30s — the webhook usually lands within a couple seconds of redirect

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function OrderSuccessPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order_id')
  const { clearCart } = useShop()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clearedRef = useRef(false)

  useEffect(() => {
    if (!orderId) {
      setError('Missing order reference.')
      return
    }
    let cancelled = false
    let pollCount = 0

    const poll = async () => {
      const { data, error: fetchError } = await supabase
        .from('online_orders')
        .select('id, order_number, status, total')
        .eq('id', orderId)
        .maybeSingle()
      if (cancelled) return
      if (fetchError || !data) {
        setError(fetchError?.message ?? 'Order not found.')
        return
      }
      setOrder(data as OrderRow)
      if (data.status === 'paid' || data.status === 'fulfilled') {
        if (!clearedRef.current) {
          clearedRef.current = true
          clearCart()
        }
        return
      }
      pollCount += 1
      if (pollCount < MAX_POLLS) setTimeout(poll, POLL_MS)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [orderId, clearCart])

  const confirmed = order?.status === 'paid' || order?.status === 'fulfilled'

  return (
    <div>
      <PageHero eyebrow="Order" title={confirmed ? 'Payment Received' : 'Confirming Payment…'} />
      <div className="rk-order-success-body">
        <style>{`
          .rk-order-success-body {
            padding: 2rem 1.25rem 4rem;
            max-width: 32rem;
            margin: 0 auto;
            text-align: center;
          }
          .rk-order-success-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(12, 163, 12, 0.12);
            color: #0ca30c;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.25rem;
          }
          .rk-order-success-number {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 900;
            font-size: 1.5rem;
            color: var(--text);
          }
          .rk-order-success-total {
            font-size: 0.9375rem;
            color: var(--text-muted);
            margin: 0.5rem 0 1.5rem;
          }
          .rk-order-success-note {
            font-size: 0.875rem;
            color: var(--text-muted);
            line-height: 1.6;
          }
          .rk-order-success-link {
            display: inline-block;
            margin-top: 1.5rem;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.8125rem;
            letter-spacing: 0.04em;
            color: var(--text);
            border-bottom: 2px solid var(--accent-red);
            padding-bottom: 2px;
          }
        `}</style>

        {error ? (
          <p className="rk-order-success-note">{error}</p>
        ) : !order ? (
          <p className="rk-order-success-note">Loading your order…</p>
        ) : confirmed ? (
          <>
            <div className="rk-order-success-icon"><CheckIcon /></div>
            <div className="rk-order-success-number">{order.order_number}</div>
            <p className="rk-order-success-total">{formatPeso(Number(order.total))} paid</p>
            <p className="rk-order-success-note">
              Thanks for your order! We'll have it ready for pickup — bring your order number when you swing by.
            </p>
          </>
        ) : (
          <>
            <div className="rk-order-success-number">{order.order_number}</div>
            <p className="rk-order-success-note">
              Still confirming your payment with PayMongo — this usually takes a few seconds. If this doesn't
              update shortly, check your PayMongo receipt or contact us with your order number.
            </p>
          </>
        )}
        <Link to="/" className="rk-order-success-link">← Back to Shopping</Link>
      </div>
    </div>
  )
}
