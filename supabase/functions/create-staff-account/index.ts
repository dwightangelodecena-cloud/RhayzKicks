// RHAYZKICKS — create-staff-account Edge Function
//
// Lets an admin set a new hire's password directly from the Staff tab,
// instead of requiring the person to self-signup at /staff/signup first.
// This can't be done from client code: creating an arbitrary auth user
// requires the service_role key, which must never reach the browser.
//
// Deploy with the Supabase CLI (see supabase/SCHEMA.md for the full steps):
//   supabase functions deploy create-staff-account
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically in
// the Edge Function runtime — no manual secret setup needed for those.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header.' }, 401)

    // Acts as the calling admin (RLS applies) — only used to verify who's asking.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not signed in.' }, 401)

    const { data: callerStaff } = await callerClient
      .from('staff')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (!callerStaff || callerStaff.role !== 'admin' || !callerStaff.is_active) {
      return json({ error: 'Only an active admin can create staff accounts.' }, 403)
    }

    const body = await req.json()
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')
    const fullName = String(body.full_name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const role = body.role === 'admin' ? 'admin' : 'staff'
    const employeeId = String(body.employee_id ?? '').trim()

    if (!email || !fullName) return json({ error: 'Email and full name are required.' }, 400)
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)

    // Bypasses RLS — only reached after the admin check above.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'Could not create the account.' }, 400)
    }

    const { error: insertError } = await adminClient.from('staff').insert({
      id: created.user.id,
      full_name: fullName,
      email,
      phone,
      role,
      employee_id: employeeId,
    })
    if (insertError) {
      // Don't leave an orphaned auth user with no staff row behind.
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: insertError.message }, 400)
    }

    return json({ id: created.user.id })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500)
  }
})
