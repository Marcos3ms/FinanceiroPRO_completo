import { SALDO_ANTERIOR_CATEGORY } from "@/lib/categories";

/** Movimentação usada no cálculo do saldo anterior. */
export type SaldoRow = {
  type: "receita" | "despesa";
  valor: number | string;
  /** Data no formato YYYY-MM-DD. */
  data: string;
  categoria: string | null;
  account_id: string | null;
};

/** Chave usada quando a movimentação não está vinculada a uma conta. */
export const NO_ACCOUNT_KEY = "sem-conta";

/**
 * Calcula o saldo anterior (saldo de abertura) por conta a partir de TODAS as
 * movimentações anteriores ao período.
 *
 * Modelo checkpoint + acúmulo: para cada conta parte-se do último "Saldo
 * anterior" lançado (o checkpoint) e somam-se as movimentações reais
 * (receita: +, despesa: −) de dias ESTRITAMENTE posteriores à data do
 * checkpoint. Movimentações do mesmo dia (ou anteriores) já estão refletidas
 * no valor do checkpoint, então não são recontadas. Sem checkpoint, acumula
 * tudo desde o começo.
 *
 * `priorRows` deve vir ordenado por data (e created_at) ascendente.
 */
export function saldoAnteriorByAccount(
  priorRows: SaldoRow[],
): Map<string, number> {
  const byAcc = new Map<string, SaldoRow[]>();
  for (const r of priorRows) {
    const key = r.account_id ?? NO_ACCOUNT_KEY;
    const list = byAcc.get(key) ?? [];
    list.push(r);
    byAcc.set(key, list);
  }

  const map = new Map<string, number>();
  for (const [key, list] of byAcc) {
    let base = 0;
    let checkpointDate: string | null = null;
    // Último "Saldo anterior" lançado é o checkpoint.
    for (let i = list.length - 1; i >= 0; i--) {
      if (
        list[i].type === "receita" &&
        list[i].categoria === SALDO_ANTERIOR_CATEGORY
      ) {
        base = Number(list[i].valor);
        checkpointDate = list[i].data;
        break;
      }
    }

    let saldo = base;
    for (const r of list) {
      // Ignora os marcadores "Saldo anterior" (o base já os representa).
      if (r.type === "receita" && r.categoria === SALDO_ANTERIOR_CATEGORY) {
        continue;
      }
      // Só soma movimentações de dias estritamente posteriores ao checkpoint.
      if (checkpointDate !== null && r.data <= checkpointDate) {
        continue;
      }
      saldo += r.type === "receita" ? Number(r.valor) : -Number(r.valor);
    }
    map.set(key, saldo);
  }
  return map;
}
