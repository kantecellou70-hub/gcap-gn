# Convention de Niveau de Service (SLA) — GCAP-GN

**Version** : 1.0 — Juin 2026  
**Éditeur** : LYNXA SARL (LynxaTech), Conakry, République de Guinée  
**Applicable à** : Contrats de souscription GCAP-GN — Plan Pro et Enterprise  
**Droit applicable** : Droit guinéen, OHADA

---

## 1. Définitions

| Terme | Définition |
|-------|------------|
| **Disponibilité** | Pourcentage de temps pendant lequel GCAP-GN est accessible et fonctionnel, mesuré sur un mois civil |
| **Incident** | Toute interruption ou dégradation du service affectant les utilisateurs |
| **Maintenance planifiée** | Opération de mise à jour programmée, notifiée 48 h à l'avance, exclue du calcul de disponibilité |
| **RTO** | Recovery Time Objective — délai maximal de restauration après incident |
| **RPO** | Recovery Point Objective — perte de données maximale acceptable |
| **Client** | Le ministère ou EPA ayant souscrit à GCAP-GN |
| **Tenant** | L'espace de données isolé d'un Client dans la base de données multi-tenant |

---

## 2. Niveaux de service

### 2.1 Disponibilité

| Indicateur | Plan Pro | Plan Enterprise |
|------------|----------|-----------------|
| Disponibilité mensuelle garantie | **99,5 %** | **99,9 %** |
| Temps d'arrêt maximal par mois | 3 h 36 min | 43 min |
| Temps d'arrêt maximal par an | 43 h 48 min | 8 h 45 min |
| Fenêtre de maintenance planifiée | Dimanche 02h00–05h00 (WAT) | Dimanche 02h00–04h00 (WAT) |

> Le calcul de disponibilité exclut : maintenances planifiées notifiées, incidents causés par des tiers hors contrôle de LYNXA (pannes FAI du Client, force majeure), et indisponibilité due au non-respect des prérequis techniques.

### 2.2 Performances

| Indicateur | Cible (Pro) | Cible (Enterprise) |
|------------|-------------|---------------------|
| Temps de chargement initial (3G) | < 5 secondes | < 3 secondes |
| Temps de réponse API (P95) | < 2 secondes | < 1 seconde |
| Temps de génération PDF (mandat) | < 10 secondes | < 5 secondes |
| Export Excel (≤ 1 000 lignes) | < 30 secondes | < 15 secondes |

### 2.3 Sauvegarde et récupération

| Indicateur | Plan Pro | Plan Enterprise |
|------------|----------|-----------------|
| RPO | < 1 minute | < 30 secondes |
| RTO | < 4 heures | < 1 heure |
| Rétention sauvegardes | 7 jours | 30 jours + 1 an mensuel |
| Test de restauration | Mensuel | Mensuel |

---

## 3. Support et délais de réponse

### 3.1 Niveaux de priorité

| Priorité | Description | Exemples |
|----------|-------------|---------|
| **P1 — Critique** | Service totalement indisponible ou perte de données | Application inaccessible, corruption de données |
| **P2 — Haute** | Fonctionnalité majeure indisponible | Impossibilité d'émettre des mandats, de valider des engagements |
| **P3 — Modérée** | Fonctionnalité dégradée, contournement possible | Lenteurs, export PDF défaillant |
| **P4 — Basse** | Question, demande d'amélioration | Formation, configuration, nouvelle fonctionnalité |

### 3.2 Délais de réponse et de résolution

| Priorité | Première réponse | Résolution cible (Pro) | Résolution cible (Enterprise) |
|----------|-----------------|------------------------|-------------------------------|
| P1 | 30 minutes | 4 heures | 1 heure |
| P2 | 2 heures | 8 heures ouvrées | 4 heures |
| P3 | 8 heures ouvrées | 3 jours ouvrés | 1 jour ouvré |
| P4 | 2 jours ouvrés | Prochaine version | Planifié |

**Heures ouvrées** : Lundi–Vendredi, 08h00–18h00 (GMT+0, Conakry)  
**Astreinte P1** : 24h/24, 7j/7 (Pro et Enterprise)

### 3.3 Canaux de support

| Canal | Disponibilité | Usage |
|-------|---------------|-------|
| Email : support@lynxa.tech | Heures ouvrées | P3, P4 |
| Email : sre@lynxa.tech | 24h/24 | P1, P2 |
| Téléphone (numéro fourni au contrat) | Heures ouvrées + astreinte P1 | P1 urgent |
| Portail incidents : (URL fournie au contrat) | 24h/24 | Tous |

---

## 4. Pénalités de service

En cas de non-respect des niveaux de disponibilité garantis (hors exclusions), des crédits de service sont accordés automatiquement :

| Disponibilité mensuelle réelle | Crédit accordé |
|--------------------------------|----------------|
| 99,0 % – 99,5 % (Pro) / 99,5 % – 99,9 % (Enterprise) | 5 % de la mensualité |
| 95,0 % – 99,0 % | 10 % de la mensualité |
| 90,0 % – 95,0 % | 25 % de la mensualité |
| < 90,0 % | 50 % de la mensualité |

Les crédits sont déduits de la prochaine facture. Ils ne constituent pas un remboursement en espèces. Le cumul des crédits est plafonné à 50 % d'une mensualité par mois civil.

---

## 5. Obligations du Client

Pour bénéficier du SLA, le Client s'engage à :

1. Maintenir une connexion Internet stable (≥ 1 Mbit/s par utilisateur concurrent recommandé)
2. Utiliser un navigateur supporté (Chrome, Firefox, Edge — version ≤ 24 mois)
3. Signaler tout incident via les canaux officiels dans les 24 heures
4. Conserver les informations d'identification de manière sécurisée
5. Ne pas partager les accès entre utilisateurs (traçabilité OHADA)
6. Effectuer les sauvegardes manuelles recommandées avant toute opération de masse

---

## 6. Exclusions du SLA

Les engagements de disponibilité ne s'appliquent pas :

- Aux maintenances planifiées notifiées 48 heures à l'avance
- Aux incidents causés par des actions du Client (scripts, migrations non autorisées)
- Aux pannes du fournisseur d'accès Internet ou de l'électricité du côté Client
- Aux incidents de force majeure (catastrophes naturelles, conflits, décisions gouvernementales)
- À la période d'essai gratuite (Plan Découverte)
- Aux interruptions inférieures à 5 minutes consécutives

---

## 7. Confidentialité et souveraineté des données

Conformément à la loi guinéenne L/2016/037/AN et aux principes OHADA :

- Les données comptables du Client restent **propriété exclusive du Client**
- LYNXA n'accède aux données qu'avec l'autorisation explicite du Client (support technique)
- Un export complet des données est disponible à tout moment via `scripts/export-tenant-data.sh`
- En cas de résiliation, les données sont exportées et remises au Client, puis supprimées sous 90 jours
- Les données sont hébergées sur AWS eu-west-3 (Paris, France) — voir `docs/SOUVERAINETE.md`

---

## 8. Révision du SLA

Ce SLA est révisable annuellement. Toute modification est notifiée au Client 30 jours à l'avance. Le Client peut résilier sans pénalité si les nouvelles conditions lui sont défavorables.

---

*Document opposable dans le cadre des contrats de souscription GCAP-GN signés avec LYNXA SARL.*  
*Pour toute question : legal@lynxa.tech*
