# AGENTS.md

## Project overview

This repository is a Next.js 16 app for tracking golf rounds, units, players, and courses. The app uses the App Router, TypeScript, and Supabase for authentication and database access.

Primary entry points:
- [README.md](README.md) for the high-level app description
- [app/dashboard/page.tsx](app/dashboard/page.tsx) for the authenticated dashboard flow
- [lib/supabase-server.ts](lib/supabase-server.ts) for server-side Supabase clients
- [lib/actions](lib/actions) for server actions that read and mutate data
- [supabase/config.toml](supabase/config.toml) for local Supabase config

## Commands

Run these from the project root:
- `npm install`
- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run lint` — ESLint checks

## Architecture and conventions

- Use the App Router patterns in [app](app): route segments, server components, and route handlers live under this directory.
- Prefer server actions in [lib/actions](lib/actions) for database writes and reads instead of creating ad hoc fetch logic in components.
- Protect authenticated flows by calling `supabase.auth.getUser()` before reading or writing protected data.
- Reuse the shared Supabase clients in [lib/supabase-server.ts](lib/supabase-server.ts) and [lib/supabase.ts](lib/supabase.ts); do not duplicate browser/server auth setup.
- The app is mobile-first and Spanish-first in UI copy; keep labels, headings, and user messaging consistent with the current app language.
- Use the `@/*` alias for imports inside the app.

## Supabase and auth

The app authenticates through Supabase OAuth and uses the SSR cookie-based client pattern for server requests. Important examples:
- [app/auth/callback/route.ts](app/auth/callback/route.ts) handles the OAuth code exchange
- [lib/actions/courses.ts](lib/actions/courses.ts) and [lib/actions/players.ts](lib/actions/players.ts) show the expected `requireSessionUser()` pattern

Expected environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project-specific guidance for AI agents

- Keep changes scoped to the app’s existing patterns. Do not introduce a different state-management system or server framework.
- When working with data, prefer the existing Supabase query shapes and fallback handling already used in the CRUD actions.
- For new pages or components, match the current design language: rounded cards, slate-based dark mode styling, and simple mobile navigation patterns from [app/components/SiteHeader.tsx](app/components/SiteHeader.tsx).
- Prefer small, local fixes over broad refactors unless the task explicitly calls for architecture work.
- If you need to understand the framework rules for this version, review the local Next.js docs in `node_modules/next/dist/docs/` before making assumptions about APIs.

## Useful references

- [README.md](README.md)
- [app/layout.tsx](app/layout.tsx)
- [app/dashboard/page.tsx](app/dashboard/page.tsx)
- [lib/actions/rounds.ts](lib/actions/rounds.ts)
- [supabase/config.toml](supabase/config.toml)
