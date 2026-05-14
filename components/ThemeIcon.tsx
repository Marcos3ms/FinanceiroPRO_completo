"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeIcon({
  size = 18,
  variant = "plain",
}: {
  size?: number;
  variant?: "plain" | "icon-btn";
}) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Moon : Sun;

  const cls =
    variant === "icon-btn"
      ? "icon-btn"
      : "flex items-center rounded-sm p-1 text-fg-muted transition-colors hover:text-fg-primary";

  return (
    <button
      type="button"
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      onClick={toggle}
      className={cls}
    >
      <Icon style={{ width: size, height: size }} />
    </button>
  );
}
