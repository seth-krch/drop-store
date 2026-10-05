# Mystic

Storefront for Mystic, a footwear and apparel brand that releases in numbered
drops. Next.js (App Router) + Postgres via Drizzle.

## Run locally

```bash
cp .env.example .env.local      # set DATABASE_URL
npm install
npm run db:migrate
npm run db:seed                 # deterministic catalog, drops and journal
npm run dev                     # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Reset the catalog to the seed data in `src/db/catalog.ts` |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

## Layout

- `src/app/`: routes (home, shop, products, drops, journal, help, legal, API, sitemap)
- `src/db/`: schema, catalog seed, migration and seed scripts
- `src/lib/store.ts`: all catalog queries
- `src/lib/art.ts`: procedural product images served from `/img/p/<slug>/<view>.svg`
- `src/components/`: header, footer, cards, search, countdown, size picker
