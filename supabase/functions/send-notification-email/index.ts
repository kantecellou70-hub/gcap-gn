import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL        = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'
const FROM_EMAIL     = 'GCAP-GN <notifications@gcap-gn.gouv.gn>'

interface NotificationRecord {
  id:         string
  user_id:    string
  tenant_id:  string
  type:       string
  titre:      string
  message:    string
  priorite:   'normale' | 'urgente'
  lien:       string | null
  metadata:   Record<string, unknown>
  created_at: string
}

interface WebhookPayload {
  type:   'INSERT' | 'UPDATE' | 'DELETE'
  table:  string
  record: NotificationRecord
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emailHtml(notif: NotificationRecord, userEmail: string): string {
  const lienAbsolu = notif.lien ? `${APP_URL}${notif.lien}` : APP_URL
  const couleurBadge = notif.priorite === 'urgente' ? '#DC2626' : '#4F46E5'

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#1E293B;padding:20px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">
            GCAP<span style="color:#475569;font-weight:300;">-GN</span>
          </p>
          <p style="margin:4px 0 0;color:#64748B;font-size:11px;">Gestion Comptable Administrative Publique — Guinée</p>
        </td></tr>

        <!-- Badge priorité -->
        <tr><td style="padding:24px 32px 0;">
          <span style="background:${couleurBadge};color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;letter-spacing:0.5px;">
            ${notif.priorite === 'urgente' ? '🚨 URGENT' : '🔔 NOTIFICATION'}
          </span>
        </td></tr>

        <!-- Contenu -->
        <tr><td style="padding:16px 32px 24px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">${notif.titre}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${notif.message}</p>

          <!-- CTA -->
          <a href="${lienAbsolu}" style="display:inline-block;background:#4F46E5;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Voir dans GCAP-GN →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">
            Cet email a été envoyé automatiquement par GCAP-GN.<br>
            Ne pas répondre à cet email — connectez-vous à l'application pour agir.
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#CBD5E1;">
            Propulsé par <strong>LYNXA SARL</strong> — Conakry, Guinée
          </p>
        </td></tr>

        <!-- Barre tricolore guinéenne -->
        <tr><td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="background:#CE1126;height:4px;"></td>
              <td width="34%" style="background:#FCD116;height:4px;"></td>
              <td width="33%" style="background:#009A44;height:4px;"></td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Ignorer les non-INSERT ou les notifications normales
  if (payload.type !== 'INSERT') {
    return new Response('Ignored', { status: 200 })
  }

  const notif = payload.record
  if (notif.priorite !== 'urgente') {
    return new Response('Not urgent — skipped', { status: 200 })
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email skipped')
    return new Response('Email skipped (no API key)', { status: 200 })
  }

  // Récupérer l'email de l'utilisateur via Admin API
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notif.user_id)
  if (userError || !userData.user?.email) {
    console.error('Cannot fetch user email:', userError?.message)
    return new Response('User not found', { status: 500 })
  }

  const userEmail = userData.user.email

  // Envoyer l'email via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [userEmail],
      subject: `[URGENT] ${notif.titre} — GCAP-GN`,
      html:    emailHtml(notif, userEmail),
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('Resend error:', err)
    return new Response('Email send failed', { status: 500 })
  }

  return new Response(JSON.stringify({ sent: true, to: userEmail }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
})
