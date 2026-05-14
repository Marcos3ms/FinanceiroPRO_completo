"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Wallet,
  CircleArrowUp,
  CircleArrowDown,
  BarChart3,
  Calendar,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import ThemeIcon from "@/components/ThemeIcon";

type Profile = {
  full_name: string | null;
  username: string | null;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutGrid },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/receitas", label: "Receitas", icon: CircleArrowUp },
  { href: "/despesas", label: "Despesas", icon: CircleArrowDown },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const displayName = profile?.full_name || profile?.username || email;
  const initial = (displayName ?? "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded border border-border bg-bg-card text-fg-muted md:hidden print:hidden"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-bg-overlay md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-sidebar flex-col border-r border-border bg-bg-secondary transition-transform md:translate-x-0 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
          <span className="text-[1.15rem] font-bold tracking-tight text-brand-green">
            FinanceiroPro
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeIcon />
            <button
              type="button"
              title="Fechar menu"
              onClick={() => setOpen(false)}
              className="flex items-center rounded-sm p-1 text-fg-muted transition-colors hover:text-fg-primary md:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded px-4 py-3 text-[0.925rem] font-medium transition-all ${
                  active
                    ? "bg-brand-blue text-white shadow-blue-glow"
                    : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-fg-primary">
              {displayName}
            </div>
            <div className="truncate text-xs text-fg-muted">{email}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="flex items-center p-1 text-fg-muted transition-colors hover:text-brand-red"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
