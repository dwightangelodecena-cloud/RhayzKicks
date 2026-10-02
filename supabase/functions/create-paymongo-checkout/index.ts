// RHAYZKICKS — create-paymongo-checkout Edge Function
//
// Turns the shopper's (client-side, localStorage) cart into a real order and
// a PayMongo-hosted checkout page. Runs server-side for one reason that
// can't be worked around: the price actually charged must come from the live
// catalog, never from the browser's cached cart — a tampered client could
// otherwise submit any price it likes. So this function takes only
// {itemId, size, color, quantity} per line, resolves each to a real
// item_variants row + current price + current stock itself, and only then
// creates the order and asks PayMongo for a checkout session.
//
// Optional voucherId: must be the caller's own unredeemed voucher and the
// loyalty program must be on. The discount is applied here (never trusted
// from the client) and the voucher is only marked redeemed once the order is
// paid (mark_online_order_paid). If the voucher covers the whole bag, the
// order is marked paid right away and PayMongo is skipped.
//
// Deploy: supabase functions deploy create-paymongo-checkout
// Secrets needed (supabase secrets set ...): PAYMONGO_SECRET_KEY
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Edge Function runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// PayMongo rejects checkout amounts under ₱20. A voucher that would leave
// less than this to pay just makes the order free instead.
const PAYMONGO_MIN_AMOUNT = 20

async function expireCheckoutSession(secretKey: string, sessionId: string) {
  try {
    await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}/expire`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(secretKey + ':')}` },
    })
  } catch {
    // Best effort — the stale order is cancelled either way, so a late
    // webhook for it is a no-op in mark_online_order_paid.
  }
}

interface CartLineInput {
  itemId: string
  size: string
  color: string
  quantity: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')
  const SITE_URL = Deno.env.get('SITE_URL')

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header.' }, 401)
    if (!PAYMONGO_SECRET_KEY) return json({ error: 'PayMongo is not configured yet (PAYMONGO_SECRET_KEY missing).' }, 500)

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not signed in.' }, 401)

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('id, is_active')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()
    if (customerError || !customer || !customer.is_active) {
      return json({ error: 'No active customer account for this login.' }, 403)
    }

    const body = await req.json()
    const lines = (body.lines ?? []) as CartLineInput[]
    const voucherId = typeof body.voucherId === 'string' && body.voucherId ? body.voucherId : null
    if (!Array.isArray(lines) || lines.length === 0) return json({ error: 'Cart is empty.' }, 400)

    const resolvedLines: {
      itemId: string
      variantId: string
      sku: string
      itemName: string
      quantity: number
      unitPrice: number
    }[] = []
    const problems: string[] = []

    for (const line of lines) {
      const quantity = Math.floor(Number(line.quantity))
      if (!line.itemId || !quantity || quantity <= 0) {
        problems.push('Invalid cart line.')
        continue
      }

      const { data: item } = await adminClient
        .from('items')
        .select('id, name, base_price, is_active')
        .eq('id', line.itemId)
        .maybeSingle()
      if (!item || !item.is_active) {
        problems.push(`"${line.itemId}" is no longer available.`)
        continue
      }

      const { data: variant } = await adminClient
        .from('item_variants')
        .select('id, sku, price_override, is_active')
        .eq('item_id', line.itemId)
        .eq('size', line.size ?? '')
        .eq('color', line.color ?? '')
        .maybeSingle()
      if (!variant || !variant.is_active) {
        problems.push(`${item.name} (${line.color ?? ''} ${line.size ?? ''}) is no longer available.`)
        continue
      }

      const { data: inventory } = await adminClient
        .from('inventory')
        .select('quantity_on_hand')
        .eq('sku', variant.sku)
        .maybeSingle()
      const qtyOnHand = inventory?.quantity_on_hand ?? 0
      if (qtyOnHand < quantity) {
        problems.push(`${item.name} (${line.color ?? ''} ${line.size ?? ''}) — only ${qtyOnHand} left in stock.`)
        continue
      }

      resolvedLines.push({
        itemId: item.id,
        variantId: variant.id,
        sku: variant.sku,
        itemName: item.name,
        quantity,
        unitPrice: Number(variant.price_override ?? item.base_price),
      })
    }

    if (problems.length > 0) return json({ error: problems.join(' ') }, 400)
    if (resolvedLines.length === 0) return json({ error: 'Nothing left to check out.' }, 400)

    const subtotal = resolvedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

    let discount = 0
    let voucherCode: string | null = null
    if (voucherId) {
      const { data: settings } = await adminClient.from('loyalty_settings').select('is_enabled').eq('id', true).maybeSingle()
      if (settings && !settings.is_enabled) return json({ error: 'Vouchers are paused right now — the loyalty program is turned off.' }, 400)

      const { data: voucher } = await adminClient
        .from('vouchers')
        .select('id, code, value, redeemed, customer_id')
        .eq('id', voucherId)
        .maybeSingle()
      if (!voucher || voucher.customer_id !== customer.id) return json({ error: 'That voucher is not on your account.' }, 400)
      if (voucher.redeemed) return json({ error: 'That voucher has already been used.' }, 400)

      // Release the voucher from any earlier checkout the customer abandoned.
      const { data: staleOrders } = await adminClient
        .from('online_orders')
        .select('id, payment_reference')
        .eq('voucher_id', voucher.id)
        .eq('status', 'pending')
      for (const stale of staleOrders ?? []) {
        if (stale.payment_reference) await expireCheckoutSession(PAYMONGO_SECRET_KEY, stale.payment_reference)
        await adminClient.from('online_orders').update({ status: 'cancelled' }).eq('id', stale.id).eq('status', 'pending')
      }

      discount = Math.min(Number(voucher.value), subtotal)
      if (subtotal - discount < PAYMONGO_MIN_AMOUNT) discount = subtotal
      voucherCode = voucher.code
    }
    const total = Math.round((subtotal - discount) * 100) / 100

    const { data: order, error: orderError } = await adminClient
      .from('online_orders')
      .insert({ customer_id: customer.id, subtotal, discount, total, voucher_id: voucherId })
      .select('id, order_number')
      .single()
    if (orderError || !order) return json({ error: orderError?.message ?? 'Could not create the order.' }, 500)

    const { error: itemsError } = await adminClient.from('online_order_items').insert(
      resolvedLines.map((l) => ({
        order_id: order.id,
        item_id: l.itemId,
        variant_id: l.variantId,
        sku: l.sku,
        quantity: l.quantity,
        unit_price: l.unitPrice,
      })),
    )
    if (itemsError) {
      await adminClient.from('online_orders').delete().eq('id', order.id)
      return json({ error: itemsError.message }, 500)
    }

    const origin = SITE_URL ?? req.headers.get('Origin') ?? new URL(req.url).origin
    const successUrl = `${origin}/order/success?order_id=${order.id}`
    const cancelUrl = `${origin}/`

    // Voucher covers everything — nothing to charge, so complete it now.
    if (total <= 0) {
      const { error: paidError } = await adminClient.rpc('mark_online_order_paid', {
        p_order_id: order.id,
        p_payment_reference: voucherCode ? `voucher:${voucherCode}` : 'voucher',
        p_payment_method: 'voucher',
      })
      if (paidError) {
        await adminClient.from('online_orders').delete().eq('id', order.id)
        return json({ error: paidError.message }, 500)
      }
      return json({ checkoutUrl: successUrl, orderId: order.id, free: true })
    }

    // PayMongo checkout has no discount field, so with a voucher the charge
    // goes up as one line for the discounted total, items listed in the
    // description.
    const paymongoLineItems =
      discount > 0
        ? [
            {
              currency: 'PHP',
              amount: Math.round(total * 100),
              name: `RhayzKicks order ${order.order_number}`,
              description:
                resolvedLines.map((l) => `${l.quantity}× ${l.itemName}`).join(', ') +
                ` — voucher ${voucherCode} (−₱${discount.toFixed(2)})`,
              quantity: 1,
            },
          ]
        : resolvedLines.map((l) => ({
            currency: 'PHP',
            amount: Math.round(l.unitPrice * 100),
            name: l.itemName,
            quantity: l.quantity,
          }))

    const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: paymongoLineItems,
            payment_method_types: ['gcash', 'card', 'grab_pay'],
            success_url: successUrl,
            cancel_url: cancelUrl,
            description: `RhayzKicks order ${order.order_number}`,
            metadata: { online_order_id: order.id },
          },
        },
      }),
    })

    const paymongoBody = await paymongoRes.json()
    if (!paymongoRes.ok) {
      await adminClient.from('online_orders').delete().eq('id', order.id)
      const message = paymongoBody?.errors?.[0]?.detail ?? 'PayMongo rejected the checkout request.'
      return json({ error: message }, 502)
    }

    const checkoutSessionId = paymongoBody?.data?.id
    const checkoutUrl = paymongoBody?.data?.attributes?.checkout_url
    if (!checkoutUrl) {
      await adminClient.from('online_orders').delete().eq('id', order.id)
      return json({ error: 'PayMongo did not return a checkout URL.' }, 502)
    }

    await adminClient.from('online_orders').update({ payment_reference: checkoutSessionId }).eq('id', order.id)

    return json({ checkoutUrl, orderId: order.id })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500)
  }
})
