// Tours guidés par rôle — driver.js (importé dynamiquement dans OnboardingTrigger)

export interface TourStep {
  element: string
  popover: {
    title: string
    description: string
    side?: 'left' | 'right' | 'top' | 'bottom'
  }
}

// ── Tours par rôle ────────────────────────────────────────────────────────────

const TOUR_SAFF: TourStep[] = [
  {
    element: '[data-tour="nav-engagements"]',
    popover: {
      title: '📋 Engagements',
      description: 'C\'est ici que vous créez et suivez vos demandes de dépenses. Cliquez pour accéder à la liste.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="btn-nouvel-engagement"]',
    popover: {
      title: '✏️ Créer un engagement',
      description: 'Cliquez sur ce bouton pour saisir un nouvel engagement de dépenses. Vous aurez besoin du montant, du fournisseur et de la ligne budgétaire.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="kpi-credits-disponibles"]',
    popover: {
      title: '💰 Crédits disponibles',
      description: 'Ce chiffre indique le budget restant disponible. Votre engagement ne peut pas dépasser ce montant.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="notification-bell"]',
    popover: {
      title: '🔔 Notifications',
      description: 'Vous serez notifié ici quand votre engagement est visé ou rejeté par le Contrôleur Financier.',
      side: 'bottom',
    },
  },
]

const TOUR_CF: TourStep[] = [
  {
    element: '[data-tour="nav-engagements"]',
    popover: {
      title: '📋 Engagements à viser',
      description: 'Accédez ici à tous les engagements soumis à votre visa. Votre rôle est de vérifier et valider chaque dépense.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="tab-en-attente"]',
    popover: {
      title: '⏳ En attente de visa',
      description: 'Cet onglet liste les engagements qui attendent votre décision. Cliquez sur une ligne pour examiner les détails et viser ou rejeter.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="notification-bell"]',
    popover: {
      title: '🔔 Alertes urgentes',
      description: 'Les engagements urgents ou en attente depuis plusieurs jours apparaissent en priorité dans vos notifications.',
      side: 'bottom',
    },
  },
]

const TOUR_ORDONNATEUR: TourStep[] = [
  {
    element: '[data-tour="nav-ordonnancement"]',
    popover: {
      title: '📤 Ordonnancement',
      description: 'Après validation des liquidations, vous émettez ici les mandats de paiement à destination du Trésor.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="kpi-taux-execution"]',
    popover: {
      title: '📊 Taux d\'exécution',
      description: 'Ce tableau de bord vous donne une vue instantanée du taux d\'utilisation du budget. Un bon taux d\'exécution reflète une bonne gestion.',
      side: 'bottom',
    },
  },
]

const TOUR_DAFF: TourStep[] = [
  {
    element: '[data-tour="nav-budget"]',
    popover: {
      title: '💼 Gestion du budget',
      description: 'Consultez et gérez ici les lignes budgétaires de votre ministère : crédits ouverts, révisés et disponibles.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-engagements"]',
    popover: {
      title: '📋 Suivi des engagements',
      description: 'Suivez toutes les dépenses engagées et leur progression dans le cycle budgétaire.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-reporting"]',
    popover: {
      title: '📈 Reporting',
      description: 'Générez et exportez les tableaux de bord et rapports budgétaires pour votre direction.',
      side: 'right',
    },
  },
]

const TOUR_AUDITEUR: TourStep[] = [
  {
    element: '[data-tour="nav-audit"]',
    popover: {
      title: '🔍 Journal d\'audit',
      description: 'Consultez ici toutes les opérations enregistrées dans le système. Chaque action est tracée et signée numériquement.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="btn-export-csv"]',
    popover: {
      title: '📥 Export Cour des Comptes',
      description: 'Exportez le journal d\'audit au format CSV pour vos contrôles. Les signatures HMAC permettent de vérifier l\'intégrité des données.',
      side: 'top',
    },
  },
]

// ── Mapping rôle → tour ───────────────────────────────────────────────────────

const ROLE_TOURS: Record<string, TourStep[]> = {
  SAFF:            TOUR_SAFF,
  AGENT_SAISIE:    TOUR_SAFF,
  CF:              TOUR_CF,
  ORDONNATEUR:     TOUR_ORDONNATEUR,
  DAFF:            TOUR_DAFF,
  ADMIN_MINISTERE: TOUR_DAFF,
  GESTIONNAIRE_BUDGET: TOUR_DAFF,
  AUDITEUR:        TOUR_AUDITEUR,
}

export function getTourForRole(role: string): TourStep[] {
  return ROLE_TOURS[role] ?? TOUR_DAFF
}
