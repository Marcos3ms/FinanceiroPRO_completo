import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PrintNowButton from "@/components/capa/PrintNowButton";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/features/common/types";

export const metadata = { title: "Capa de Despesa - FinanceiroPro" };

function Field({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <>
      <dt className="self-center text-[0.75rem] font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </dt>
      <dd
        className={
          highlight
            ? "text-xl font-bold text-brand-red"
            : "text-[0.95rem] text-fg-primary"
        }
      >
        {value}
      </dd>
    </>
  );
}

export default async function CapaDespesaPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, descricao, valor, data, categoria, accounts(nome)",
      )
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("company_name, cnpj")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!row || row.type !== "despesa") notFound();

  const accountName = Array.isArray(row.accounts)
    ? (row.accounts[0]?.nome ?? "—")
    : ((row.accounts as { nome: string } | null)?.nome ?? "—");

  const issuedAt = new Date();

  return (
    <main className="min-h-screen px-6 py-8 print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="no-print mb-6 flex items-center justify-between">
          <Link href="/despesas" className="btn btn-outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <PrintNowButton />
        </div>

        <article className="rounded-lg border border-border bg-bg-card p-10 shadow-card print:rounded-none print:shadow-none">
          <header className="mb-8 border-b border-border pb-6 text-center">
            {profile?.company_name ? (
              <h1 className="text-2xl font-bold uppercase tracking-wider text-brand-blue">
                {profile.company_name}
              </h1>
            ) : (
              <h1 className="text-xl font-semibold text-fg-muted">
                Empresa não cadastrada
              </h1>
            )}
            {profile?.cnpj ? (
              <p className="mt-1 text-[0.9rem] font-semibold uppercase tracking-wider text-brand-blue">
                CNPJ: {profile.cnpj}
              </p>
            ) : (
              <p className="no-print mt-1 text-[0.85rem] text-fg-muted">
                Cadastre o CNPJ na aba Relatórios.
              </p>
            )}
          </header>

          <h2 className="mb-6 text-[1.1rem] font-semibold uppercase tracking-wider text-fg-secondary">
            Capa de Despesa
          </h2>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-4">
            <Field label="Conta" value={accountName} />
            <Field label="Descrição" value={row.descricao} />
            <Field label="Categoria" value={row.categoria ?? "—"} />
            <Field
              label="Data"
              value={new Date(row.data).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            />
            <Field
              label="Valor"
              value={formatBRL(Number(row.valor))}
              highlight
            />
          </dl>

          <footer className="mt-10 border-t border-border pt-4 text-xs text-fg-muted">
            Emitido em {issuedAt.toLocaleDateString("pt-BR")} às{" "}
            {issuedAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </footer>
        </article>
      </div>
    </main>
  );
}
