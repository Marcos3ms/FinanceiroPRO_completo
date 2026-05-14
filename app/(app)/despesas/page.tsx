import TransactionsView from "@/components/transactions/TransactionsView";

export const metadata = { title: "Despesas - FinanceiroPro" };

export default function DespesasPage({
  searchParams,
}: {
  searchParams: { categoria?: string; inicio?: string; fim?: string };
}) {
  return (
    <TransactionsView
      type="despesa"
      title="Despesas"
      subtitle="Acompanhe e organize todas as suas saídas."
      searchParams={searchParams}
    />
  );
}
