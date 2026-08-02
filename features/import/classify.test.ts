import { describe, it, expect } from "vitest";
import {
  classifyOfxRows,
  type ParsedRow,
  type ExistingTxn,
} from "./classify";

const ACCT = "acct-A";
const OTHER = "acct-B";

function row(
  key: string,
  type: "receita" | "despesa",
  valor: number,
  data: string,
): ParsedRow {
  return { key, type, valor, data };
}

function existing(
  id: string,
  account_id: string | null,
  type: "receita" | "despesa",
  valor: number | string,
  data: string,
  import_fitid: string | null = null,
): ExistingTxn {
  return { id, account_id, type, valor, data, import_fitid };
}

describe("classifyOfxRows", () => {
  it("marca 'importado' quando o FITID já foi importado nesta conta", () => {
    const parsed = [row("FIT1", "despesa", 100, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(["FIT1"]), []);
    expect(res.get("FIT1")).toEqual({ status: "importado" });
  });

  it("marca 'novo' quando não há nada parecido", () => {
    const parsed = [row("FIT1", "despesa", 100, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), []);
    expect(res.get("FIT1")).toEqual({ status: "novo" });
  });

  it("marca 'concilia' com lançamento manual da mesma conta e mesmo tipo", () => {
    const parsed = [row("FIT1", "despesa", 100, "2026-05-10")];
    const ex = [existing("e1", ACCT, "despesa", 100, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({ status: "concilia", counterpartId: "e1" });
  });

  it("NÃO concilia com lançamento já importado (import_fitid não nulo) na mesma conta", () => {
    const parsed = [row("FIT1", "despesa", 100, "2026-05-10")];
    const ex = [existing("e1", ACCT, "despesa", 100, "2026-05-10", "OLDFIT")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({ status: "novo" });
  });

  it("marca 'transferencia' com tipo oposto em outra conta, mesmo valor e data", () => {
    // Extrato é da conta A, débito de 500; existe um crédito de 500 na conta B.
    const parsed = [row("FIT1", "despesa", 500, "2026-05-10")];
    const ex = [existing("e1", OTHER, "receita", 500, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({
      status: "transferencia",
      counterpartId: "e1",
    });
  });

  it("não vira transferência se o tipo na outra conta for o mesmo", () => {
    const parsed = [row("FIT1", "despesa", 500, "2026-05-10")];
    const ex = [existing("e1", OTHER, "despesa", 500, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({ status: "novo" });
  });

  it("não vira transferência se a data ou o valor divergirem", () => {
    const parsed = [
      row("FIT1", "despesa", 500, "2026-05-10"),
      row("FIT2", "despesa", 400, "2026-05-10"),
    ];
    const ex = [
      existing("e1", OTHER, "receita", 500, "2026-05-11"), // data diferente
      existing("e2", OTHER, "receita", 401, "2026-05-10"), // valor diferente
    ];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({ status: "novo" });
    expect(res.get("FIT2")).toEqual({ status: "novo" });
  });

  it("prioriza 'concilia' (mesma conta) sobre 'transferencia' (outra conta)", () => {
    const parsed = [row("FIT1", "despesa", 100, "2026-05-10")];
    const ex = [
      existing("mesmo", ACCT, "despesa", 100, "2026-05-10"),
      existing("outro", OTHER, "receita", 100, "2026-05-10"),
    ];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({
      status: "concilia",
      counterpartId: "mesmo",
    });
  });

  it("não usa o mesmo counterpart para duas linhas (consome o pool)", () => {
    const parsed = [
      row("FIT1", "despesa", 100, "2026-05-10"),
      row("FIT2", "despesa", 100, "2026-05-10"),
    ];
    const ex = [existing("e1", ACCT, "despesa", 100, "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({ status: "concilia", counterpartId: "e1" });
    expect(res.get("FIT2")).toEqual({ status: "novo" });
  });

  it("casa valores com centavos usando comparação exata em centavos", () => {
    const parsed = [row("FIT1", "receita", 1234.56, "2026-05-10")];
    const ex = [existing("e1", OTHER, "despesa", "1234.56", "2026-05-10")];
    const res = classifyOfxRows(parsed, ACCT, new Set(), ex);
    expect(res.get("FIT1")).toEqual({
      status: "transferencia",
      counterpartId: "e1",
    });
  });
});
