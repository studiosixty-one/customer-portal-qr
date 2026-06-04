import { z } from "zod";

/**
 * Server-side environment variables, validated once at startup.
 *
 * Import this ONLY from server code (route handlers, server actions,
 * server components, scripts). It references secrets that are not
 * available in the browser.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  // Shared HMAC secret with the CRM for verifying SSO handoff tokens.
  SSO_SHARED_SECRET: z.string().optional(),
  // CRM portal URL (for a "return to portal" link on the sign-in page).
  CRM_PORTAL_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `\n❌ Invalid environment variables:\n${issues}\n\n` +
      `Check your .env.local against .env.example.\n`,
  );
}

export const env = parsed.data;
