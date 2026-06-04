"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCodeAccess, requireOrg } from "@/lib/auth/context";
import { db, qrCodes } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type {
  QrCodeType,
  QrContent,
  QrContentType,
  QrDesign,
} from "@/lib/qr/types";

async function uniqueCodeSlug(name: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  for (let i = 0; i < 6; i++) {
    const existing = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${root}-${crypto.randomUUID().slice(0, 6)}`;
  }
  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Create a blank code in the active org and return its id (for routing to the editor). */
export async function createCode(input?: { name?: string }) {
  const ctx = await requireOrg();
  const name = input?.name?.trim() || "Untitled code";
  const slug = await uniqueCodeSlug(name);
  const [code] = await db
    .insert(qrCodes)
    .values({
      orgId: ctx.org.id,
      name,
      slug,
      createdByUserId: ctx.userId,
    })
    .returning();
  revalidatePath("/admin");
  return { id: code.id };
}

export type UpdateCodeInput = {
  name?: string;
  codeType?: QrCodeType;
  contentType?: QrContentType;
  content?: QrContent;
  targetUrl?: string | null;
  design?: QrDesign;
  isActive?: boolean;
};

export async function updateCode(codeId: string, input: UpdateCodeInput) {
  await requireCodeAccess(codeId);
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined)
    patch.name = input.name.trim() || "Untitled code";
  if (input.codeType !== undefined) patch.codeType = input.codeType;
  if (input.contentType !== undefined) patch.contentType = input.contentType;
  if (input.content !== undefined) patch.content = input.content;
  if (input.targetUrl !== undefined) patch.targetUrl = input.targetUrl;
  if (input.design !== undefined) patch.design = input.design;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (Object.keys(patch).length === 0) return;
  await db.update(qrCodes).set(patch).where(eq(qrCodes.id, codeId));
  revalidatePath("/admin");
  revalidatePath(`/admin/codes/${codeId}`);
}

export async function deleteCode(codeId: string) {
  await requireCodeAccess(codeId);
  await db.delete(qrCodes).where(eq(qrCodes.id, codeId)); // cascades scans
  revalidatePath("/admin");
}

export async function duplicateCode(codeId: string) {
  const { ctx, code } = await requireCodeAccess(codeId);
  const name = `${code.name} (copy)`;
  const slug = await uniqueCodeSlug(name);
  const [dup] = await db
    .insert(qrCodes)
    .values({
      orgId: code.orgId,
      name,
      slug,
      codeType: code.codeType,
      contentType: code.contentType,
      content: code.content,
      targetUrl: code.targetUrl,
      design: code.design,
      createdByUserId: ctx.userId,
    })
    .returning();
  revalidatePath("/admin");
  return { id: dup.id };
}
