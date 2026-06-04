import { count } from "drizzle-orm";

import { db, qrCodes, users } from "@/lib/db";

export async function listPlatformOrgs() {
  const orgs = await db.query.organizations.findMany({
    with: {
      memberships: {
        with: { user: { columns: { id: true, name: true, email: true } } },
      },
    },
    orderBy: (o, { asc }) => [asc(o.name)],
  });

  const codeCounts = await db
    .select({ orgId: qrCodes.orgId, total: count() })
    .from(qrCodes)
    .groupBy(qrCodes.orgId);
  const cc = new Map(codeCounts.map((r) => [r.orgId, Number(r.total)]));

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    codeCount: cc.get(o.id) ?? 0,
    members: o.memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
  }));
}

export async function listPlatformUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .orderBy(users.email);
}
