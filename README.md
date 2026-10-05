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
| `npm run db:seed` | Reset the catalog to the seed data in `src/db/catalog.ts` (also clears orders, bags and queues) |
| `npm run drop:schedule -- <drop> <minutes> [--reset]` | Move a drop's start time for testing; `--reset` clears its queue and restocks it |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

## Layout

- `src/app/`: routes (home, shop, products, drops and waiting room, journal, help, legal, account, bag, checkout, API, sitemap)
- `src/db/`: schema, catalog seed, migration and seed scripts
- `src/lib/store.ts`: all catalog queries
- `src/lib/auth.ts`, `codes.ts`, `crypto.ts`: sessions, email codes, password hashing and signed cookies
- `src/lib/queue.ts`, `queue-math.ts`: drop waiting room, random line order, admission waves and shopping passes
- `src/lib/bag.ts`: bag queries and shipping
- `src/lib/art.ts`: procedural product images served from `/img/p/<slug>/<view>.svg`
- `src/components/`: header, footer, cards, search, countdown, size picker

## Accounts and email

Signing up sends a 6-digit code to confirm the email address. With no
`RESEND_API_KEY` set, emails go to the `outbox` table and the server log
instead, so codes can be read locally with:

```bash
psql "$DATABASE_URL" -c 'select "to", subject from outbox order by id desc limit 5'
```

Checkout is a demo: only the test card `4242 4242 4242 4242` is accepted, and
no payment is taken.
