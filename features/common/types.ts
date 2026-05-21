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
