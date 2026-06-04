# Studio 61: QR

A multi-tenant QR code generator — static codes (URL, text, email, phone, SMS,
Wi-Fi, vCard, location) and **dynamic** codes (an editable short link with scan
tracking and analytics). Codes are designed with colors, dot/corner styles,
gradients and logos, and exported as PNG or SVG.

It shares its auth architecture with the **SCA Form Builder** and the **CRM**:
one sign-in across all three via the CRM's signed-token SSO handoff. Each app
keeps its **own** database.

## Stack

- **Next.js 15** (App Router, Turbopack) · React 19
- **Auth.js v5** (split edge/node config; Credentials + CRM-SSO providers; JWT sessions)
- **Drizzle ORM** + **Neon** Postgres (`casing: "snake_case"`)
- **Tailwind v4** + **shadcn/ui** (radix-nova, neutral, lucide)
- **qr-code-styling** for the designer/export
- Deploys on **Vercel**

## How it works

- **Auth** — `src/auth.config.ts` (edge-safe) + `src/auth.ts` (Node: DB + bcrypt).
  Middleware protects `/admin/*`; server-side guards live in `src/lib/auth/context.ts`
  (`requireOrg`, `requireSuperAdmin`, `requireCodeAccess`, …).
- **Tenancy** — every code belongs to an `organization`; users join orgs via
  `memberships`. Super-admins manage all orgs/users under `/admin/platform`.
- **SSO** — the CRM mints a short-lived HS256 token (shared `SSO_SHARED_SECRET`)
  and POSTs it to `/api/sso/handoff`, which JIT-provisions a user + org and signs in.
- **Static codes** encode their payload directly (`src/lib/qr/encode.ts`).
- **Dynamic codes** encode `/q/[slug]`; that route logs a scan and 302-redirects
  to the (editable) destination — see `src/app/q/[slug]/route.ts`.

## Project layout

```
src/
  auth.config.ts, auth.ts, middleware.ts   # Auth.js v5
  app/
    admin/                 # protected app: codes list, editor, members, platform
    admin/codes/[id]/      # the QR designer
    q/[slug]/              # dynamic redirect + scan logging
    api/auth, api/sso      # auth handlers + SSO landing
    login/, invite/        # auth UI
  components/
    codes/                 # qr-editor, qr-preview, qr-analytics, list, new-code
    shell/, members/, platform/, ui/, auth/
  lib/
    db/ (schema, client), auth/ (context, actions), org/, members/, platform/
    qr/ (types, encode, actions, queries), sso.ts, env.ts, public-url.ts, slug.ts
scripts/   create-admin.ts, make-super.ts
drizzle/   generated migrations
```

## Quick start

See **[docs/SETUP.md](docs/SETUP.md)** for the full runbook. In short:

```bash
pnpm install
cp .env.example .env.local      # fill DATABASE_URL, AUTH_SECRET, SSO_SHARED_SECRET
pnpm db:migrate
pnpm create-admin you@example.com "a-strong-password" "Your Name"
pnpm make-super  you@example.com        # optional: platform super-admin
pnpm dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js dev / production build / serve |
| `pnpm typecheck` / `lint` | `tsc --noEmit` / ESLint |
| `pnpm db:generate` / `db:migrate` | generate SQL from schema / apply migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm create-admin <email> <pw> [name] [org]` | create a password admin (+ org) |
| `pnpm make-super <email> [true\|false]` | toggle platform super-admin |

> **Never** run `pnpm db:push` against production — always `db:generate` + `db:migrate`.
