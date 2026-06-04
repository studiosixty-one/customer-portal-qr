import { QrCode } from "lucide-react";

import { listCodes } from "@/lib/qr/queries";
import { NewCodeButton } from "@/components/codes/new-code-button";
import { QrCodeListItem } from "@/components/codes/qr-code-list-item";

export default async function AdminHomePage() {
  const codes = await listCodes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR codes</h1>
          <p className="text-muted-foreground">
            Create, customise and track your QR codes.
          </p>
        </div>
        <NewCodeButton />
      </div>

      {codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <QrCode className="size-10 text-muted-foreground" />
          <h2 className="mt-4 font-medium">No codes yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first QR code — static for fixed content, or dynamic for
            an editable link with scan tracking.
          </p>
          <div className="mt-4">
            <NewCodeButton />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <QrCodeListItem
              key={code.id}
              code={{
                id: code.id,
                name: code.name,
                slug: code.slug,
                codeType: code.codeType,
                contentType: code.contentType,
                isActive: code.isActive,
                scanCount: code.scanCount,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
