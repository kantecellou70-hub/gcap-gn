import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'

// Reflète les headers demandés (x-application-name, x-client-info, etc.)
function corsHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get('access-control-request-headers')
    ?? 'authorization, x-client-info, apikey, content-type'
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': requested,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface CreateUserPayload {
  email:     string
  nom:       string
  prenom:    string
  poste:     string
  role:      'ADMIN_MINISTERE' | 'DAFF' | 'ORDONNATEUR' | 'CF'
  tenant_id: string
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)

  // ── Preflight CORS ─────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  // ── 1. Vérifier le JWT de l'appelant ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Missing authorization', { status: 401, headers: cors })
  }
  const jwt = authHeader.slice(7)

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt)
  if (callerErr || !callerUser) {
    return new Response('Unauthorized', { status: 401, headers: cors })
  }

  // Vérifier SUPER_ADMIN via service role (bypasse RLS)
  const { data: callerRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUser.id)
    .eq('actif', true)

  const isSuperAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === 'SUPER_ADMIN')
  if (!isSuperAdmin) {
    return new Response('Forbidden — SUPER_ADMIN required', { status: 403, headers: cors })
  }

  // ── 2. Parser le payload ───────────────────────────────────────────────────
  let payload: CreateUserPayload
  try {
    payload = await req.json() as CreateUserPayload
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: cors })
  }

  const { email, nom, prenom, poste, role, tenant_id } = payload
  if (!email || !nom || !prenom || !role || !tenant_id) {
    return new Response('Missing required fields', { status: 400, headers: cors })
  }

  // ── 3. Vérifier que le tenant existe ──────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, nom')
    .eq('id', tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return new Response('Tenant not found', { status: 404, headers: cors })
  }

  // ── 4. Inviter l'utilisateur (Supabase envoie l'email d'invitation) ─────────
  const redirectTo = `${APP_URL}/auth/callback?next=/tableau-de-bord`

  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: { nom, prenom, poste: poste ?? null },
    }
  )

  if (inviteErr || !inviteData?.user) {
    console.error('inviteUserByEmail error:', inviteErr?.message)
    return new Response(`Cannot invite user: ${inviteErr?.message}`, { status: 500, headers: cors })
  }

  const userId     = inviteData.user.id
  // Lien de secours si RESEND est configuré — sinon Supabase a déjà envoyé l'email
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type:    'invite',
    email,
    options: { redirectTo },
  })
  const inviteLink = linkData?.properties?.action_link ?? `${APP_URL}/login`

  // ── 5. Créer le profil utilisateur ────────────────────────────────────────
  const { error: profErr } = await supabaseAdmin.from('user_profiles').insert({
    id:        userId,
    tenant_id,
    nom,
    prenom,
    poste:     poste ?? null,
    actif:     true,
  })

  if (profErr) {
    console.error('user_profiles insert error:', profErr.message)
    return new Response(`Cannot create profile: ${profErr.message}`, { status: 500, headers: cors })
  }

  // ── 6. Attribuer le rôle ──────────────────────────────────────────────────
  const { error: roleErr } = await supabaseAdmin.from('user_roles').insert({
    user_id:   userId,
    tenant_id,
    role,
    actif:     true,
  })

  if (roleErr) {
    console.error('user_roles insert error:', roleErr.message)
    return new Response(`Cannot assign role: ${roleErr.message}`, { status: 500, headers: cors })
  }

  // ── 7. Email de bienvenue (non-bloquant) ───────────────────────────────────
  try {
    await supabaseAdmin.functions.invoke('send-invitation-email', {
      body: {
        to_email:    email,
        prenom,
        nom,
        role_label:  role,
        tenant_nom:  (tenant as { id: string; nom: string }).nom,
        invite_link: inviteLink,
      },
    })
  } catch (emailErr) {
    console.warn('Email sending failed (non-blocking):', emailErr)
  }

  return new Response(JSON.stringify({ success: true, user_id: userId }), {
    status:  201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
