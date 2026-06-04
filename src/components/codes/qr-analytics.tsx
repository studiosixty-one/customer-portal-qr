import type { ScanStats } from "@/lib/qr/queries";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 truncate capitalize">{r.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScanAnalytics({ stats }: { stats: ScanStats }) {
  const peak = Math.max(1, ...stats.byDay.map((d) => d.count));
  const recentTotal = stats.last30;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total scans" value={stats.total} />
        <Stat label="Last 7 days" value={stats.last7} />
        <Stat label="Last 30 days" value={stats.last30} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Scans (last 30 days)
        </p>
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scans yet. Share or print this code to start collecting data.
          </p>
        ) : (
          <div className="flex h-20 items-end gap-px">
            {stats.byDay.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className="flex-1 rounded-sm bg-primary/70 transition-colors hover:bg-primary"
                style={{ height: `${Math.max(2, (d.count / peak) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <Breakdown
        title="Top devices (last 30 days)"
        rows={stats.topDevices}
        total={recentTotal}
      />
      <Breakdown
        title="Top countries (last 30 days)"
        rows={stats.topCountries}
        total={recentTotal}
      />
    </div>
  );
}
