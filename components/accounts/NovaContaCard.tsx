"use client";

import { Plus } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";

export default function NovaContaCard() {
  const { open } = useModals();
  return (
    <button
      type="button"
      onClick={() => open("nova-conta")}
      className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-accent p-10 transition-all hover:border-fg-muted hover:bg-white/[0.02]"
    >
      <Plus className="h-8 w-8 text-fg-muted" />
      <span className="text-[0.9rem] text-fg-muted">Nova Conta</span>
    </button>
  );
}
