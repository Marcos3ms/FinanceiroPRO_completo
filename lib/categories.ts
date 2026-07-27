// Categorias especiais com tratamento semântico no código. NÃO são
// gerenciáveis pelo usuário (removê-las quebraria transferências / saldo).
export const TRANSFER_CATEGORY = "Transferência entre contas";
export const SALDO_ANTERIOR_CATEGORY = "Saldo anterior";

/** Nomes reservados que o usuário não pode criar como categoria comum. */
export const RESERVED_CATEGORIES = [
  TRANSFER_CATEGORY,
  SALDO_ANTERIOR_CATEGORY,
] as const;

// Lista padrão usada para semear novos usuários (espelha o seed do schema.sql)
// e como fallback caso a busca no banco retorne vazio.
export const DEFAULT_CATEGORIES = [
  "Acordo trabalhista",
  "Advogados",
  "Água",
  "Aluguel",
  "Aluguel impressora",
  "Anuidade conselhos",
  "Assessoria administrativa",
  "Assessoria especializada",
  "Depósito em conta",
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
  "Seguro",
  "Serviços contábeis",
  "Serviços de limpeza",
  "Software",
  "Tarifas",
  "Telefone",
] as const;

/** Opções do seletor de categoria numa RECEITA (inclui "Saldo anterior"). */
export function receitaCategoryOptions(categories: string[]): string[] {
  return [...categories, SALDO_ANTERIOR_CATEGORY];
}

/** Opções do seletor de categoria numa DESPESA (inclui transferência). */
export function despesaCategoryOptions(categories: string[]): string[] {
  return [...categories, TRANSFER_CATEGORY];
}

/** Opções para filtros de relatórios/listas (inclui as especiais). */
export function filterCategoryOptions(categories: string[]): string[] {
  return [...categories, TRANSFER_CATEGORY, SALDO_ANTERIOR_CATEGORY];
}
