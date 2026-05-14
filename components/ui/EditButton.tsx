"use client";

import { Pencil } from "lucide-react";
import {
  useModals,
  type EditingPayload,
} from "@/components/modals/ModalsProvider";

export default function EditButton({ payload }: { payload: EditingPayload }) {
  const { openEdit } = useModals();
  return (
    <button
      type="button"
      title="Editar"
      onClick={() => openEdit(payload)}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-all hover:bg-brand-blue-bg hover:text-brand-blue"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}
