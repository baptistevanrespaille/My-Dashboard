# MyDashboard — Architecture

## Stack

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js (App Router) | 14 |
| Langage | TypeScript | 5 |
| Styles | Tailwind CSS | 3 |
| Composants UI | shadcn/ui | latest |
| Graphiques | Recharts | latest |
| ORM | Prisma | latest |
| Base de données | Supabase (PostgreSQL) | latest |
| PWA | next-pwa | latest |
| Validation | Zod + react-hook-form | latest |

## Structure des dossiers

```
Dashboard/
├── app/                        # App Router Next.js
│   ├── layout.tsx              # Layout racine (metadata, viewport PWA)
│   ├── page.tsx                # Page d'accueil / dashboard principal
│   ├── globals.css             # Styles globaux + variables Tailwind/shadcn
│   └── [feature]/              # Un dossier par feature (habit, mood, finance…)
│       ├── page.tsx
│       └── _components/        # Composants privés à cette route
├── components/
│   ├── ui/                     # Composants shadcn/ui (générés, ne pas éditer)
│   └── [nom].tsx               # Composants partagés de l'app
├── lib/
│   ├── prisma.ts               # Singleton PrismaClient
│   ├── supabase.ts             # Clients Supabase (public + service role)
│   └── utils.ts                # Helpers (cn, formatters, etc.)
├── prisma/
│   └── schema.prisma           # Schéma de base de données
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # Icônes PWA (192x192, 512x512)
└── .env                        # Variables d'environnement (non committé)
```

## Conventions de code

### Nommage
- **Fichiers composants** : PascalCase (`HabitCard.tsx`)
- **Fichiers utilitaires** : kebab-case (`format-date.ts`)
- **Variables / fonctions** : camelCase
- **Types / interfaces** : PascalCase, préfixe `T` pour les types, pas de préfixe pour les interfaces

### Composants
- Un composant par fichier
- Props typées avec une interface locale au fichier
- Les composants de page sont dans `app/[route]/page.tsx`
- Les composants privés à une route sont dans `app/[route]/_components/`
- Les composants partagés entre routes sont dans `components/`

### Data fetching
- **Server Components** par défaut — les données sont fetchées côté serveur via Prisma
- **Client Components** (`"use client"`) uniquement pour l'interactivité (formulaires, animations)
- Les appels API externes passent par des **Route Handlers** dans `app/api/`

### Base de données
- Toutes les mutations passent par des **Server Actions** ou des **Route Handlers**
- Le client Prisma est toujours importé depuis `@/lib/prisma`
- Chaque nouvelle feature ajoute ses modèles dans `prisma/schema.prisma` avec une migration

### Styling
- **Mobile-first** : on écrit d'abord pour mobile, on ajoute `md:` / `lg:` pour le desktop
- Les couleurs et espacements utilisent les tokens Tailwind (pas de valeurs arbitraires sauf exception)
- Le thème (couleurs, radius, fonts) est défini dans `app/globals.css` via les variables CSS shadcn

### Variables d'environnement
- `NEXT_PUBLIC_*` : accessibles côté client (Supabase URL, anon key)
- Sans préfixe : serveur uniquement (service role key, DATABASE_URL)
- Toujours documenter une nouvelle variable dans `.env` (avec valeur placeholder)

## PWA

- `public/manifest.json` : définit le nom, les couleurs et les icônes
- `next-pwa` génère le service worker automatiquement au build
- Le service worker est désactivé en développement (`disable: NODE_ENV === 'development'`)
- Viewport configuré pour iPhone : `viewport-fit=cover`, `maximum-scale=1`, `user-scalable=no`
- `apple-mobile-web-app-capable` activé dans le layout pour l'installation iOS

## Environnement requis

Copier `.env` et renseigner :
1. `DATABASE_URL` + `DIRECT_URL` : depuis Supabase > Settings > Database
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` : depuis Supabase > Settings > API
3. `SUPABASE_SERVICE_ROLE_KEY` : depuis Supabase > Settings > API (secret, serveur uniquement)
