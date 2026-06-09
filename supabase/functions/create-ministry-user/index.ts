import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'

// Headers CORS standard Supabase Edge Functions
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserPayload {
  email:     string
  nom:       string
  prenom:    string
  poste:     string
  role:      'ADMIN_MINISTERE' | 'DAFF' | 'ORDONNATEUR' | 'CF'
  tenant_id: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function err(msg: string, status = 400) {
  return new Response(msg, { status, headers: CORS_HEADERS })
}

Deno.serve(async (req: Request) => {
  // ── Preflight CORS ─────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return err('Method not allowed', 405)
  }

  // ── 1. Vérifier le JWT de l'appelant ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return err('Missing authorization', 401)
  }
  const jwt = authHeader.slice(7)

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt)
  if (callerErr || !callerUser) {
    return err('Unauthorized', 401)
  }

  // Vérifier SUPER_ADMIN via service role (bypasse RLS)
  const { data: callerRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUser.id)
    .eq('actif', true)

  const isSuperAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === 'SUPER_ADMIN')
  if (!isSuperAdmin) {
    return err('Forbidden — SUPER_ADMIN required', 403)
  }

  // ── 2. Parser le payload ───────────────────────────────────────────────────
  let payload: CreateUserPayload
  try {
    payload = await req.json() as CreateUserPayload
  } catch {
    return err('Invalid JSON', 400)
  }

  const { email, nom, prenom, poste, role, tenant_id } = payload
  if (!email || !nom || !prenom || !role || !tenant_id) {
    return err('Missing required fields', 400)
  }

  // ── 3. Vérifier que le tenant existe ──────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, nom')
    .eq('id', tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return err('Tenant not found', 404)
  }

  // ── 4. Générer le lien d'invitation ───────────────────────────────────────
  const redirectTo = `${APP_URL}/auth/callback?next=/tableau-de-bord`

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:    'invite',
    email,
    options: {
      redirectTo,
      data: { nom, prenom, poste: poste ?? null },
    },
  })

  if (linkErr || !linkData) {
    console.error('generateLink error:', linkErr?.message)
    return err(`Cannot generate invite link: ${linkErr?.message}`, 500)
  }

  const userId     = linkData.user.id
  const inviteLink = linkData.properties.action_link

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
    return err(`Cannot create profile: ${profErr.message}`, 500)
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
    return err(`Cannot assign role: ${roleErr.message}`, 500)
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

  return json({ success: true, user_id: userId }, 201)
})
