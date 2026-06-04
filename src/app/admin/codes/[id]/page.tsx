import { requireCodeAccess } from "@/lib/auth/context";
import { getScanStats } from "@/lib/qr/queries";
import { QrEditor, type EditorCode } from "@/components/codes/qr-editor";

export default async function EditCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { code } = await requireCodeAccess(id);

  const stats =
    code.codeType === "dynamic" ? await getScanStats(code.id) : null;

  const editorCode: EditorCode = {
    id: code.id,
    slug: code.slug,
    name: code.name,
    codeType: code.codeType,
    contentType: code.contentType,
    content: code.content ?? {},
    targetUrl: code.targetUrl,
    design: code.design ?? {},
    isActive: code.isActive,
  };

  return <QrEditor code={editorCode} stats={stats} />;
}
