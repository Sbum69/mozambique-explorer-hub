# Ekaya Explore

> Discover Mozambique, connect with local communities, and travel with more context.

Ekaya Explore is a bilingual tourism platform for discovering destinations, activities,
community experiences, local businesses, and curated itineraries across Mozambique. It brings
travel discovery together with tools for community participation, bookings, route planning, and
verifiable social impact.

The catalogue and user data are backed by Supabase. The interface supports Portuguese and English,
with Portuguese as the default language.

## What the app offers

- Browse destinations and activities, explore them on an interactive map, and find directions when
  verified coordinates are available.
- Discover community-led experiences separately from commercial, bookable activities.
- Explore itineraries and build personal route plans.
- Learn about Mozambican culture and history, and browse travel information, news, and alerts.
- Create an account to save favourites, manage bookings, track visits and route progress, and use
  games, achievements, points, and rewards.
- Give local businesses tools to register and manage their activities; administrators review
  submissions and manage platform content.
- View aggregate platform impact statistics.

### Connectivity

The application uses Supabase for live catalogue, account, booking, and progress data, and external
map tiles for interactive maps. Those features need an internet connection. Although some screens
and content refer to offline travel, this repository does not currently configure a service worker
or an offline cache; do not rely on the app being available offline.

## Technology

| Area | Technology |
| --- | --- |
| Framework | React 19, TanStack Start, TanStack Router |
| Build and development | Vite 7, `@lovable.dev/vite-tanstack-config` |
| Language | TypeScript, strict mode |
| Styling and UI | Tailwind CSS 4, Radix UI, shadcn/ui components |
| Remote data | Supabase (Postgres, Auth, Storage, and RPCs) |
| Server state | TanStack Query |
| Maps | Leaflet and React Leaflet |
| Forms | React Hook Form and Zod |
| Tests and quality | Vitest, ESLint 9, Prettier |
| Deployment target | Cloudflare Workers, configured with `nodejs_compat` |

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) for installing dependencies and running project scripts.
- Access to a Supabase project with the schema, database functions, Storage buckets, and Auth
  settings expected by the application.

### Install and run locally

```sh
bun install
bun run dev
```

Vite prints the local address when the development server is ready. Configure the environment
variables below in the development runtime before using Supabase-backed features.

## Environment variables

Use the Supabase project URL and its **publishable** key for browser and user-authenticated access.
The client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; server-side code also reads
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

| Variable | Where it is used | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser Supabase client | Yes, for browser data |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client; safe to expose as a publishable key | Yes, for browser data |
| `SUPABASE_URL` | Server-side Supabase clients and authenticated server functions | Yes, for server-side Supabase features |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side user-authenticated Supabase access | Yes, for authenticated server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-only admin operations that explicitly use the service-role client | Only where those operations are enabled |
| `VITE_PUBLIC_APP_URL` | Public HTTPS base URL used to build browser-side Auth callback links | Set for a published site |
| `SITE_URL` | Server-side allowlisted site URL used when validating Auth callback redirects | Set for a published site |

For example, the public values have this shape:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
VITE_PUBLIC_APP_URL=https://<your-public-domain>
SITE_URL=https://<your-public-domain>
```

Set secrets in the server or hosting environment, not in source control. **Never** prefix
`SUPABASE_SERVICE_ROLE_KEY` with `VITE_` or expose it to the browser. Auth callback URLs must use
the published HTTPS domain and that URL must also be permitted by the Supabase Auth configuration.

## Available scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Vite development server |
| `bun run build` | Build the application |
| `bun run build:dev` | Build using Vite's development mode |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bunx tsc --noEmit` | Type-check the project |
| `bunx vitest run` | Run the unit tests |
| `bunx prettier --write <file>` | Format a specific file |

Vitest tests live beside domain modules in `src/lib/*.test.ts`. There is currently no `test` script
in `package.json`, so run Vitest with `bunx vitest run`.

## Data and validation

Supabase is the source of truth for live catalogue, account, community, business, booking, route,
and gamification data. The application uses authenticated, row-level-security-aware clients for
user operations; a service-role client is restricted to trusted server-side admin operations.
Private community photos and route/game evidence are served through signed URLs.

Some supporting or legacy content is kept in `src/data/`, but it is not a replacement for verified
catalogue or user data. Do not invent destinations, prices, schedules, contact details, coordinates,
or impact numbers. Missing catalogue information should remain unavailable or explicitly pending
validation. Commercial activities and free community experiences have separate data and booking
rules.

The repository contains the database schema and migration history under `drizzle/` and
`supabase/migrations/`. A working local app also needs a Supabase project configured with the
matching schema, database functions, Storage buckets, and Auth redirect settings; environment
variables alone do not create these resources.

## Repository layout

```text
src/
├── routes/                 TanStack file-based pages
├── components/             Domain UI and shared UI primitives
├── contexts/               Authentication, language, favourites, and notifications
├── hooks/                  Catalogue, routes, preferences, and recommendation hooks
├── lib/                    Domain access, business rules, server functions, and tests
├── data/                   Supporting and legacy static content
├── integrations/supabase/  Supabase clients, middleware, and generated database types
├── assets/                 Local image assets
├── router.tsx              Router and per-router QueryClient
└── start.ts                TanStack Start server middleware

drizzle/                    Drizzle schema and migrations
supabase/migrations/        Supabase migration history
docs/                       Audit and implementation reports
.lovable/plan/              Project plans and audit records
```

`src/routeTree.gen.ts` and files under `src/integrations/supabase/` are generated; do not edit them
directly.

## Quality checks

Before opening a pull request, run the relevant checks:

```sh
bunx tsc --noEmit
bun run lint
bunx vitest run
bun run build
```

Keep user-visible text available in both Portuguese and English. Database-backed changes should
preserve the existing Supabase access patterns and business rules.

## Deployment

The project is configured for Cloudflare Workers in `wrangler.jsonc`, with the TanStack Start server
entry point and the `nodejs_compat` flag. Build with `bun run build` and configure the required
Supabase variables and secrets in the deployment environment. `package.json` does not currently
define a deployment command; follow the deployment process configured for the target Cloudflare
account.

## Documentation

- [Project guidance](./CLAUDE.md) — architecture and development workflow.
- [Domain rules](./AGENTS.md) — business, route, community, booking, and gamification constraints.
- [Audit reports](./docs/) — repository audits and implementation reports.
- [Project roadmap](./roadmap.md) and [fix history](./EKAYA_FIXES.md).

## License

No license file is currently included in this repository. All rights are reserved unless the
project maintainers specify otherwise.
