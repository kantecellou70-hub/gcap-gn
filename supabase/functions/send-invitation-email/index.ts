const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL        = Deno.env.get('APP_URL') ?? 'https://gcap-gn.vercel.app'
const FROM_EMAIL     = 'GCAP-GN <invitations@gcap-gn.gouv.gn>'

interface InvitationEmailPayload {
  to_email:    string
  prenom:      string
  nom:         string
  role_label:  string
  tenant_nom:  string
  invite_link: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN_MINISTERE: 'Administrateur du Ministère',
  DAFF:            'Directeur Administratif et Financier',
  ORDONNATEUR:     'Ordonnateur',
  CF:              'Contrôleur Financier',
}

function buildEmailHtml(p: InvitationEmailPayload): string {
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

        <!-- Corps -->
        <tr><td style="padding:32px 32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;">
            Bienvenue sur GCAP-GN, ${p.prenom} !
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Votre compte a été créé pour <strong>${p.tenant_nom}</strong>.<br>
            Rôle attribué : <strong>${p.role_label}</strong>
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:#4F46E5;border-radius:8px;">
              <a href="${p.invite_link}"
                 style="display:inline-block;color:#fff;font-size:14px;font-weight:600;padding:14px 28px;text-decoration:none;">
                Accéder à GCAP-GN →
              </a>
            </td></tr>
          </table>

          <!-- Premiers pas -->
          <div style="background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;padding:20px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0F172A;">Premiers pas :</p>
            <ol style="margin:0;padding:0 0 0 18px;font-size:13px;color:#475569;line-height:1.8;">
              <li>Cliquez sur le bouton ci-dessus</li>
              <li>Créez votre mot de passe sécurisé</li>
              <li>Configurez votre double authentification (obligatoire pour votre rôle)</li>
              <li>Explorez votre tableau de bord</li>
            </ol>
          </div>

          <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
            Ce lien d'invitation est valable <strong>24 heures</strong>. Passé ce délai,
            contactez votre administrateur GCAP-GN pour en obtenir un nouveau.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">
            Support : <a href="mailto:support@lynxatech.gn" style="color:#4F46E5;">support@lynxatech.gn</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#CBD5E1;">
            Propulsé par <strong>LYNXA SARL</strong> — Conakry, Guinée &copy; 2026
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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: InvitationEmailPayload
  try {
    payload = await req.json() as InvitationEmailPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!payload.to_email || !payload.invite_link) {
    return new Response('Missing required fields', { status: 400 })
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — invitation email skipped')
    return new Response(JSON.stringify({ sent: false, reason: 'no_api_key' }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const roleLabel = ROLE_LABELS[payload.role_label] ?? payload.role_label
  const html = buildEmailHtml({ ...payload, role_label: roleLabel })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [payload.to_email],
      subject: `Votre accès GCAP-GN — ${payload.tenant_nom}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return new Response('Email send failed', { status: 500 })
  }

  return new Response(JSON.stringify({ sent: true, to: payload.to_email }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// supprime l'avertissement de variable inutilisée
void APP_URL
