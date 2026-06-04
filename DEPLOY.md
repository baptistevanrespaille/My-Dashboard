# MyDashboard — Guide de déploiement Vercel

## Prérequis

- Compte Vercel (vercel.com)
- Projet Supabase actif avec les tables créées (`prisma migrate deploy`)
- Dépôt Git (GitHub / GitLab / Bitbucket)

---

## 1. Préparer la base de données

Les migrations sont déjà appliquées. Pour un nouveau déploiement :

```bash
# Appliquer les migrations (sans reset)
npx prisma migrate deploy

# Seeder les données de démo (optionnel)
npm run db:seed
```

---

## 2. Variables d'environnement Vercel

Dans **Vercel Dashboard → Project → Settings → Environment Variables**, ajoute :

| Variable | Valeur | Environnements |
|----------|--------|---------------|
| `DATABASE_URL` | `postgresql://postgres.xxx:password@pooler.supabase.com:6543/postgres?pgbouncer=true` | Production, Preview |
| `DIRECT_URL` | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Tous |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Tous |
| `WEBHOOK_SECRET` | `mydashboard2024` | Tous |

> ⚠️ `DATABASE_URL` avec `?pgbouncer=true` pour le connection pooling en serverless
> ⚠️ `DIRECT_URL` sans pooler pour les migrations Prisma

---

## 3. Déployer sur Vercel

### Option A — Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option B — Via interface web

1. Importe le dépôt sur vercel.com/new
2. Framework : **Next.js** (détecté automatiquement)
3. Root Directory : `.`
4. Build Command : `npm run build` (défaut)
5. Install Command : `npm install` (défaut — `postinstall` lancera `prisma generate`)
6. Clique **Deploy**

---

## 4. Configuration post-déploiement

### Icônes PWA

Place tes icônes dans `public/icons/` avant de déployer :
- `icon-192x192.png` (192×192 px)
- `icon-512x512.png` (512×512 px)

Des icônes placeholder SVG sont fournies dans `public/icons/`.

### Domaine personnalisé

Vercel Dashboard → Domains → Add Domain

### PWA sur iPhone

Une fois déployé sur HTTPS :
1. Ouvre l'app dans Safari
2. Partager → "Sur l'écran d'accueil"
3. L'app s'installe comme une app native

---

## 5. Mettre à jour l'app

```bash
git push origin main
# Vercel redéploie automatiquement
```

Pour les changements de schéma DB :
```bash
npx prisma migrate dev --name description_du_changement
git add prisma/migrations/
git commit -m "feat: update db schema"
git push
```

Puis dans Vercel, ajouter un **Build Hook** ou lancer manuellement `prisma migrate deploy`.

---

## 6. Surveillance

- **Logs** : Vercel Dashboard → Deployments → Functions Logs
- **DB** : Supabase Dashboard → Database → Tables
- **Prisma Studio** : `npm run db:studio` (local uniquement)

---

## Checklist pré-déploiement

- [ ] `npm run build` passe sans erreur
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Migrations appliquées sur la DB de production
- [ ] Icônes PWA présentes dans `public/icons/`
- [ ] `.env` dans le `.gitignore` (ne jamais committer les secrets)
