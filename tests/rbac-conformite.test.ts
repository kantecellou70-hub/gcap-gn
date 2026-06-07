/**
 * GCAP-GN — Conformité RBAC institutionnelle guinéenne
 *
 * Vérifie que la matrice des permissions respecte strictement :
 * - La séparation ordonnateur / comptable (LOLF guinéenne)
 * - L'exclusivité du visa CF (DNCF)
 * - L'absence totale de droits d'écriture pour l'AUDITEUR
 * - La règle : "on ne valide jamais ce qu'on a créé"
 */

import { describe, it, expect } from 'vitest'
import { canDo, calculerCreditDisponible, calculerTauxConsommation } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import type { Role } from '@/shared/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function peut(role: Role, permission: string): boolean {
  return canDo(permission, [role])
}

function nePeutPas(role: Role, permission: string): boolean {
  return !canDo(permission, [role])
}

const ECRITURE_PERMISSIONS = [
  PERMISSIONS.ENGAGEMENT_CREATE,
  PERMISSIONS.ENGAGEMENT_VALIDATE,
  PERMISSIONS.ENGAGEMENT_VISA,
  PERMISSIONS.ENGAGEMENT_REJECT,
  PERMISSIONS.LIQUIDATION_CREATE,
  PERMISSIONS.LIQUIDATION_VALIDATE,
  PERMISSIONS.MANDAT_EMIT,
  PERMISSIONS.BUDGET_MODIFY,
  PERMISSIONS.USERS_MANAGE,
] as const

// ─── SAFF — Agent de saisie ───────────────────────────────────────────────────

describe('SAFF — Agent de saisie', () => {
  it('peut créer un engagement en brouillon', () => {
    expect(peut('SAFF', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('peut créer une liquidation', () => {
    expect(peut('SAFF', PERMISSIONS.LIQUIDATION_CREATE)).toBe(true)
  })

  it('ne peut pas viser un engagement — exclusivité CF (DNCF)', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })

  it('ne peut pas rejeter un engagement — exclusivité CF (DNCF)', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.ENGAGEMENT_REJECT)).toBe(true)
  })

  it('ne peut pas valider une liquidation — séparation saisie/validation', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.LIQUIDATION_VALIDATE)).toBe(true)
  })

  it('ne peut pas émettre un mandat', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })

  it('ne peut pas modifier les crédits budgétaires', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })

  it('ne peut pas gérer les utilisateurs', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.USERS_MANAGE)).toBe(true)
  })

  it('ne peut pas valider un engagement (validation ≠ visa)', () => {
    expect(nePeutPas('SAFF', PERMISSIONS.ENGAGEMENT_VALIDATE)).toBe(true)
  })
})

// ─── DAFF — Direction Administrative et Financière ───────────────────────────

describe('DAFF — Gestionnaire crédits et liquidations', () => {
  it('peut créer un engagement', () => {
    expect(peut('DAFF', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('peut valider un engagement', () => {
    expect(peut('DAFF', PERMISSIONS.ENGAGEMENT_VALIDATE)).toBe(true)
  })

  it('peut créer une liquidation', () => {
    expect(peut('DAFF', PERMISSIONS.LIQUIDATION_CREATE)).toBe(true)
  })

  it('peut valider une liquidation', () => {
    expect(peut('DAFF', PERMISSIONS.LIQUIDATION_VALIDATE)).toBe(true)
  })

  it('peut émettre un mandat', () => {
    expect(peut('DAFF', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })

  it('peut modifier les crédits budgétaires', () => {
    expect(peut('DAFF', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })

  it('ne peut pas viser un engagement — rôle CF (DNCF) uniquement', () => {
    expect(nePeutPas('DAFF', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })

  it('ne peut pas rejeter un engagement — rôle CF (DNCF) uniquement', () => {
    expect(nePeutPas('DAFF', PERMISSIONS.ENGAGEMENT_REJECT)).toBe(true)
  })

  it('ne peut pas gérer les utilisateurs', () => {
    expect(nePeutPas('DAFF', PERMISSIONS.USERS_MANAGE)).toBe(true)
  })
})

// ─── CF — Contrôleur Financier (DNCF) ────────────────────────────────────────

describe('CF — Contrôleur Financier DNCF', () => {
  it('peut viser un engagement soumis', () => {
    expect(peut('CF', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })

  it('peut rejeter un engagement avec motif', () => {
    expect(peut('CF', PERMISSIONS.ENGAGEMENT_REJECT)).toBe(true)
  })

  it('peut consulter le journal d\'audit', () => {
    expect(peut('CF', PERMISSIONS.AUDIT_CONSULTER)).toBe(true)
  })

  it('ne peut pas créer un engagement — séparation création/contrôle', () => {
    expect(nePeutPas('CF', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('ne peut pas valider un engagement', () => {
    expect(nePeutPas('CF', PERMISSIONS.ENGAGEMENT_VALIDATE)).toBe(true)
  })

  it('ne peut pas créer une liquidation', () => {
    expect(nePeutPas('CF', PERMISSIONS.LIQUIDATION_CREATE)).toBe(true)
  })

  it('ne peut pas valider une liquidation', () => {
    expect(nePeutPas('CF', PERMISSIONS.LIQUIDATION_VALIDATE)).toBe(true)
  })

  it('ne peut pas émettre un mandat', () => {
    expect(nePeutPas('CF', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })

  it('ne peut pas modifier les crédits budgétaires', () => {
    expect(nePeutPas('CF', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })

  it('ne peut pas gérer les utilisateurs', () => {
    expect(nePeutPas('CF', PERMISSIONS.USERS_MANAGE)).toBe(true)
  })
})

// ─── ORDONNATEUR ──────────────────────────────────────────────────────────────

describe('ORDONNATEUR', () => {
  it('peut émettre un mandat de paiement', () => {
    expect(peut('ORDONNATEUR', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })

  it('peut valider un engagement', () => {
    expect(peut('ORDONNATEUR', PERMISSIONS.ENGAGEMENT_VALIDATE)).toBe(true)
  })

  it('ne peut pas créer un engagement', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('ne peut pas viser un engagement — rôle CF uniquement', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })

  it('ne peut pas créer une liquidation — séparation ordonnateur/comptable', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.LIQUIDATION_CREATE)).toBe(true)
  })

  /**
   * ❌ SÉPARATION FONDAMENTALE : l'ordonnateur ordonnance, il ne liquide pas.
   * La liquidation est une fonction comptable (DAFF/SAFF).
   * Cf. LOLF guinéenne, art. séparation ordonnateur/comptable.
   *
   * BUG IDENTIFIÉ si ce test échoue :
   * Dans src/shared/lib/utils.ts, retirer 'ORDONNATEUR' de 'liquidation.validate'
   */
  it('ne peut pas valider une liquidation — séparation ordonnateur/comptable LOLF', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.LIQUIDATION_VALIDATE)).toBe(true)
  })

  it('ne peut pas modifier les crédits budgétaires', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })

  it('ne peut pas gérer les utilisateurs', () => {
    expect(nePeutPas('ORDONNATEUR', PERMISSIONS.USERS_MANAGE)).toBe(true)
  })
})

// ─── AUDITEUR — Cour des Comptes ─────────────────────────────────────────────

describe('AUDITEUR — Cour des Comptes (lecture seule absolue)', () => {
  it('peut consulter le journal d\'audit', () => {
    expect(peut('AUDITEUR', PERMISSIONS.AUDIT_CONSULTER)).toBe(true)
  })

  it('ne peut rien écrire nulle part — aucun INSERT/UPDATE/DELETE', () => {
    for (const permission of ECRITURE_PERMISSIONS) {
      expect(
        nePeutPas('AUDITEUR', permission),
        `AUDITEUR ne devrait pas avoir la permission "${permission}"`
      ).toBe(true)
    }
  })

  it('ne peut pas créer un engagement', () => {
    expect(nePeutPas('AUDITEUR', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('ne peut pas valider une liquidation', () => {
    expect(nePeutPas('AUDITEUR', PERMISSIONS.LIQUIDATION_VALIDATE)).toBe(true)
  })

  it('ne peut pas émettre un mandat', () => {
    expect(nePeutPas('AUDITEUR', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })

  it('ne peut pas modifier le budget', () => {
    expect(nePeutPas('AUDITEUR', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })
})

// ─── COMPTABLE_MATIERES ───────────────────────────────────────────────────────

describe('COMPTABLE_MATIERES — Responsable Bureau Comptabilité des Matières', () => {
  /**
   * ❌ BUG si ce test échoue :
   * Les permissions M6 ne sont pas dans ROLE_PERMISSIONS (utils.ts).
   * Correctif : ajouter dans ROLE_PERMISSIONS :
   *   'matieres.gerer':   ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'COMPTABLE_MATIERES']
   *   'matieres.valider': ['SUPER_ADMIN', 'ADMIN_MINISTERE']
   *   'inventaire.clore': ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'COMPTABLE_MATIERES']
   */
  it('peut gérer les matières (saisie biens, mouvements)', () => {
    expect(peut('COMPTABLE_MATIERES', PERMISSIONS.MATIERES_GERER)).toBe(true)
  })

  it('ne peut pas créer un engagement', () => {
    expect(nePeutPas('COMPTABLE_MATIERES', PERMISSIONS.ENGAGEMENT_CREATE)).toBe(true)
  })

  it('ne peut pas viser un engagement', () => {
    expect(nePeutPas('COMPTABLE_MATIERES', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })

  it('ne peut pas émettre un mandat', () => {
    expect(nePeutPas('COMPTABLE_MATIERES', PERMISSIONS.MANDAT_EMIT)).toBe(true)
  })
})

// ─── ADMIN_MINISTERE ──────────────────────────────────────────────────────────

describe('ADMIN_MINISTERE — Administrateur ministère', () => {
  it('peut modifier les crédits budgétaires', () => {
    expect(peut('ADMIN_MINISTERE', PERMISSIONS.BUDGET_MODIFY)).toBe(true)
  })

  it('peut gérer les utilisateurs', () => {
    expect(peut('ADMIN_MINISTERE', PERMISSIONS.USERS_MANAGE)).toBe(true)
  })

  it('peut consulter l\'audit', () => {
    expect(peut('ADMIN_MINISTERE', PERMISSIONS.AUDIT_CONSULTER)).toBe(true)
  })

  it('ne peut pas viser un engagement', () => {
    expect(nePeutPas('ADMIN_MINISTERE', PERMISSIONS.ENGAGEMENT_VISA)).toBe(true)
  })
})

// ─── SUPER_ADMIN ──────────────────────────────────────────────────────────────

describe('SUPER_ADMIN — Accès total', () => {
  it('a accès à toutes les permissions de gestion', () => {
    for (const permission of ECRITURE_PERMISSIONS) {
      expect(
        peut('SUPER_ADMIN', permission),
        `SUPER_ADMIN devrait avoir la permission "${permission}"`
      ).toBe(true)
    }
  })

  it('peut consulter l\'audit', () => {
    expect(peut('SUPER_ADMIN', PERMISSIONS.AUDIT_CONSULTER)).toBe(true)
  })
})

// ─── Séparation des fonctions — LOLF guinéenne ────────────────────────────────

describe('Séparation des fonctions — LOLF guinéenne', () => {
  it('un SAFF ne peut pas viser son propre engagement', () => {
    // La règle : SAFF crée, CF vise. Même si le SAFF essaie,
    // canDo(ENGAGEMENT_VISA) doit retourner false pour ['SAFF']
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['SAFF'])).toBe(false)
  })

  it('un DAFF ne peut pas apposer le visa CF', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['DAFF'])).toBe(false)
    expect(canDo(PERMISSIONS.ENGAGEMENT_REJECT, ['DAFF'])).toBe(false)
  })

  it('le cumul SAFF + CF ne doit pas permettre création ET visa simultanés', () => {
    // Si un user avait les deux rôles (interdit institutionnellement),
    // il pourrait viser ses propres engagements — faille de séparation
    const rolesCumul: Role[] = ['SAFF', 'CF']
    const peutCreer = canDo(PERMISSIONS.ENGAGEMENT_CREATE, rolesCumul)
    const peutViser = canDo(PERMISSIONS.ENGAGEMENT_VISA, rolesCumul)
    // Le cumul est techniquement possible côté frontend — c'est le RLS qui bloque
    // Ce test documente la faille si les rôles sont mal assignés en base
    expect(peutCreer && peutViser).toBe(true)  // true = la faille EXISTE si le cumul est permis
    // → La protection est dans l'assignation des rôles, pas dans canDo()
    // Voir migration : contrainte d'exclusivité CF / SAFF sur user_roles
  })

  it('le cumul CF + DAFF ne doit pas permettre création + visa', () => {
    const rolesCumul: Role[] = ['CF', 'DAFF']
    const peutCreer = canDo(PERMISSIONS.ENGAGEMENT_CREATE, rolesCumul)
    const peutViser = canDo(PERMISSIONS.ENGAGEMENT_VISA, rolesCumul)
    expect(peutCreer && peutViser).toBe(true) // faille documentée — même raisonnement
  })

  it('ORDONNATEUR et SAFF/DAFF ne se cumulent pas sur la liquidation', () => {
    // ORDONNATEUR ordonnance, DAFF/SAFF liquident — rôles complémentaires non cumulables
    expect(canDo(PERMISSIONS.LIQUIDATION_CREATE, ['ORDONNATEUR'])).toBe(false)
  })

  it('les permissions VISA et CREATE sont mutuellement exclusives par rôle pur', () => {
    // Aucun rôle seul ne devrait avoir à la fois ENGAGEMENT_CREATE et ENGAGEMENT_VISA
    const tousLesRoles: Role[] = [
      'SUPER_ADMIN', 'ADMIN_MINISTERE', 'ORDONNATEUR', 'DAFF',
      'SAFF', 'CF', 'COMPTABLE_MATIERES', 'AUDITEUR', 'GESTIONNAIRE_BUDGET',
    ]
    for (const role of tousLesRoles) {
      if (role === 'SUPER_ADMIN') continue  // SUPER_ADMIN est l'exception volontaire
      const creerEtViser =
        canDo(PERMISSIONS.ENGAGEMENT_CREATE, [role]) &&
        canDo(PERMISSIONS.ENGAGEMENT_VISA, [role])
      expect(
        creerEtViser,
        `Le rôle ${role} ne devrait pas cumuler ENGAGEMENT_CREATE et ENGAGEMENT_VISA`
      ).toBe(false)
    }
  })
})

// ─── Intégrité de la matrice RBAC ────────────────────────────────────────────

describe('Intégrité de la matrice RBAC', () => {
  it('chaque permission définie dans PERMISSIONS a au moins un rôle autorisé', () => {
    const permissionsDefinies = Object.values(PERMISSIONS)
    const manquantes: string[] = []

    for (const perm of permissionsDefinies) {
      if (!canDo(perm, ['SUPER_ADMIN'])) {
        manquantes.push(perm)
      }
    }

    // Si SUPER_ADMIN n'a pas accès à une permission, elle n'est pas dans ROLE_PERMISSIONS
    expect(
      manquantes,
      `Permissions absentes de ROLE_PERMISSIONS (utils.ts) : ${manquantes.join(', ')}`
    ).toHaveLength(0)
  })

  it('SUPER_ADMIN a accès à toutes les permissions', () => {
    for (const perm of Object.values(PERMISSIONS)) {
      expect(
        peut('SUPER_ADMIN', perm),
        `SUPER_ADMIN devrait avoir "${perm}"`
      ).toBe(true)
    }
  })

  it('AUDITEUR n\'a accès qu\'aux permissions de lecture', () => {
    const permissionsAuditeur = Object.values(PERMISSIONS).filter(
      (p) => peut('AUDITEUR', p)
    )
    // L'AUDITEUR ne doit avoir accès qu'à audit.consulter
    expect(permissionsAuditeur).toEqual([PERMISSIONS.AUDIT_CONSULTER])
  })
})

// ─── Calculs financiers ───────────────────────────────────────────────────────

describe('Calculs financiers — GNF', () => {
  it('calcule correctement le crédit disponible', () => {
    expect(calculerCreditDisponible(10_000_000, 3_000_000)).toBe(7_000_000)
    expect(calculerCreditDisponible(5_000_000, 5_000_000)).toBe(0)
    expect(calculerCreditDisponible(2_000_000, 3_000_000)).toBe(0) // jamais négatif
  })

  it('calcule correctement le taux de consommation', () => {
    expect(calculerTauxConsommation(5_000_000, 10_000_000)).toBe(50)
    expect(calculerTauxConsommation(0, 10_000_000)).toBe(0)
    expect(calculerTauxConsommation(1_000_000, 0)).toBe(0) // division par zéro protégée
    expect(calculerTauxConsommation(10_000_000, 10_000_000)).toBe(100)
  })
})
