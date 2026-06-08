# Souveraineté des Données — GCAP-GN

**Version** : 1.0 — Juin 2026  
**Propriétaire** : LYNXA SARL (LynxaTech), Conakry, République de Guinée  
**Applicable à** : Tous les ministères et EPA abonnés à GCAP-GN  
**Cadre légal** : Loi L/2016/037/AN, OHADA, LOLF guinéenne

---

## 1. Hébergement actuel

### Infrastructure

| Composant | Fournisseur | Localisation physique |
|-----------|-------------|-----------------------|
| Base de données (PostgreSQL) | Supabase (AWS RDS) | **AWS eu-west-3 — Paris, France** |
| Authentification (Auth) | Supabase Auth | AWS eu-west-3 — Paris, France |
| Stockage fichiers (PDF, pièces jointes) | Supabase Storage (S3) | AWS eu-west-3 — Paris, France |
| Frontend (application web) | Vercel Edge Network | CDN mondial (PoP le plus proche) |
| Sauvegardes automatiques | Supabase (AWS S3) | AWS eu-west-3 — Paris, France |

### Justification du choix eu-west-3

La région AWS Paris a été choisie pour les raisons suivantes :

1. **RGPD-compatible** : La France est soumise au RGPD européen, l'un des cadres de protection des données les plus stricts au monde, offrant des garanties supérieures à celles des régions africaines actuellement disponibles
2. **Latence acceptable** : Depuis Conakry, la latence vers Paris (≈ 60–90 ms) est comparable ou inférieure aux alternatives africaines disponibles en 2026
3. **Maturité de l'infrastructure** : AWS eu-west-3 offre des certifications (ISO 27001, SOC 2) et une disponibilité (99,99 %) non atteintes par les datacenter guinéens actuels
4. **Absence d'hébergeur guinéen certifié** : Aucun datacenter en Guinée ne dispose à ce jour des certifications et capacités requises pour un SaaS comptable public (OHADA)

### Données sensibles et leur traitement

| Catégorie de données | Contenu | Hébergement | Accès LYNXA |
|----------------------|---------|-------------|-------------|
| Données comptables | Engagements, mandats, recettes | AWS eu-west-3 | Jamais sans accord Client |
| Journal d'audit | Actions utilisateurs, signatures | AWS eu-west-3 | Lecture seule (super_admin) |
| Pièces jointes | Marchés, factures PDF | AWS eu-west-3 | Jamais |
| Données personnelles | Noms, emails des agents | AWS eu-west-3 | Jamais sans accord Client |
| Clés de chiffrement | HMAC-SHA256 | Variables d'env Vercel | Jamais en clair en base |

---

## 2. Cadre légal guinéen applicable

### Loi L/2016/037/AN — Protection des données personnelles

La loi guinéenne sur la cybersécurité et la protection des données personnelles (L/2016/037/AN) impose :

- **Notification** de tout traitement de données personnelles à l'autorité compétente
- **Consentement explicite** pour la collecte et l'utilisation des données
- **Droit d'accès et de rectification** pour les personnes concernées
- **Obligation de sécurité** : mesures techniques et organisationnelles adaptées
- **Localisation préférentielle** : les données de citoyens guinéens devraient idéalement être traitées sur le territoire national ou dans un pays offrant un niveau de protection équivalent

**Conformité GCAP-GN** :
- ✅ Mesures de sécurité : chiffrement AES-256, TLS 1.3, MFA, RLS multi-tenant
- ✅ Droit d'accès : export complet disponible via `scripts/export-tenant-data.sh`
- ✅ Traçabilité : journal d'audit immuable sur toutes les actions
- ⚠️ Localisation : hébergement en France (mesure transitoire — voir roadmap §4)

### OHADA — Droit comptable harmonisé

Le Traité OHADA et l'Acte Uniforme relatif au Droit Comptable exigent :

- **Conservation 10 ans** de tous les documents comptables (livres, pièces justificatives)
- **Intégrité** : les données ne peuvent être altérées rétroactivement
- **Accessibilité** : les données doivent pouvoir être produites à tout contrôle officiel

**Conformité GCAP-GN** :
- ✅ Rétention : politique de 10 ans sur toutes les données comptables (voir `docs/BACKUP.md`)
- ✅ Intégrité : journal d'audit immuable + signatures HMAC-SHA256
- ✅ Accessibilité : export JSON + PDF sur demande, disponible dans les 24 heures

### LOLF guinéenne — Loi Organique relative aux Lois de Finances

GCAP-GN implémente le cycle complet : Engagement → Liquidation → Ordonnancement → Paiement, en conformité avec la séparation des acteurs définie par la LOLF.

---

## 3. Droits du Client sur ses données

Le ministère ou EPA Client est **propriétaire exclusif** de ses données comptables. LYNXA agit en qualité de **sous-traitant** au sens du droit applicable.

| Droit | Modalité d'exercice |
|-------|---------------------|
| **Accès aux données** | Export JSON complet via `scripts/export-tenant-data.sh` à tout moment |
| **Portabilité** | Format JSON standardisé + CSV pour les tableaux principaux |
| **Rectification** | Via l'interface GCAP-GN (traçée dans le journal d'audit) |
| **Suppression** | Sur demande écrite à support@lynxa.tech — sous 90 jours après résiliation |
| **Audit** | Droit d'audit des installations et procédures — sur demande formelle |

---

## 4. Roadmap souveraineté

### Phase 1 (actuelle) — Hébergement France

**Situation** : AWS eu-west-3 Paris, conforme RGPD, latence acceptable  
**Durée** : Jusqu'à disponibilité d'une infrastructure africaine certifiée

### Phase 2 (2027) — Migration vers infrastructure africaine

**Cible** : Migration vers un datacenter africain certifié ISO 27001  
**Candidats identifiés** :
- Rack Centre (Côte d'Ivoire) — ISO 27001 en cours
- Africa Data Centres (Afrique du Sud) — ISO 27001 certifié, latence plus élevée depuis Conakry
- Hébergeur sénégalais (en évaluation)

**Critères de migration** :
1. Certification ISO 27001 ou équivalent
2. SLA ≥ 99,5 % contractualisé
3. PITR disponible sur PostgreSQL managé
4. Latence Conakry → datacenter < 120 ms (P95)
5. Conformité avec la loi L/2016/037/AN

**Impact sur le Client** : Migration transparente, sans interruption de service > 30 minutes, notifiée 90 jours à l'avance.

### Phase 3 (2028+) — Infrastructure nationale guinéenne

**Cible** : Hébergement sur infrastructure nationale si un datacenter guinéen atteint les critères requis  
**Dépendance** : Investissements publics dans l'infrastructure numérique nationale (programme MEFB/MPTN)

---

## 5. Mesures de sécurité en place

| Mesure | Implémentation |
|--------|----------------|
| Chiffrement au repos | AES-256 (Supabase/AWS) |
| Chiffrement en transit | TLS 1.3 obligatoire |
| Authentification forte | MFA TOTP obligatoire (ORDONNATEUR, CF) |
| Isolation des données | RLS PostgreSQL + filtre `tenant_id` frontend |
| Journal d'audit | Immuable, signé HMAC-SHA256, non modifiable |
| Gestion des accès | RBAC 8 niveaux, séparation des fonctions (LOLF) |
| Tests de pénétration | Annuels (plan Enterprise) |
| Analyse de vulnérabilités | Continue (Dependabot, GitHub Security Advisories) |

---

## 6. Contacts et déclarations

| Interlocuteur | Contact |
|---------------|---------|
| Responsable Protection des Données (LYNXA) | dpo@lynxa.tech |
| Direction des Systèmes d'Information — MEFB | (à compléter) |
| Autorité nationale compétente (Guinée) | Ministère de la Communication (MPTN) |

---

*Ce document est mis à jour à chaque changement significatif d'infrastructure ou de cadre légal.*  
*Prochaine révision prévue : Juin 2027*
