import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import FilterBar, { FilterGroup } from "@/components/ui/FilterBar";
import { DataTableWrapper, EmptyRow } from "@/components/ui/DataTable";
import { DeleteIconButton } from "@/components/ui/DeleteButton";
import EditButton from "@/components/ui/EditButton";
import { CATEGORIES } from "@/lib/categories";
import {
  formatBRL,
  currentMonthBR,
  isValidMonth,
  nextMonthStart,
} from "@/features/common/types";
import { createClient } from "@/lib/supabase/server";
import { deleteTransactionAction } from "@/features/transactions/actions";

const VISIBLE_COLUMNS = ["Conta", "Descrição", "Categoria", "Data", "Valor"];
const ACTIONS_LABEL = "Ações";
const TOTAL_COLUMNS = VISIBLE_COLUMNS.length + 1;
const HEADER_TH =
  "border-b border-border bg-bg-elevated px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-fg-muted";

type SearchParams = {
  categoria?: string;
  mes?: string;
};

export default async function TransactionsView({
  type,
  title,
  subtitle,
  searchParams,
}: {
  type: "receita" | "despesa";
  title: string;
  subtitle: string;
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mes = isValidMonth(searchParams.mes ?? "")
    ? searchParams.mes!
    : currentMonthBR();

  let query = supabase
    .from("transactions")
    .select(
      "id, descricao, valor, data, categoria, account_id, transfer_id, desconto, acrescimo, accounts(nome)",
    )
    .eq("user_id", user.id)
    .eq("type", type)
    .gte("data", `${mes}-01`)
    .lt("data", nextMonthStart(mes))
    .order("data", { ascending: true })
    .order("created_at", { ascending: true });

  if (searchParams.categoria) query = query.eq("categoria", searchParams.categoria);

  const { data: rows } = await query;
  const transactions = rows ?? [];
  const basePath = type === "receita" ? "/receitas" : "/despesas";

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<HeaderActions />} />

      <section className="px-8 pb-8">
        <form method="get" className="print:hidden">
          <FilterBar>
            <FilterGroup label="Categoria">
              <select
                name="categoria"
                className="form-select"
                defaultValue={searchParams.categoria ?? ""}
              >
                <option value="">Todas</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterGroup>
            <FilterGroup label="Competência">
              <input
                name="mes"
                type="month"
                className="form-input"
                defaultValue={mes}
              />
            </FilterGroup>
            <button type="submit" className="btn btn-blue">
              Filtrar
            </button>
            <Link href={basePath} className="btn btn-outline">
              Limpar
            </Link>
          </FilterBar>
        </form>

        <DataTableWrapper>
          <thead>
            <tr>
              {VISIBLE_COLUMNS.map((c) => (
                <th
                  key={c}
                  className={`${HEADER_TH} ${
                    c === "Valor" ? "text-right" : "text-left"
                  }`}
                >
                  {c}
                </th>
              ))}
              <th className={`${HEADER_TH} text-left print:hidden`}>
                {ACTIONS_LABEL}
              </th>
            </tr>
          </thead>
          {transactions.length === 0 ? (
            <EmptyRow
              colSpan={TOTAL_COLUMNS}
              text="Nenhum registro encontrado."
            />
          ) : (
            <tbody>
              {transactions.map((t) => {
                const accountName =
                  Array.isArray(t.accounts)
                    ? (t.accounts[0]?.nome ?? "—")
                    : ((t.accounts as { nome: string } | null)?.nome ?? "—");
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-secondary">
                      {accountName}
                    </td>
                    <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-primary">
                      {t.descricao}
                    </td>
                    <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-secondary">
                      {t.categoria ?? "—"}
                    </td>
                    <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-secondary">
                      {new Date(t.data).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td
                      className={`border-b border-border px-5 py-3.5 text-right text-[0.9rem] font-semibold ${
                        type === "receita" ? "text-brand-green" : "text-brand-red"
                      }`}
                    >
                      {formatBRL(Number(t.valor))}
                    </td>
                    <td className="border-b border-border px-5 py-3.5 text-[0.9rem] print:hidden">
                      <div className="flex items-center gap-1">
                        {type === "despesa" && (
                          <a
                            href={`/capa/despesa/${t.id}`}
                            target="_blank"
                            rel="noopener"
                            title="Capa para impressão"
                            className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-all hover:bg-brand-blue-bg hover:text-brand-blue"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                        <EditButton
                          payload={{
                            kind: type,
                            row: {
                              id: t.id,
                              type,
                              descricao: t.descricao,
                              valor: Number(t.valor),
                              data: t.data,
                              categoria: t.categoria,
                              account_id: t.account_id,
                              transfer_id: t.transfer_id ?? null,
                              desconto: Number(t.desconto ?? 0),
                              acrescimo: Number(t.acrescimo ?? 0),
                            },
                          }}
                        />
                        <form action={deleteTransactionAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <DeleteIconButton confirmMessage="Excluir este lançamento?" />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </DataTableWrapper>
      </section>
    </>
  );
}
