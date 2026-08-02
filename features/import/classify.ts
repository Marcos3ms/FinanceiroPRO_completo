// Classifica cada linha do extrato OFX contra o que já existe no banco:
// - "importado": FITID já importado nesta conta (será ignorado).
// - "concilia": casa com um lançamento manual da MESMA conta e MESMO tipo
//   (será vinculado, evitando duplicar).
// - "transferencia": casa com um lançamento de tipo OPOSTO em OUTRA conta,
//   mesmo valor e data (as duas pernas viram uma transferência).
// - "novo": lançamento novo (será inserido).

export type RowStatus = "importado" | "concilia" | "transferencia" | "novo";

export type ParsedRow = {
  key: string;
  type: "receita" | "despesa";
  valor: number;
  data: string;
};

export type ExistingTxn = {
  id: string;
  account_id: string | null;
  type: "receita" | "despesa";
  valor: number | string;
  data: string;
  import_fitid: string | null;
};

export type Classification = { status: RowStatus; counterpartId?: string };

function cents(v: number | string): number {
  return Math.round(Number(v) * 100);
}

function keyOf(data: string, type: string, v: number | string): string {
  return `${data}|${type}|${cents(v)}`;
}

function opposite(t: "receita" | "despesa"): "receita" | "despesa" {
  return t === "despesa" ? "receita" : "despesa";
}

/**
 * `existing` deve conter apenas lançamentos SEM transfer_id (não são
 * transferências ainda), no intervalo de datas do extrato.
 * `importedFitids` são os FITIDs já importados NA CONTA de destino.
 */
export function classifyOfxRows(
  parsed: ParsedRow[],
  accountId: string,
  importedFitids: Set<string>,
  existing: ExistingTxn[],
): Map<string, Classification> {
  // Pool de conciliação: mesma conta, lançamentos manuais (sem import_fitid).
  const manualSameAcct = new Map<string, string[]>();
  // Pool de transferência: outras contas (qualquer origem).
  const crossAcct = new Map<string, string[]>();

  for (const e of existing) {
    const k = keyOf(e.data, e.type, e.valor);
    if (e.account_id === accountId) {
      if (e.import_fitid === null) {
        const list = manualSameAcct.get(k) ?? [];
        list.push(e.id);
        manualSameAcct.set(k, list);
      }
    } else {
      const list = crossAcct.get(k) ?? [];
      list.push(e.id);
      crossAcct.set(k, list);
    }
  }

  const result = new Map<string, Classification>();
  for (const row of parsed) {
    if (importedFitids.has(row.key)) {
      result.set(row.key, { status: "importado" });
      continue;
    }

    const sameKey = keyOf(row.data, row.type, row.valor);
    const manualPool = manualSameAcct.get(sameKey);
    if (manualPool && manualPool.length > 0) {
      const id = manualPool.shift()!;
      result.set(row.key, { status: "concilia", counterpartId: id });
      continue;
    }

    const oppKey = keyOf(row.data, opposite(row.type), row.valor);
    const crossPool = crossAcct.get(oppKey);
    if (crossPool && crossPool.length > 0) {
      const id = crossPool.shift()!;
      result.set(row.key, { status: "transferencia", counterpartId: id });
      continue;
    }

    result.set(row.key, { status: "novo" });
  }

  return result;
}
