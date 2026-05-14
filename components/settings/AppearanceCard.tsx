"use client";

import { Moon, Sun } from "lucide-react";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { useTheme } from "@/components/ThemeProvider";

export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  const Icon = dark ? Moon : Sun;
  return (
    <div className="mb-8 flex items-center justify-between rounded border border-border bg-bg-secondary p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-bg-elevated text-fg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[0.95rem] font-semibold">Modo Escuro</div>
          <div className="text-[0.85rem] text-fg-muted">
            {dark
              ? "Ativado — interface em tema escuro."
              : "Desativado — interface em tema claro."}
          </div>
        </div>
      </div>
      <ToggleSwitch
        on={dark}
        onChange={(on) => setTheme(on ? "dark" : "light")}
        ariaLabel="Alternar modo escuro"
      />
    </div>
  );
}
