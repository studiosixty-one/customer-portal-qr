import { and, count, eq, gte, inArray } from "drizzle-orm";

import { requireOrg } from "@/lib/auth/context";
import { db, qrCodes, qrScans } from "@/lib/db";
import type { QrCodeType, QrContentType } from "@/lib/qr/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CodeListItem = {
  id: string;
  name: string;
  slug: string;
  codeType: QrCodeType;
  contentType: QrContentType;
  isActive: boolean;
  scanCount: number;
  updatedAt: Date;
};

/** All codes in the active org, newest-edited first, with dynamic-code scan counts. */
export async function listCodes(): Promise<CodeListItem[]> {
  const ctx = await requireOrg();
  const codes = await db.query.qrCodes.findMany({
    where: eq(qrCodes.orgId, ctx.org.id),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
  });

  const ids = codes.map((c) => c.id);
  const counts = ids.length
    ? await db
        .select({ codeId: qrScans.codeId, total: count() })
        .from(qrScans)
        .where(inArray(qrScans.codeId, ids))
        .groupBy(qrScans.codeId)
    : [];
  const cm = new Map(counts.map((r) => [r.codeId, Number(r.total)]));

  return codes.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    codeType: c.codeType,
    contentType: c.contentType,
    isActive: c.isActive,
    scanCount: cm.get(c.id) ?? 0,
    updatedAt: c.updatedAt,
  }));
}

export type ScanStats = {
  total: number;
  last7: number;
  last30: number;
  byDay: { date: string; count: number }[]; // last 30 days, ascending
  topDevices: { label: string; count: number }[];
  topCountries: { label: string; count: number }[];
};

/**
 * Scan analytics for one dynamic code. Access must be checked by the caller
 * (the editor page calls requireCodeAccess first). Device/country breakdowns
 * are computed over the last 30 days to bound the query.
 */
export async function getScanStats(codeId: string): Promise<ScanStats> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(qrScans)
    .where(eq(qrScans.codeId, codeId));

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS);
  const since7 = now - 7 * DAY_MS;

  const recent = await db
    .select({
      scannedAt: qrScans.scannedAt,
      deviceType: qrScans.deviceType,
      country: qrScans.country,
    })
    .from(qrScans)
    .where(and(eq(qrScans.codeId, codeId), gte(qrScans.scannedAt, since30)))
    .orderBy(qrScans.scannedAt);

  let last7 = 0;
  const dayCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();

  for (const r of recent) {
    const t = r.scannedAt.getTime();
    if (t >= since7) last7++;
    const day = r.scannedAt.toISOString().slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    const device = r.deviceType || "unknown";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
    const country = r.country || "Unknown";
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
  }

  // Fill the 30-day window so the chart has a continuous axis.
  const byDay: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    byDay.push({ date, count: dayCounts.get(date) ?? 0 });
  }

  const toSorted = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([label, c]) => ({ label, count: c }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  return {
    total: Number(total),
    last7,
    last30: recent.length,
    byDay,
    topDevices: toSorted(deviceCounts),
    topCountries: toSorted(countryCounts),
  };
}
