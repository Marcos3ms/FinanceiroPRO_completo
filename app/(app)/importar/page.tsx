import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import OfxImporter from "@/components/import/OfxImporter";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Importar extrato - FinanceiroPro" };

export default async function ImportarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, nome")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        eyebrow="Importação"
        title="Importar extrato (OFX)"
        subtitle="Traga os lançamentos do extrato do banco sem digitar."
        actions={<HeaderActions />}
      />

      <section className="px-4 pb-10 pt-2 sm:px-8">
        <div className="max-w-[900px] rounded-lg border border-border bg-bg-card p-6 sm:p-8">
          {(accounts ?? []).length === 0 ? (
            <p className="text-[0.9rem] text-fg-secondary">
              Cadastre uma conta em <strong>Contas</strong> antes de importar um
              extrato.
            </p>
          ) : (
            <OfxImporter accounts={accounts ?? []} />
          )}
          <div className="mt-6 border-t border-border pt-4 text-[0.78rem] text-fg-muted">
            <p className="mb-1 font-semibold text-fg-secondary">Como obter o OFX</p>
            No Internet Banking, exporte o extrato do período no formato{" "}
            <strong>OFX</strong> (também chamado de &quot;Money&quot; ou
            &quot;OFX/Money&quot;). Lançamentos já importados antes são
            reconhecidos e não entram duplicados.
          </div>
        </div>
      </section>
    </>
  );
}
