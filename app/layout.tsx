import type { Metadata } from "next";
import { ThemeProvider, themeBootScript } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinanceiroPro",
  description:
    "FinanceiroPro - Gerenciador financeiro para pequenas empresas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
