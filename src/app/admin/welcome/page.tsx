import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth/context";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function WelcomePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  if (ctx.org) redirect("/admin");
  if (ctx.isSuperAdmin) redirect("/admin/platform");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">No organization yet</CardTitle>
          <CardDescription>
            You&apos;re not a member of any organization. Please contact your
            administrator to be added to one.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
