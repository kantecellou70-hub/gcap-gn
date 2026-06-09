import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'

interface CreateUserPayload {
  email:     string
  nom:       string
  prenom:    string
  poste:     string
  role:      'ADMIN_MINISTERE' | 'DAFF' | 'ORDONNATEUR' | 'CF'
  tenant_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ── 1. Vérifier le JWT de l'appelant ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Missing authorization', { status: 401 })
  }
  const jwt = authHeader.slice(7)

  // Client avec la clé service role (admin)
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Client avec le JWT de l'appelant (pour vérifier son rôle)
  const supabaseCaller = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth:    { autoRefreshToken: false, persistSession: false },
    global:  { headers: { Authorization: `Bearer ${jwt}` } },
  })

  // Récupérer l'utilisateur appelant et son profil
  const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt)
  if (callerErr || !callerUser) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Vérifier que l'appelant est SUPER_ADMIN
  const { data: callerRoles } = await supabaseCaller
    .from('user_roles')
    .select('role')
    .eq('user_id', callerUser.id)
    .eq('actif', true)

  const isSuperAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === 'SUPER_ADMIN')
  if (!isSuperAdmin) {
    return new Response('Forbidden — SUPER_ADMIN required', { status: 403 })
  }

  // ── 2. Parser le payload ───────────────────────────────────────────────────
  let payload: CreateUserPayload
  try {
    payload = await req.json() as CreateUserPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { email, nom, prenom, poste, role, tenant_id } = payload
  if (!email || !nom || !prenom || !role || !tenant_id) {
    return new Response('Missing required fields', { status: 400 })
  }

  // ── 3. Vérifier que le tenant existe ──────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, nom')
    .eq('id', tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return new Response('Tenant not found', { status: 404 })
  }

  // ── 4. Générer le lien d'invitation (sans envoyer d'email Supabase) ───────
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
    return new Response(`Cannot generate invite link: ${linkErr?.message}`, { status: 500 })
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
    return new Response(`Cannot create profile: ${profErr.message}`, { status: 500 })
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
    return new Response(`Cannot assign role: ${roleErr.message}`, { status: 500 })
  }

  // ── 7. Envoyer l'email de bienvenue via send-invitation-email ─────────────
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
    // Ne pas faire échouer la création si l'email ne part pas
    console.warn('Email sending failed (non-blocking):', emailErr)
  }

  return new Response(JSON.stringify({ success: true, user_id: userId }), {
    status:  201,
    headers: { 'Content-Type': 'application/json' },
  })
})
