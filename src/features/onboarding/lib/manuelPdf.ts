// Génération du manuel utilisateur PDF par rôle — jsPDF en import dynamique

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:         'Super Administrateur',
  ADMIN_MINISTERE:     'Administrateur du Ministère',
  ORDONNATEUR:         'Ordonnateur',
  DAFF:                'Directeur Administratif et Financier',
  SAFF:                'Agent SAFF',
  CF:                  'Contrôleur Financier',
  COMPTABLE_MATIERES:  'Comptable Matières',
  AUDITEUR:            'Auditeur – Cour des Comptes',
  GESTIONNAIRE_BUDGET: 'Gestionnaire Budget',
  AGENT_SAISIE:        'Agent de Saisie',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SAFF: "En tant qu'Agent SAFF, vous êtes le premier maillon du cycle de la dépense. Vous créez les engagements et joignez les pièces justificatives. Vos saisies sont ensuite examinées par le Contrôleur Financier avant d'être validées.",
  CF: "En tant que Contrôleur Financier, vous vérifiez et visez les engagements soumis par les agents SAFF. Votre visa est obligatoire avant toute liquidation. Vous êtes garant de la régularité des dépenses conformément à la LOLF.",
  ORDONNATEUR: "En tant qu'Ordonnateur, vous êtes habilité à engager les crédits et à émettre les mandats de paiement. Vos actes sont l'aboutissement du cycle de la dépense et engagent la responsabilité de votre institution.",
  DAFF: "En tant que Directeur Administratif et Financier, vous supervisez l'ensemble du budget et des dépenses de votre ministère. Vous avez accès aux tableaux de bord, aux rapports et pouvez créer des engagements.",
  AUDITEUR: "En tant qu'Auditeur, vous avez accès en lecture seule à l'intégralité des données de la plateforme. Vous pouvez consulter le journal d'audit, vérifier les signatures numériques et exporter les données pour la Cour des Comptes.",
  ADMIN_MINISTERE: "En tant qu'Administrateur, vous configurez les utilisateurs, les exercices budgétaires et les paramètres de votre ministère. Vous pouvez créer des comptes et attribuer des rôles.",
}

interface ActionDef {
  title: string
  steps: string[]
}

const ROLE_ACTIONS: Record<string, ActionDef[]> = {
  SAFF: [
    { title: 'Créer un engagement', steps: ['Cliquez sur "Engagements" dans le menu', 'Cliquez sur "Nouvel engagement"', 'Renseignez le montant, le fournisseur et la ligne budgétaire', 'Joignez les pièces justificatives (facture, bon de commande)', 'Cliquez sur "Soumettre" — votre CF sera notifié'] },
    { title: 'Uploader une pièce jointe', steps: ['Ouvrez l\'engagement concerné', 'Cliquez sur "Pièces jointes"', 'Glissez-déposez le fichier ou cliquez pour sélectionner', 'Les formats acceptés sont PDF, JPG, PNG (max 10 Mo)'] },
    { title: 'Que faire si mon engagement est rejeté ?', steps: ['Vous recevez une notification avec le motif du rejet', 'Ouvrez l\'engagement rejeté', 'Corrigez les informations demandées par le CF', 'Soumettez à nouveau — le CF sera renotifié'] },
  ],
  CF: [
    { title: 'Viser un engagement', steps: ['Accédez à "Engagements" → onglet "En attente de visa"', 'Cliquez sur l\'engagement à examiner', 'Vérifiez le montant, la ligne budgétaire et les pièces jointes', 'Cliquez sur "Viser" pour approuver'] },
    { title: 'Rejeter un engagement avec motif', steps: ['Ouvrez l\'engagement à rejeter', 'Cliquez sur "Rejeter"', 'Saisissez obligatoirement un motif de rejet précis', 'L\'agent SAFF sera notifié avec votre motif'] },
    { title: 'Comprendre les alertes', steps: ['Une alerte rouge = engagement en attente depuis plus de 5 jours', 'Une alerte orange = montant élevé nécessitant attention particulière', 'Les alertes apparaissent dans la cloche en haut à droite'] },
  ],
  ORDONNATEUR: [
    { title: 'Émettre un mandat de paiement', steps: ['Accédez à "Ordonnancement"', 'Sélectionnez une liquidation validée', 'Cliquez sur "Émettre le mandat"', 'Vérifiez le montant net et la domiciliation bancaire', 'Validez — le mandat est transmis au Trésor'] },
    { title: 'Lire le tableau de bord', steps: ['Le taux d\'exécution indique le % du budget effectivement dépensé', 'Les RAP (Restes à Payer) sont les mandats non encore réglés', '"En attente Trésor" : mandats transmis mais pas encore payés'] },
    { title: 'Mon mandat est rejeté par le Trésor', steps: ['Vous recevez une notification de rejet', 'Consultez le motif dans "Ordonnancement" → mandat concerné', 'Corrigez les informations (IBAN, montant) et réémettre'] },
  ],
  DAFF: [
    { title: 'Consulter les crédits disponibles', steps: ['Accédez à "Budget"', 'Consultez la liste des lignes budgétaires', 'La colonne "Disponible" indique le solde restant', 'Cliquez sur une ligne pour voir son historique'] },
    { title: 'Exporter un rapport budgétaire', steps: ['Accédez à "Reporting"', 'Sélectionnez la période et le type de rapport', 'Cliquez sur "Exporter Excel" ou "Exporter PDF"', 'Le fichier se télécharge automatiquement'] },
  ],
  AUDITEUR: [
    { title: 'Chercher dans le journal d\'audit', steps: ['Accédez à "Audit" dans le menu', 'Utilisez les filtres : date, utilisateur, type d\'action', 'Cliquez sur une ligne pour voir les détails complets', 'La signature HMAC garantit l\'intégrité de chaque entrée'] },
    { title: 'Exporter pour la Cour des Comptes', steps: ['Dans "Audit", définissez la période à exporter', 'Cliquez sur "Exporter CSV"', 'Le fichier contient les données et signatures vérifiables'] },
  ],
}

function getActionsForRole(role: string): ActionDef[] {
  return ROLE_ACTIONS[role] ?? ROLE_ACTIONS['DAFF']
}

function getCanDo(role: string): string[] {
  const CAN: Record<string, string[]> = {
    SAFF:        ['Créer des engagements', 'Joindre des pièces', 'Consulter ses propres saisies'],
    CF:          ['Viser et rejeter des engagements', 'Valider des liquidations', 'Consulter tous les engagements'],
    ORDONNATEUR: ['Émettre des mandats', 'Consulter le tableau de bord', 'Superviser le cycle de la dépense'],
    DAFF:        ['Gérer les lignes budgétaires', 'Consulter tous les modules', 'Exporter les rapports'],
    AUDITEUR:    ['Consulter toutes les données en lecture seule', 'Exporter le journal d\'audit'],
  }
  return CAN[role] ?? CAN['DAFF']
}

function getCannotDo(role: string): string[] {
  const CANNOT: Record<string, string[]> = {
    SAFF:        ['Valider ses propres saisies (séparation des fonctions)', 'Émettre des mandats', 'Modifier les lignes budgétaires'],
    CF:          ['Créer des engagements', 'Émettre des mandats', 'Modifier les paramètres système'],
    ORDONNATEUR: ['Saisir les engagements directement', 'Encaisser des fonds', 'Modifier les données d\'audit'],
    DAFF:        ['Encaisser des fonds directement', 'Modifier les données d\'audit'],
    AUDITEUR:    ['Créer, modifier ou supprimer des données', 'Approuver des opérations'],
  }
  return CANNOT[role] ?? CANNOT['DAFF']
}

export async function genererManuelPdf(
  role: string,
  userName: string,
  ministereNom: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const MARGIN = 20
  const CONTENT_W = W - MARGIN * 2

  // ── Couleurs guinéennes ─────────────────────────────────────────────────────
  const COLOR_RED    = [206, 17, 38]   as [number, number, number]
  const COLOR_YELLOW = [252, 209, 22]  as [number, number, number]
  const COLOR_GREEN  = [0, 148, 96]    as [number, number, number]
  const COLOR_INDIGO = [79, 70, 229]   as [number, number, number]
  const COLOR_SLATE  = [30, 41, 59]    as [number, number, number]
  const COLOR_GRAY   = [100, 116, 139] as [number, number, number]

  function drawGuineaBanner(y: number) {
    const stripW = CONTENT_W / 3
    doc.setFillColor(...COLOR_RED)
    doc.rect(MARGIN, y, stripW, 3, 'F')
    doc.setFillColor(...COLOR_YELLOW)
    doc.rect(MARGIN + stripW, y, stripW, 3, 'F')
    doc.setFillColor(...COLOR_GREEN)
    doc.rect(MARGIN + stripW * 2, y, stripW, 3, 'F')
  }

  function addPage() {
    doc.addPage()
  }

  // ── PAGE 1 : COUVERTURE ─────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, W, H, 'F')

  // Logo textuel GCAP-GN
  doc.setFontSize(28)
  doc.setTextColor(...COLOR_INDIGO)
  doc.setFont('helvetica', 'bold')
  doc.text('GCAP-GN', W / 2, 60, { align: 'center' })

  doc.setFontSize(11)
  doc.setTextColor(...COLOR_GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text('Gestion Comptable Administrative Publique — Guinée', W / 2, 70, { align: 'center' })

  drawGuineaBanner(80)

  doc.setFontSize(16)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'bold')
  doc.text('Manuel Utilisateur', W / 2, 105, { align: 'center' })

  const roleLabel = ROLE_LABELS[role] ?? role
  doc.setFontSize(14)
  doc.setTextColor(...COLOR_INDIGO)
  doc.text(roleLabel, W / 2, 118, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(...COLOR_GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Préparé pour : ${userName}`, W / 2, 140, { align: 'center' })
  doc.text(ministereNom, W / 2, 149, { align: 'center' })

  const today = new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())
  doc.text(`Généré le ${today}`, W / 2, 158, { align: 'center' })

  drawGuineaBanner(H - 25)

  doc.setFontSize(8)
  doc.setTextColor(...COLOR_GRAY)
  doc.text('LYNXA SARL · Conakry, Guinée · support@lynxatech.gn', W / 2, H - 15, { align: 'center' })

  // ── PAGE 2 : VOTRE RÔLE ─────────────────────────────────────────────────────
  addPage()
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, W, H, 'F')

  doc.setFontSize(16)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'bold')
  doc.text('Votre rôle dans GCAP-GN', MARGIN, 30)

  doc.setFontSize(10)
  doc.setTextColor(...COLOR_GRAY)
  doc.setFont('helvetica', 'normal')
  const desc = ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS['DAFF']
  const lines = doc.splitTextToSize(desc, CONTENT_W)
  doc.text(lines, MARGIN, 44)

  let yPos = 44 + lines.length * 6 + 10

  // Ce que vous pouvez faire
  doc.setFontSize(11)
  doc.setTextColor(...COLOR_GREEN)
  doc.setFont('helvetica', 'bold')
  doc.text('✓ Ce que vous pouvez faire', MARGIN, yPos)
  yPos += 8

  doc.setFontSize(9)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'normal')
  for (const action of getCanDo(role)) {
    doc.text(`• ${action}`, MARGIN + 4, yPos)
    yPos += 6
  }

  yPos += 6

  // Ce que vous ne pouvez pas faire
  doc.setFontSize(11)
  doc.setTextColor(...COLOR_RED)
  doc.setFont('helvetica', 'bold')
  doc.text('✗ Ce que vous ne pouvez pas faire', MARGIN, yPos)
  yPos += 8

  doc.setFontSize(9)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'normal')
  for (const action of getCannotDo(role)) {
    doc.text(`• ${action}`, MARGIN + 4, yPos)
    yPos += 6
  }

  yPos += 10
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_GRAY)
  doc.setFont('helvetica', 'italic')
  const lolfNote = doc.splitTextToSize(
    'Note : La séparation des fonctions est imposée par la LOLF guinéenne. Elle garantit qu\'aucune personne ne peut à la fois initier et valider une même dépense, protégeant ainsi les deniers publics.',
    CONTENT_W
  )
  doc.text(lolfNote, MARGIN, yPos)

  // ── PAGES ACTIONS ───────────────────────────────────────────────────────────
  const actions = getActionsForRole(role)

  for (const action of actions) {
    addPage()
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, W, H, 'F')

    doc.setFontSize(14)
    doc.setTextColor(...COLOR_INDIGO)
    doc.setFont('helvetica', 'bold')
    doc.text(action.title, MARGIN, 35)

    doc.setDrawColor(...COLOR_INDIGO)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, 39, W - MARGIN, 39)

    let y = 52
    action.steps.forEach((step, i) => {
      // Numéro de l'étape
      doc.setFillColor(...COLOR_INDIGO)
      doc.circle(MARGIN + 4, y - 2, 3.5, 'F')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text(String(i + 1), MARGIN + 4, y - 0.5, { align: 'center' })

      // Texte de l'étape
      doc.setFontSize(10)
      doc.setTextColor(...COLOR_SLATE)
      doc.setFont('helvetica', 'normal')
      const stepLines = doc.splitTextToSize(step, CONTENT_W - 12)
      doc.text(stepLines, MARGIN + 12, y)
      y += stepLines.length * 6 + 8
    })

    drawGuineaBanner(H - 20)
  }

  // ── DERNIÈRE PAGE : SUPPORT ──────────────────────────────────────────────────
  addPage()
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, W, H, 'F')

  doc.setFontSize(16)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'bold')
  doc.text('Support & Assistance', MARGIN, 35)

  doc.setFontSize(11)
  doc.setTextColor(...COLOR_INDIGO)
  doc.setFont('helvetica', 'bold')
  doc.text('📧 support@lynxatech.gn', MARGIN, 52)

  doc.setFontSize(10)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'normal')
  doc.text('En cas de problème, suivez ces étapes :', MARGIN, 66)

  const supportSteps = [
    'Notez le message d\'erreur exact (faites une capture d\'écran si possible)',
    'Vérifiez votre connexion internet',
    'Déconnectez-vous et reconnectez-vous',
    'Si le problème persiste, envoyez un email à support@lynxatech.gn avec la capture',
    'Votre administrateur de ministère peut aussi vous aider pour les questions d\'accès',
  ]

  let sy = 76
  supportSteps.forEach((step, i) => {
    doc.setFontSize(9)
    doc.setTextColor(...COLOR_SLATE)
    const sl = doc.splitTextToSize(`${i + 1}. ${step}`, CONTENT_W - 4)
    doc.text(sl, MARGIN + 4, sy)
    sy += sl.length * 5.5 + 4
  })

  sy += 10
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_RED)
  doc.setFont('helvetica', 'bold')
  doc.text('⚠ Sécurité importante', MARGIN, sy)
  sy += 8

  doc.setFontSize(9)
  doc.setTextColor(...COLOR_SLATE)
  doc.setFont('helvetica', 'normal')
  const secNotes = [
    'Ne communiquez jamais votre mot de passe à quiconque, même au support LYNXA.',
    'Verrouillez toujours votre session quand vous quittez votre poste.',
    'Signalez tout accès suspect à votre administrateur.',
  ]
  for (const note of secNotes) {
    doc.text(`• ${note}`, MARGIN + 4, sy)
    sy += 6
  }

  drawGuineaBanner(H - 25)

  doc.setFontSize(8)
  doc.setTextColor(...COLOR_GRAY)
  doc.text('GCAP-GN · LYNXA SARL © 2026 · Conakry, Guinée', W / 2, H - 12, { align: 'center' })

  // ── Téléchargement ──────────────────────────────────────────────────────────
  const dateStr = new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date())
    .replace(/\//g, '-')
  const safeRole = role.replace(/[^A-Z0-9_]/g, '')
  const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)

  doc.save(`GCAP-GN_Manuel_${safeRole}_${safeName}_${dateStr}.pdf`)
}
