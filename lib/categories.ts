export const CATEGORIES = [
  "Advogados",
  "Água",
  "Aluguel",
  "Aluguel impressora",
  "Anuidade conselhos",
  "Assessoria administrativa",
  "Despesas de escritório",
  "Energia",
  "Folha de pagamento",
  "Funcionários",
  "Imposto",
  "Internet",
  "Monitoramento",
  "Outros",
  "Pagamento de nota fiscal",
  "Reembolso",
  "Repasse cooperados",
  "Responsável técnico",
  "Saldo anterior",
  "Seguro",
  "Serviços contábeis",
  "Serviços de limpeza",
  "Software",
  "Tarifas",
  "Telefone",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TRANSFER_CATEGORY = "Transferência entre contas";
export const SALDO_ANTERIOR_CATEGORY = "Saldo anterior";

export const DESPESA_CATEGORY_OPTIONS = [
  ...CATEGORIES,
  TRANSFER_CATEGORY,
] as const;
