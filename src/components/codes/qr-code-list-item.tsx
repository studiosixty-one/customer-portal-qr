"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Files,
  Link2,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { deleteCode, duplicateCode } from "@/lib/qr/actions";
import { publicCodeUrl } from "@/lib/public-url";
import { CONTENT_TYPE_LABELS, type QrCodeType, type QrContentType } from "@/lib/qr/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  code: {
    id: string;
    name: string;
    slug: string;
    codeType: QrCodeType;
    contentType: QrContentType;
    isActive: boolean;
    scanCount: number;
  };
};

export function QrCodeListItem({ code }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDynamic = code.codeType === "dynamic";
  const shortUrl = publicCodeUrl(code.slug);

  async function copyLink() {
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Short link copied");
  }

  function onDuplicate() {
    startTransition(async () => {
      try {
        const { id } = await duplicateCode(code.id);
        toast.success("Code duplicated");
        router.push(`/admin/codes/${id}`);
      } catch {
        toast.error("Couldn't duplicate the code");
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteCode(code.id);
        toast.success("Code deleted");
        setDeleteOpen(false);
      } catch {
        toast.error("Couldn't delete the code");
      }
    });
  }

  return (
    <Card className="flex flex-row items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/codes/${code.id}`}
            className="truncate font-medium hover:underline"
          >
            {code.name}
          </Link>
          <Badge variant={isDynamic ? "default" : "secondary"}>
            {isDynamic ? "Dynamic" : "Static"}
          </Badge>
          {isDynamic && !code.isActive && (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {isDynamic ? (
            <>
              {code.scanCount} scan{code.scanCount === 1 ? "" : "s"}
              {" · "}
              <span className="font-mono">/q/{code.slug}</span>
            </>
          ) : (
            CONTENT_TYPE_LABELS[code.contentType]
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/codes/${code.id}`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isDynamic && (
              <>
                <DropdownMenuItem onClick={copyLink}>
                  <Link2 className="size-4" />
                  Copy short link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Open link
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Files className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{code.name}”?</DialogTitle>
            <DialogDescription>
              This permanently deletes the QR code
              {isDynamic ? " and all its scan history" : ""}. This can&apos;t be
              undone. Any printed codes will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onDelete} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
