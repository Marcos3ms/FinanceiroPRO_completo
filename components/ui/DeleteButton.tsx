"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function DeleteIconButton({
  confirmMessage = "Excluir este item?",
}: {
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Excluir"
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-all hover:bg-brand-red-bg hover:text-brand-red disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
