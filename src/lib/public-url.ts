/**
 * Build the absolute public URL for a dynamic QR code's short link.
 *
 * Prefers the configured canonical URL (NEXT_PUBLIC_APP_URL) so printed codes
 * resolve consistently regardless of which admin host you're on. But if that
 * value is missing OR a localhost placeholder while the app is actually served
 * from a real domain, fall back to the live origin — so links are never
 * accidentally "localhost" in production.
 */
const isLocal = (u: string) => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u);

export function publicBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (origin && (!configured || isLocal(configured))) return origin;
  return configured || origin;
}

/** The short link encoded by a dynamic QR code; /q/[slug] logs a scan and redirects. */
export function publicCodeUrl(slug: string): string {
  return `${publicBaseUrl()}/q/${slug}`;
}
