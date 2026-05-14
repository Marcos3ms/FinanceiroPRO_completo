"use client";

import { Printer } from "lucide-react";

export default function PrintNowButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-blue"
    >
      <Printer className="h-4 w-4" /> Imprimir
    </button>
  );
}
