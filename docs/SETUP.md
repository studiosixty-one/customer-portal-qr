# Setup runbook — Studio 61: QR

End-to-end setup for local dev and production. This app uses its **own** Neon
database (never the CRM's or Forms').

## 1. Prerequisites

- Node 20+, pnpm 9+
- A Neon account (https://console.neon.tech)

```bash
pnpm install
```

## 2. Create the database

In Neon, create a **new project/database** for this app. Copy the **pooled**
connection string from *Connection Details*.

## 3. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string for this app's own DB |
| `AUTH_SECRET` | `openssl rand -base64 33` |
| `NEXT_PUBLIC_APP_URL` | No trailing slash. Local: `http://localhost:3000`; prod: `https://qr.your-domain.com` — this is the base for every dynamic code's `/q/[slug]` link, so it must be correct **before** you print codes |
| `SSO_SHARED_SECRET` | **Identical** to the value on the CRM and the Forms app (enables one shared sign-in) |
| `CRM_PORTAL_URL` | Optional — link back to the CRM portal |

## 4. Migrate

```bash
pnpm db:migrate
```

This applies `drizzle/0000_*.sql` (tables: `users`, `organizations`,
`memberships`, `invitations`, `qr_codes`, `qr_scans`).

After editing `src/lib/db/schema.ts` later: `pnpm db:generate` then `pnpm db:migrate`.
Do **not** use `db:push` against production.

## 5. First user

```bash
pnpm create-admin you@example.com "a-strong-password" "Your Name"
pnpm make-super  you@example.com     # optional: see /admin/platform (all orgs/users)
```

`create-admin` also creates a starter organization owned by that user.

## 6. Run

```bash
pnpm dev
# → http://localhost:3000  (redirects to /login)
```

Sign in, create a code, pick **Static** or **Dynamic**, design it, and download
PNG/SVG. For dynamic codes, set a destination URL — the printed code points at
`/q/[slug]`, which you can re-target anytime, and scans show up under Analytics.

## 7. CRM SSO handoff (shared sign-in)

The CRM mints a short-lived HS256 JWT signed with `SSO_SHARED_SECRET` and POSTs
it (form field `token`, optional `next`) to **`/api/sso/handoff`** on this app.
We verify it, JIT-provision a local user + org keyed by the CRM ids, set the
active-org cookie, and sign the user in. The two apps share only the secret —
never a database. (Same contract as the Forms app, so the CRM's existing handoff
just needs this app's URL added.)

**Token payload** (see `src/lib/sso.ts`):

```jsonc
{
  "userId":      "<crm user id>",     // required (or `sub`)
  "companyId":   "<crm company id>",  // required
  "email":       "user@example.com",  // optional
  "name":        "User Name",         // optional
  "companyName": "Acme Ltd"           // optional
}
```

Example landing form on the CRM side:

```html
<form method="POST" action="https://qr.your-domain.com/api/sso/handoff">
  <input type="hidden" name="token" value="{{ signed_jwt }}" />
  <input type="hidden" name="next"  value="/admin" />
</form>
```

Keep the token short-lived (e.g. `exp` ~60s). It's verified with HS256.

## 8. Deploy (Vercel)

1. Import the repo; framework auto-detected (Next.js).
2. Set the same env vars in the Vercel project (Production + Preview):
   `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (the production URL),
   `SSO_SHARED_SECRET`, `CRM_PORTAL_URL`.
3. Deploy, then run migrations against the production DB
   (`DATABASE_URL=<prod> pnpm db:migrate` from your machine, or a deploy step).
4. Create the first prod admin: `DATABASE_URL=<prod> pnpm create-admin …`.
5. Add this app's `/api/sso/handoff` URL to the CRM's SSO config.

> Dynamic-code scan analytics read `x-vercel-ip-country` (Vercel) / `cf-ipcountry`
> (Cloudflare) for a coarse country breakdown. No raw IP addresses are stored.
