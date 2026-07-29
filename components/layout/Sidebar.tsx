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
  Upload,
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
  { href: "/importar", label: "Importar OFX", icon: Upload },
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
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-bg-card text-fg-muted md:hidden print:hidden"
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
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[1.05rem] font-semibold tracking-tight text-fg-primary">
              Financeiro
            </span>
            <span className="font-display text-[1.05rem] font-semibold tracking-tight text-accent">
              Pro
            </span>
          </div>
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

        <div className="eyebrow px-5 pb-2">Navegação</div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-[0.875rem] font-medium transition-colors ${
                  active
                    ? "bg-accent-bg text-accent before:absolute before:inset-y-1.5 before:left-0 before:w-[2px] before:bg-accent"
                    : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary"
                }`}
              >
                <Icon
                  className="h-[18px] w-[18px] flex-shrink-0"
                  strokeWidth={active ? 2 : 1.5}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-accent text-sm font-semibold text-accent-ink">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.85rem] font-medium text-fg-primary">
              {displayName}
            </div>
            <div className="num-mono truncate text-[0.7rem] text-fg-muted">
              {email}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="flex items-center p-1 text-fg-muted transition-colors hover:text-debit"
            >
              <LogOut className="h-[17px] w-[17px]" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
