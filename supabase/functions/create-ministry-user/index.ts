import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL                   = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL                = 'GCAP-GN <onboarding@resend.dev>'

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

const ROLE_LABELS: Record<string, string> = {
  ADMIN_MINISTERE: 'Administrateur du Ministère',
  DAFF:            'Directeur Administratif et Financier',
  ORDONNATEUR:     'Ordonnateur',
  CF:              'Contrôleur Financier',
}

function buildEmailHtml(p: {
  prenom: string; nom: string; role: string
  tenant_nom: string; invite_link: string
}): string {
  const roleLabel = ROLE_LABELS[p.role] ?? p.role
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:#1E293B;padding:20px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">GCAP<span style="color:#475569;font-weight:300;">-GN</span></p>
          <p style="margin:4px 0 0;color:#64748B;font-size:11px;">Gestion Comptable Administrative Publique — Guinée</p>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;">Bienvenue, ${p.prenom} !</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Votre compte a été créé pour <strong>${p.tenant_nom}</strong>.<br>
            Rôle attribué : <strong>${roleLabel}</strong>
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:#4F46E5;border-radius:8px;">
              <a href="${p.invite_link}" style="display:inline-block;color:#fff;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">Accéder à GCAP-GN →</a>
            </td></tr>
          </table>
          <div style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;padding:20px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0F172A;">Premiers pas :</p>
            <ol style="margin:0;padding:0 0 0 18px;font-size:13px;color:#475569;line-height:1.8;">
              <li>Cliquez sur le lien ci-dessus</li>
              <li>Créez votre mot de passe sécurisé</li>
              <li>Configurez votre double authentification</li>
              <li>Explorez votre tableau de bord</li>
            </ol>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">Ce lien est valable <strong>24 heures</strong>.</p>
        </td></tr>
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">Support : support@lynxatech.gn — LYNXA SARL © 2026</p>
        </td></tr>
        <tr><td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="33%" style="background:#CE1126;height:4px;"></td>
            <td width="34%" style="background:#FCD116;height:4px;"></td>
            <td width="33%" style="background:#009A44;height:4px;"></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function sendWelcomeEmail(
  email: string, prenom: string, nom: string,
  role: string, tenantNom: string, inviteLink: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — welcome email skipped')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: `Votre accès GCAP-GN — ${tenantNom}`,
      html:    buildEmailHtml({ prenom, nom, role, tenant_nom: tenantNom, invite_link: inviteLink }),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('Resend error:', body)
    throw new Error(`Resend: ${body}`)
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })

  // ── 1. Vérifier le JWT ────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return new Response('Missing authorization', { status: 401, headers: cors })
  const jwt = authHeader.slice(7)

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt)
  if (callerErr || !callerUser) return new Response('Unauthorized', { status: 401, headers: cors })

  const { data: callerRoles } = await supabaseAdmin
    .from('user_roles').select('role').eq('user_id', callerUser.id).eq('actif', true)

  if (!(callerRoles ?? []).some((r: { role: string }) => r.role === 'SUPER_ADMIN')) {
    return new Response('Forbidden', { status: 403, headers: cors })
  }

  // ── 2. Payload ────────────────────────────────────────────────────────────
  let payload: CreateUserPayload
  try { payload = await req.json() as CreateUserPayload }
  catch { return new Response('Invalid JSON', { status: 400, headers: cors }) }

  const { email, nom, prenom, poste, role, tenant_id } = payload
  if (!email || !nom || !prenom || !role || !tenant_id) {
    return new Response('Missing required fields', { status: 400, headers: cors })
  }

  // ── 3. Vérifier le tenant ─────────────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants').select('id, nom').eq('id', tenant_id).single()
  if (tenantErr || !tenant) return new Response('Tenant not found', { status: 404, headers: cors })

  // ── 4. Inviter l'utilisateur (Supabase envoie son propre email d'invitation) ─
  const redirectTo = `${APP_URL}/auth/callback?next=/tableau-de-bord`

  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo, data: { nom, prenom, poste: poste ?? null } }
  )
  if (inviteErr || !inviteData?.user) {
    console.error('inviteUserByEmail error:', inviteErr?.message)
    return new Response(`Cannot invite user: ${inviteErr?.message}`, { status: 500, headers: cors })
  }
  const userId = inviteData.user.id

  // ── 5. Profil utilisateur ─────────────────────────────────────────────────
  const { error: profErr } = await supabaseAdmin.from('user_profiles').insert({
    id: userId, tenant_id, nom, prenom, poste: poste ?? null, actif: true,
  })
  if (profErr) return new Response(`Cannot create profile: ${profErr.message}`, { status: 500, headers: cors })

  // ── 6. Rôle ───────────────────────────────────────────────────────────────
  const { error: roleErr } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId, tenant_id, role, actif: true,
  })
  if (roleErr) return new Response(`Cannot assign role: ${roleErr.message}`, { status: 500, headers: cors })

  // ── 7. Email GCAP-GN brandé via Resend (en plus de l'email Supabase) ──────
  // On génère le lien pour l'inclure dans notre email brandé
  try {
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite', email, options: { redirectTo },
    })
    const inviteLink = linkData?.properties?.action_link ?? `${APP_URL}/login`
    await sendWelcomeEmail(email, prenom, nom, role, (tenant as { id: string; nom: string }).nom, inviteLink)
  } catch (emailErr) {
    console.warn('Welcome email failed (non-blocking):', emailErr)
  }

  return new Response(JSON.stringify({ success: true, user_id: userId }), {
    status:  201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
