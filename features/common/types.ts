export type ActionState = { error: string | null; ok: boolean };
export const initialActionState: ActionState = { error: null, ok: false };

export type Account = {
  id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
};

export type PaymentMethod = "pix" | "transferencia" | "boleto" | "cartao";

export type Transaction = {
  id: string;
  type: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  categoria: string | null;
  account_id: string | null;
  transfer_id: string | null;
  desconto?: number;
  acrescimo?: number;
  payment_method?: PaymentMethod | null;
  payment_details?: string | null;
  account?: { nome: string } | null;
};

export type Schedule = {
  id: string;
  descricao: string;
  valor: number;
  frequencia: "mensal" | "semanal" | "anual";
  vencimento: string;
  categoria: string | null;
  account_id: string | null;
  lembretes: string[];
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  payment_details?: string | null;
};

export function parseValor(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[R$]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Hoje no fuso de São Paulo no formato YYYY-MM-DD (compatível com input type="date"). */
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Mês atual no fuso de São Paulo no formato YYYY-MM (compatível com input type="month"). */
export function currentMonthBR(): string {
  return todayBR().slice(0, 7);
}

/** Valida uma competência no formato YYYY-MM. */
export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Valida uma data no formato YYYY-MM-DD. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(t);
}

/** Próximo dia (YYYY-MM-DD) — útil para fim exclusivo em consultas com .lt(). */
export function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** Dia anterior (YYYY-MM-DD). Para o início de um período, retorna o último
 *  dia do mês/período anterior. */
export function prevDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(prev.getUTCDate()).padStart(2, "0")}`;
}

/** Primeiro dia do mês seguinte (YYYY-MM-01) a partir de uma competência YYYY-MM. */
export function nextMonthStart(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Primeiro dia do mês anterior (YYYY-MM-01) a partir de uma competência YYYY-MM. */
export function prevMonthStart(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
