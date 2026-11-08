# WebZaura

WebZaura's public website and private CRM, built with TanStack Start, React, TypeScript, Tailwind CSS, Vite, Nitro, and Supabase.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project, configured as described in [SETUP.md](SETUP.md)

## Install

```sh
npm install
```

## Environment

Create `.env` from `.env.example` and fill in the values:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are sent to the browser.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Set `SITE_URL` to the public production URL.
- Set `ADMIN_BOOTSTRAP_PASSWORD` for the initial admin bootstrap.
- Set the remaining variables from `.env.example` when using cron jobs or database migration tooling.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. See [SETUP.md](SETUP.md) for the full Supabase and deployment setup.

## Run

```sh
npm run dev
```

The development server runs at <http://localhost:8080>.

## Checks

```sh
npx tsc --noEmit
npm test
npm run build
```

## Build

```sh
npm run build
```

The production build is emitted for Vercel in `.vercel/output`. Deploy through Vercel after setting the environment variables described in [SETUP.md](SETUP.md).

## Project structure

- `src/routes` - application routes
- `src/components` - shared layout and section components
- `src/data` - typed site content
- `src/integrations/supabase` - Supabase client and auth helpers
- `src/lib` - server functions and shared utilities
- `drizzle` - database schema and migrations
- `supabase` - Supabase configuration and seed data
- `public` - static assets
