import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import NovaContaCard from "@/components/accounts/NovaContaCard";
import { DeleteIconButton } from "@/components/ui/DeleteButton";
import EditButton from "@/components/ui/EditButton";
import { createClient } from "@/lib/supabase/server";
import { deleteAccountAction } from "@/features/accounts/actions";

export const metadata = { title: "Contas - FinanceiroPro" };

export default async function ContasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, nome, banco, agencia, conta")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        title="Contas"
        subtitle="Gerencie suas contas e meios de pagamento."
        actions={<HeaderActions />}
      />

      <section className="px-4 pb-8 sm:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
          <NovaContaCard />

          {(accounts ?? []).map((acc) => (
            <div
              key={acc.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-bg-card p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-brand-blue-bg text-brand-blue">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                  <EditButton payload={{ kind: "conta", row: acc }} />
                  <form action={deleteAccountAction}>
                    <input type="hidden" name="id" value={acc.id} />
                    <DeleteIconButton
                      confirmMessage={`Excluir a conta "${acc.nome}"?`}
                    />
                  </form>
                </div>
              </div>
              <div>
                <div className="text-[1rem] font-semibold text-fg-primary">
                  {acc.nome}
                </div>
                {acc.banco && (
                  <div className="text-[0.85rem] text-fg-secondary">
                    {acc.banco}
                  </div>
                )}
              </div>
              {(acc.agencia || acc.conta) && (
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-fg-muted">
                  {acc.agencia && (
                    <span>
                      Ag.{" "}
                      <span className="text-fg-secondary">{acc.agencia}</span>
                    </span>
                  )}
                  {acc.conta && (
                    <span>
                      Cc.{" "}
                      <span className="text-fg-secondary">{acc.conta}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
