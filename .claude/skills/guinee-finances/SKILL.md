---
name: guinee-finances
description: >
  Connaissances métier sur les finances publiques guinéennes. Utiliser quand
  on code des fonctionnalités liées au cycle de dépense, aux rôles DAFF/SAFF/CF,
  aux nomenclatures budgétaires, aux mandats, ou à la réglementation guinéenne.
---

# Finances Publiques Guinéennes — Règles métier pour le code

## Règle 1 : Cycle de dépense obligatoire

Toute dépense DOIT passer par : Engagement → Liquidation → Ordonnancement

Il est INTERDIT de créer une liquidation sans engagement avec statut `VISE`.
Il est INTERDIT d'émettre un mandat sans liquidation avec statut `VALIDE`.

```typescript
// Vérification avant création de liquidation
if (engagement.statut !== 'VISE') {
  throw new Error('Impossible de liquider : engagement non visé par le CF')
}

// Vérification avant émission de mandat
if (liquidation.statut !== 'VALIDE') {
  throw new Error('Impossible d\'émettre le mandat : liquidation non validée')
}
```

## Règle 2 : Disponibilité des crédits

Avant tout engagement, vérifier la disponibilité budgétaire :

```typescript
const creditDisponible = ligne.credit_revise - ligne.montant_engage

if (montantEngagement > creditDisponible) {
  throw new Error(
    `Crédits insuffisants — disponible : ${formatGNF(creditDisponible)}, demandé : ${formatGNF(montantEngagement)}`
  )
}
```

Cette vérification est faite côté frontend (UX) ET côté backend (trigger PostgreSQL).

## Règle 3 : Montants en GNF

```typescript
// Depuis @/shared/lib/currency
export function formatGNF(montant: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant)
}
// Résultat : "1 500 000 GNF"
```

- Stockage : `INTEGER` uniquement (jamais `DECIMAL` ou `float`)
- Ne jamais utiliser USD, EUR ou une autre devise
- `parseGNF(value)` pour convertir une saisie texte en entier

## Règle 4 : Numérotation des pièces officielles

```typescript
// Engagement  : ENG-{ANNEE}-{MINISTERE_CODE}-{SEQUENCE_5} → ENG-2026-MSANTE-00042
// Liquidation : LIQ-{ANNEE}-{MINISTERE_CODE}-{SEQUENCE_5} → LIQ-2026-MSANTE-00017
// Mandat      : MAN-{ANNEE}-{MINISTERE_CODE}-{SEQUENCE_5} → MAN-2026-MSANTE-00009
```

La séquence est à 5 chiffres avec zéros de remplissage (`String(seq).padStart(5, '0')`).

## Règle 5 : Statuts — machine à états stricte

Ne jamais modifier un statut en dehors des transitions autorisées :

```typescript
type EngagementStatut =
  | 'BROUILLON'
  | 'EN_ATTENTE_VISA'
  | 'VISE'
  | 'REJETE'
  | 'LIQUIDE'
  | 'ORDONNANCE'
  | 'ANNULE'

// BROUILLON → EN_ATTENTE_VISA          par DAFF/SAFF
// EN_ATTENTE_VISA → VISE               par CF uniquement
// EN_ATTENTE_VISA → REJETE             par CF uniquement (motif obligatoire)
// VISE → LIQUIDE                       automatique à la création liquidation
// LIQUIDE → ORDONNANCE                 automatique à l'émission mandat
// Tout statut → ANNULE                 par DAFF ou ORDONNATEUR (motif obligatoire)

const TRANSITIONS: Record<EngagementStatut, EngagementStatut[]> = {
  BROUILLON:       ['EN_ATTENTE_VISA', 'ANNULE'],
  EN_ATTENTE_VISA: ['VISE', 'REJETE', 'ANNULE'],
  VISE:            ['LIQUIDE', 'ANNULE'],
  REJETE:          ['BROUILLON', 'ANNULE'],
  LIQUIDE:         ['ORDONNANCE', 'ANNULE'],
  ORDONNANCE:      [],   // Terminal
  ANNULE:          [],   // Terminal
}

function peutTransitionner(actuel: EngagementStatut, cible: EngagementStatut): boolean {
  return TRANSITIONS[actuel].includes(cible)
}
```

## Règle 6 : Exercice budgétaire

- Un exercice = une année civile (1er janvier → 31 décembre)
- Les engagements non liquidés en fin d'exercice deviennent des **RAL** (Restes à Liquider)
- INTERDIT de créer un engagement sur un exercice `CLOTURE` ou `ARCHIVE`

```typescript
function peutEngagerSurExercice(exercice: ExerciceBudgetaire): boolean {
  if (exercice.statut !== 'OUVERT') throw new Error('Exercice budgétaire non ouvert')
  return true
}
```

## Règle 7 : Séparation des fonctions

```typescript
// Un CF ne peut pas créer un engagement
function canCreateEngagement(role: string): boolean {
  return ['SUPER_ADMIN', 'DAFF', 'SAFF'].includes(role)
}

// Un agent ne peut pas viser ses propres saisies
function canViserEngagement(role: string, engagement: Engagement, userId: string): boolean {
  if (!['SUPER_ADMIN', 'CF'].includes(role)) return false
  if (engagement.created_by === userId) return false  // Pas d'auto-validation
  return true
}
```

## Règle 7 : Nomenclature budgétaire (4 niveaux)

```text
Titre (1 chiffre)
  └── Chapitre (2 chiffres)
        └── Article (3 chiffres)
              └── Paragraphe (4+ chiffres, optionnel)
```

Exemple : `1.10.101.1011` = Titre 1 / Chapitre 10 / Article 101 / Paragraphe 1011

## Règle 8 : Pièces justificatives obligatoires

| Type de dépense | Pièces requises |
| --------------- | --------------- |
| Marché public | Contrat signé, ordre de service, PVSF |
| Prestation service | Facture pro-forma, rapport prestation, PVSF |
| Achat direct | Facture, bon de livraison |
| Mission | Ordre de mission, rapport de mission, états de frais |

## Référence rapide — tables BDD

| Concept | Table | Colonnes clés |
| ------- | ----- | ------------- |
| Engagement | `engagements_depenses` | `statut`, `montant_engage`, `vise_par` |
| Ligne budgétaire | `lignes_budgetaires` | `credit_revise`, `montant_engage` |
| Liquidation | `liquidations` | `montant_net`, `date_service_fait` |
| Mandat | `mandats_paiement` | `numero`, `mode_paiement`, `statut` |
| Utilisateur | `user_profiles` + `user_roles` | `role`, `tenant_id` |

## Acteurs institutionnels clés

| Sigle | Rôle dans le système |
| ----- | -------------------- |
| MEFB | Référentiel réglementaire, supervision nationale |
| DNCF | Contrôleur Financier — vise les engagements |
| DGTCP | Trésor — paiement effectif (hors périmètre GCAP-GN) |
| DAFF | Gestionnaire budget au niveau ministère |
| SAFF | Saisie au niveau direction nationale |
