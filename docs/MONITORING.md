# GCAP-GN — Guide de monitoring

## Endpoint health-check

| Paramètre | Valeur |
|-----------|--------|
| URL production | `https://gcap-gn.vercel.app/health` |
| URL staging | `https://gcap-gn-staging.vercel.app/health` |
| URL local | `http://localhost:5173/health` |
| Méthode | `GET` |
| Authentification | Aucune — accès public |
| Rafraîchissement auto | Toutes les 30 secondes (interface navigateur) |

---

## Format de réponse

### Statut nominal

```json
{
  "status": "ok",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "version": "1.0.0",
  "env": "production",
  "checks": {
    "supabase": { "status": "ok", "latency_ms": 45 },
    "auth":     { "status": "ok" },
    "database": { "status": "ok", "migrations_applied": 13 }
  }
}
```

### Statut dégradé

```json
{
  "status": "degraded",
  "timestamp": "...",
  "checks": {
    "supabase": { "status": "ok", "latency_ms": 320 },
    "auth":     { "status": "error", "message": "Auth timeout" },
    "database": { "status": "ok", "migrations_applied": 13 }
  }
}
```

### Statut erreur

```json
{
  "status": "error",
  "checks": {
    "supabase": { "status": "error", "message": "Connection refused" }
  }
}
```

---

## Interprétation des statuts

| Statut | Signification | Action |
|--------|--------------|--------|
| `ok` | Tous les services répondent normalement | Aucune |
| `degraded` | Un service répond mais avec dégradation | Surveiller, investiguer |
| `error` | Un service est inaccessible | Alerte immédiate |

### Seuils de latence Supabase

| Latence | Niveau | Interprétation |
|---------|--------|----------------|
| < 100 ms | Normal | Connexion excellente |
| 100–300 ms | Attention | Latence réseau élevée |
| 300–500 ms | Avertissement | Possible surcharge |
| > 500 ms | Critique | Investiguer immédiatement |

---

## Configuration UptimeRobot

1. Se connecter sur [uptimerobot.com](https://uptimerobot.com)
2. **New Monitor** → Type : **HTTP(s)**
3. Friendly Name : `GCAP-GN Production`
4. URL : `https://gcap-gn.vercel.app/health`
5. Monitoring Interval : **5 minutes**
6. Keyword : `"status":"ok"` (Monitor type : Keyword)
7. Alert Contact : email de l'équipe LYNXA SARL

---

## Configuration Better Uptime

```
URL     : https://gcap-gn.vercel.app/health
Method  : GET
Interval: 3 minutes
Regions : Europe (Frankfurt), Afrique de l'Ouest (Lagos)
Expected: HTTP 200 + body contains "status":"ok"
Escalation: 2 minutes avant alerte SMS
```

---

## Alertes recommandées

| Condition | Sévérité | Délai | Destinataire |
|-----------|----------|-------|-------------|
| `status != "ok"` pendant 5 min | Critique | Immédiat | Équipe LYNXA |
| Latence Supabase > 500 ms | Avertissement | 10 min | Équipe LYNXA |
| HTTP 5xx | Critique | Immédiat | Équipe LYNXA |
| Vercel deployment failed | Critique | Immédiat | DevOps LYNXA |

---

## Procédure d'incident

1. **Détection** : alerte monitoring ou signalement utilisateur
2. **Vérifier** : ouvrir `https://gcap-gn.vercel.app/health` → identifier le check défaillant
3. **Supabase down** → vérifier [status.supabase.com](https://status.supabase.com)
4. **Vercel down** → vérifier [vercel-status.com](https://www.vercel-status.com)
5. **Rollback Vercel** : Dashboard Vercel → Deployments → Re-deploy version précédente
6. **Informer** : notifier les administrateurs ministériels via email

---

## Contacts support

| Rôle | Contact |
|------|---------|
| Support LYNXA SARL | support@lynxatech.com |
| Urgences techniques | +224 XXX XXX XXX |
| Supabase Support | [supabase.com/support](https://supabase.com/support) |
| Vercel Support | [vercel.com/support](https://vercel.com/support) |
