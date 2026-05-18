"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export default function MonthFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const goTo = (mes: string) => {
    const target = mes ? `${pathname}?mes=${mes}` : pathname;
    start(() => router.replace(target));
  };

  return (
    <input
      type="month"
      value={value}
      disabled={pending}
      onChange={(e) => goTo(e.target.value)}
      className="form-input max-w-[180px] disabled:opacity-60"
      aria-label="Selecionar mês"
    />
  );
}
