import { Lock, Settings as SettingsIcon } from "lucide-react";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import OpenModalButton from "@/components/settings/OpenModalButton";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações - FinanceiroPro" };

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || profile?.username || "Usuário";

  return (
    <>
      <PageHeader title="Configurações" actions={<HeaderActions />} />

      <section className="px-8 pb-8">
        <div className="max-w-[750px] rounded-lg border border-border bg-bg-card p-8">
          <div className="mb-1 flex items-center gap-3 text-[1.4rem] font-bold">
            <SettingsIcon className="text-fg-muted" />
            Configurações
          </div>
          <p className="mb-8 text-[0.9rem] text-fg-secondary">
            Gerencie suas preferências e segurança.
          </p>

          <div className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
            Perfil
          </div>
          <div className="mb-8 flex items-center gap-4 rounded border border-border bg-bg-secondary p-5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-bg-elevated text-2xl">
              🏥
            </div>
            <div className="flex-1">
              <div className="text-[0.95rem] font-semibold">{displayName}</div>
              <div className="text-[0.85rem] text-fg-muted">{user.email}</div>
            </div>
            <OpenModalButton modalKey="editar-perfil">
              Editar Perfil
            </OpenModalButton>
          </div>

          <div className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
            Segurança
          </div>
          <div className="flex items-center gap-4 rounded border border-border bg-bg-secondary p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-bg-elevated text-fg-muted">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[0.95rem] font-semibold">Alterar Senha</div>
              <div className="text-[0.85rem] text-fg-muted">
                Mantenha sua conta protegida com uma senha forte.
              </div>
            </div>
            <OpenModalButton modalKey="alterar-senha">Alterar</OpenModalButton>
          </div>
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          Conta criada em{" "}
          {new Date(user.created_at).toLocaleDateString("pt-BR")}.{" "}
          {profile && (
            <>
              Usuário:{" "}
              <span className="text-fg-secondary">{profile.username}</span>.
            </>
          )}
        </p>
      </section>
    </>
  );
}
