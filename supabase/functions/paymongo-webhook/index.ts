// RHAYZKICKS — paymongo-webhook Edge Function
//
// PayMongo calls this directly (no user JWT — this is the public webhook
// URL you register in the PayMongo dashboard). Trust comes from verifying
// the Paymongo-Signature header against PAYMONGO_WEBHOOK_SECRET instead.
//
// IMPORTANT: PayMongo's exact webhook payload shape (nesting of `metadata`,
// where the payment method type lives) was written from memory, not
// verified against a live payload — Paymongo's Developer Dashboard has a
// "Webhooks" test-event log that shows the real payload once this is
// deployed and a test payment is made. If online_orders never leave
// 'pending' after a real payment, check that log and adjust the extractors
// below (findMetadataOrderId / findPaymentMethod) to match the actual path.
//
// Deploy: supabase functions deploy paymongo-webhook --no-verify-jwt
// (--no-verify-jwt is required — PayMongo's request has no Supabase JWT)
// Secrets needed: PAYMONGO_WEBHOOK_SECRET (from the webhook's page in the
// PayMongo dashboard, not the same as PAYMONGO_SECRET_KEY).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifySignature(header: string | null, rawBody: string, secret: string) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const timestamp = parts.t
  // Test-mode events carry both keys with `li` present but empty (PayMongo
  // only fills in `te` for test signatures) — `??` doesn't fall back on an
  // empty string, only null/undefined, so it was always comparing against
  // "" and failing verification no matter what the secret was. `||` treats
  // the empty string as absent, correctly preferring a real `li` when live
  // and falling back to `te` when testing.
  const expected = parts.li || parts.te
  if (!timestamp || !expected) return false
  const computed = await hmacHex(secret, `${timestamp}.${rawBody}`)
  return computed === expected
}

// Recursively hunt for a metadata.online_order_id anywhere in the payload —
// robust against not knowing the exact nesting depth PayMongo uses for this
// event type (see the file-level comment).
function findMetadataOrderId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if (obj.metadata && typeof obj.metadata === 'object') {
    const id = (obj.metadata as Record<string, unknown>).online_order_id
    if (typeof id === 'string') return id
  }
  for (const key of Object.keys(obj)) {
    const found = findMetadataOrderId(obj[key])
    if (found) return found
  }
  return null
}

function findPaymentMethod(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if (typeof obj.type === 'string' && ['gcash', 'card', 'grab_pay', 'paymaya'].includes(obj.type)) {
    return obj.type
  }
  for (const key of Object.keys(obj)) {
    const found = findPaymentMethod(obj[key])
    if (found) return found
  }
  return null
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const PAYMONGO_WEBHOOK_SECRET = Deno.env.get('PAYMONGO_WEBHOOK_SECRET')

  console.log('paymongo-webhook: received request', { hasSecret: !!PAYMONGO_WEBHOOK_SECRET, hasSignatureHeader: !!req.headers.get('Paymongo-Signature') })

  if (!PAYMONGO_WEBHOOK_SECRET) return json({ error: 'PAYMONGO_WEBHOOK_SECRET is not configured.' }, 500)

  const rawBody = await req.text()
  const signatureHeader = req.headers.get('Paymongo-Signature')
  const valid = await verifySignature(signatureHeader, rawBody, PAYMONGO_WEBHOOK_SECRET)
  console.log('paymongo-webhook: signature check', { valid, signatureHeader })
  if (!valid) return json({ error: 'Invalid signature.' }, 401)

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }

  const eventType = (payload as { data?: { attributes?: { type?: string } } })?.data?.attributes?.type ?? ''
  console.log('paymongo-webhook: event type', eventType)
  if (!eventType.includes('paid')) {
    // Not a payment-success event (e.g. payment.failed) — acknowledge and ignore.
    return json({ ok: true, ignored: eventType })
  }

  const orderId = findMetadataOrderId(payload)
  console.log('paymongo-webhook: resolved order id', orderId, 'raw payload:', rawBody)
  if (!orderId) return json({ error: 'No online_order_id in webhook metadata.' }, 400)

  const paymentReference =
    (payload as { data?: { id?: string } })?.data?.id ?? null
  const paymentMethod = findPaymentMethod(payload)

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await adminClient.rpc('mark_online_order_paid', {
    p_order_id: orderId,
    p_payment_reference: paymentReference,
    p_payment_method: paymentMethod,
  })
  console.log('paymongo-webhook: mark_online_order_paid result', { error: error?.message ?? null })
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true })
})
