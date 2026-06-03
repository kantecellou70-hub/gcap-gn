# Glossaire Métier — Finances Publiques Guinéennes

## Acteurs institutionnels

| Sigle | Nom complet | Rôle dans GCAP-GN |
| ----- | ----------- | ----------------- |
| MEFB | Ministère de l'Économie, des Finances et du Budget | Référentiel réglementaire, supervision nationale |
| DNCF | Direction Nationale du Contrôle Financier | Visa préalable des engagements (Contrôleur Financier) |
| DGTCP | Direction Générale du Trésor et de la Comptabilité Publique | Paiement effectif, comptabilité générale |
| DNCM | Direction Nationale de la Comptabilité Matières | Gestion patrimoine État, interface SICOM |
| DAFF | Direction Administrative et Financière | Gestionnaire budget au niveau ministère |
| SAFF | Service Administratif et Financier | Saisie au niveau direction nationale |
| EPA | Établissement Public Administratif | Structures publiques avec autonomie financière |
| BCM | Bureau Comptable Matières | Gestion des biens matériels au niveau ministère |

## Cycle de dépense (4 phases obligatoires)

1. **ENGAGEMENT** — Acte juridique créant une obligation. Visa CF requis.
2. **LIQUIDATION** — Constatation du service fait. Calcul du montant exact.
3. **ORDONNANCEMENT** — Émission du mandat de paiement par l'ordonnateur.
4. **PAIEMENT** — Règlement effectif par le comptable du Trésor (hors périmètre GCAP-GN).

## Termes clés

- **Tenant** : un ministère ou EPA = une instance isolée dans l'application
- **Ordonnateur** : agent habilité à prescrire une dépense (Ministre ou délégué)
- **Ordonnateur délégué** : Chef DAFF — reçoit délégation du Ministre
- **Ordonnateur secondaire** : Chef SAFF au niveau direction nationale
- **Visa CF** : Approbation obligatoire du Contrôleur Financier avant engagement
- **Mandat** : Titre de paiement émis par l'ordonnateur vers le Trésor
- **RAL** : Reste À Liquider = engagement non encore liquidé
- **LFI** : Loi de Finances Initiale (budget annuel voté)
- **LFR** : Loi de Finances Rectificative (budget corrigé en cours d'année)
- **PVSF** : Procès-Verbal de Service Fait (preuve de livraison)
- **SICOM** : Système d'Information de la Comptabilité des Matières (lancé mai 2026)
- **Titre** : Niveau 1 de la nomenclature budgétaire
- **Chapitre** : Niveau 2 de la nomenclature budgétaire
- **Article** : Niveau 3 de la nomenclature budgétaire
- **Paragraphe** : Niveau 4 de la nomenclature budgétaire (niveau le plus fin)

## Statuts des engagements (machine à états)

```text
BROUILLON → EN_ATTENTE_VISA → VISE → LIQUIDE → ORDONNANCE
                           ↘ REJETE
                                              ↘ ANNULE
```

## Devise

- Franc Guinéen (GNF) — code ISO 4217 : GNF
- Pas de centimes en GNF — stocker en `INTEGER`
- Format d'affichage : "1 500 000 GNF" (espace comme séparateur de milliers)
- Utilitaire : `formatGNF(montant)` dans `@/shared/lib/currency`
