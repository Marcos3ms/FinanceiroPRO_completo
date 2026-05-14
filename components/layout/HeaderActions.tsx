"use client";

import { Calendar, Plus, Printer } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import ThemeIcon from "@/components/ThemeIcon";

export default function HeaderActions() {
  const { open } = useModals();

  return (
    <>
      <ThemeIcon variant="icon-btn" />
      <button
        type="button"
        title="Imprimir"
        className="icon-btn"
        onClick={() => window.print()}
      >
        <Printer className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        className="btn btn-green"
        onClick={() => open("nova-receita")}
      >
        <Plus className="h-4 w-4" /> Nova Receita
      </button>
      <button
        type="button"
        className="btn btn-red"
        onClick={() => open("nova-despesa")}
      >
        <Plus className="h-4 w-4" /> Nova Despesa
      </button>
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => open("agendar")}
      >
        <Calendar className="h-4 w-4" /> Agendar
      </button>
    </>
  );
}
