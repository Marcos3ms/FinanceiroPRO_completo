import TransactionsView from "@/components/transactions/TransactionsView";

export const metadata = { title: "Receitas - FinanceiroPro" };

export default function ReceitasPage({
  searchParams,
}: {
  searchParams: { categoria?: string; mes?: string };
}) {
  return (
    <TransactionsView
      type="receita"
      title="Receitas"
      subtitle="Acompanhe e organize todas as suas entradas."
      searchParams={searchParams}
    />
  );
}
