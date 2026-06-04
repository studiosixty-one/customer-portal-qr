import { eq } from "drizzle-orm";

import { db, qrCodes, qrScans } from "@/lib/db";

// Never cache the redirect: every scan must be logged and target edits must
// take effect immediately.
export const dynamic = "force-dynamic";

function deviceFromUA(ua: string): string {
  const s = ua.toLowerCase();
  if (!s) return "unknown";
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s))
    return "mobile";
  return "desktop";
}

function safeRedirectUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const code = await db.query.qrCodes.findFirst({
    where: eq(qrCodes.slug, slug),
    columns: { id: true, codeType: true, isActive: true, targetUrl: true },
  });

  const target =
    code && code.codeType === "dynamic" && code.isActive
      ? safeRedirectUrl(code.targetUrl)
      : null;

  if (!code || !target) {
    return new Response("This QR code link is not available.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Best-effort scan logging — never block the redirect on a write failure.
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const referer = req.headers.get("referer");
    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;
    await db.insert(qrScans).values({
      codeId: code.id,
      userAgent: ua || null,
      referer: referer || null,
      country: country || null,
      deviceType: deviceFromUA(ua),
    });
  } catch {
    // Swallow — analytics must never break the redirect.
  }

  return new Response(null, {
    status: 302,
    headers: { Location: target, "cache-control": "no-store" },
  });
}
