import Script from "next/script";

import { requireContext } from "@/lib/auth/context";
import { env } from "@/lib/env";
import { AppTopbar } from "@/components/shell/app-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is enforced by middleware + here; org-scoped pages additionally call
  // requireOrg(). Users with no org see the topbar's org switcher empty state.
  const ctx = await requireContext();

  return (
    <div className="min-h-screen bg-muted/20">
      <AppTopbar
        user={{ name: ctx.name, email: ctx.email }}
        memberships={ctx.switchableOrgs.map((o) => ({
          id: o.id,
          name: o.name,
          role: ctx.memberships.find((m) => m.org.id === o.id)?.role ?? null,
        }))}
        activeOrgId={ctx.org?.id ?? null}
        isSuperAdmin={ctx.isSuperAdmin}
        crmPortalUrl={env.CRM_PORTAL_URL ?? null}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      {/* Studio 61 app switcher — a single iframe pointing at the portal, which
          renders the launcher, decides which apps this customer can see, and
          handles its own sign-in. No remote script runs in our origin. */}
      <Script id="s61-app-switcher" strategy="afterInteractive">{`
(function () {
  var PORTAL = "https://client.studiosixty-one.com";
  var f = document.createElement("iframe");
  f.src = PORTAL + "/app-switcher?from=" + encodeURIComponent(location.host);
  f.title = "Studio 61 app switcher";
  f.style.cssText =
    "position:fixed;left:12px;bottom:12px;width:64px;height:64px;border:0;" +
    "background:transparent;z-index:2147483000;" +
    "transition:width .15s ease,height .15s ease";
  document.body.appendChild(f);
  window.addEventListener("message", function (e) {
    // Only the portal may resize its own frame.
    if (e.origin !== PORTAL) return;
    var d = e.data;
    if (!d || d.type !== "s61-switcher") return;
    // Clamp: an unbounded frame could be used to cover this app's UI.
    f.style.width = Math.min(Number(d.width) || 64, 420) + "px";
    f.style.height = Math.min(Number(d.height) || 64, 640) + "px";
  });
})();
      `}</Script>
    </div>
  );
}
