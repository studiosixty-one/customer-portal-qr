"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createCode } from "@/lib/qr/actions";
import { Button } from "@/components/ui/button";

export function NewCodeButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const { id } = await createCode();
        router.push(`/admin/codes/${id}`);
      } catch {
        toast.error("Couldn't create a new code");
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      New code
    </Button>
  );
}
