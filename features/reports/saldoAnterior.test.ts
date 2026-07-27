import { describe, it, expect } from "vitest";
import {
  saldoAnteriorByAccount,
  NO_ACCOUNT_KEY,
  type SaldoRow,
} from "./saldoAnterior";

const SALDO = "Saldo anterior";

function row(partial: Partial<SaldoRow>): SaldoRow {
  return {
    type: "despesa",
    valor: 0,
    data: "2026-01-01",
    categoria: "Outros",
    account_id: "A",
    ...partial,
  };
}

describe("saldoAnteriorByAccount", () => {
  it("sem checkpoint, acumula todas as movimentações reais (receita − despesa)", () => {
    const rows: SaldoRow[] = [
      row({ type: "receita", valor: 1000, data: "2026-01-05" }),
      row({ type: "despesa", valor: 300, data: "2026-01-10" }),
      row({ type: "receita", valor: 200, data: "2026-01-20" }),
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBe(900); // 1000 − 300 + 200
  });

  it("usa o último 'Saldo anterior' como base e soma só dias posteriores", () => {
    const rows: SaldoRow[] = [
      row({ type: "receita", valor: 5000, data: "2026-01-05" }), // antes do checkpoint, ignorado
      row({ type: "receita", valor: 1000, data: "2026-01-31", categoria: SALDO }), // checkpoint
      row({ type: "despesa", valor: 250, data: "2026-02-10" }), // depois, soma
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBe(750); // 1000 − 250 (o 5000 anterior é descartado)
  });

  it("não reconta movimentações do MESMO dia do checkpoint (regressão do duplo-cont)", () => {
    const rows: SaldoRow[] = [
      row({ type: "receita", valor: 31653.61, data: "2026-04-30", categoria: SALDO }), // checkpoint
      row({ type: "receita", valor: 130000, data: "2026-04-30" }), // mesmo dia → NÃO soma
      row({ type: "despesa", valor: 77025.16, data: "2026-04-30" }), // mesmo dia → NÃO soma
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBeCloseTo(31653.61, 2);
  });

  it("respeita o último checkpoint quando há vários (re-baseline)", () => {
    const rows: SaldoRow[] = [
      row({ type: "receita", valor: 100, data: "2026-01-31", categoria: SALDO }),
      row({ type: "receita", valor: 3328.14, data: "2026-05-29", categoria: SALDO }), // mais recente
      row({ type: "despesa", valor: 2597.67, data: "2026-05-31" }), // depois do 29/05
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBeCloseTo(730.47, 2); // 3328.14 − 2597.67
  });

  it("calcula por conta de forma independente", () => {
    const rows: SaldoRow[] = [
      row({ account_id: "A", type: "receita", valor: 1000, data: "2026-01-10" }),
      row({ account_id: "B", type: "receita", valor: 500, data: "2026-01-10" }),
      row({ account_id: "B", type: "despesa", valor: 200, data: "2026-01-15" }),
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBe(1000);
    expect(map.get("B")).toBe(300);
  });

  it("inclui as duas pernas de transferência no saldo por conta", () => {
    // Transferência de 1.000 de A para B: despesa em A, receita em B.
    const rows: SaldoRow[] = [
      row({ account_id: "A", type: "receita", valor: 2000, data: "2026-01-01" }),
      row({
        account_id: "A",
        type: "despesa",
        valor: 1000,
        data: "2026-01-05",
        categoria: "Transferência entre contas",
      }),
      row({
        account_id: "B",
        type: "receita",
        valor: 1000,
        data: "2026-01-05",
        categoria: "Transferência entre contas",
      }),
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBe(1000); // 2000 − 1000
    expect(map.get("B")).toBe(1000);
    // A soma das contas preserva o total (transferência é neutra no consolidado).
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    expect(total).toBe(2000);
  });

  it("agrupa movimentações sem conta sob NO_ACCOUNT_KEY", () => {
    const rows: SaldoRow[] = [
      row({ account_id: null, type: "receita", valor: 42, data: "2026-01-01" }),
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get(NO_ACCOUNT_KEY)).toBe(42);
  });

  it("retorna mapa vazio quando não há movimentações", () => {
    expect(saldoAnteriorByAccount([]).size).toBe(0);
  });

  it("aceita valores em string (como vêm do banco)", () => {
    const rows: SaldoRow[] = [
      row({ type: "receita", valor: "1500.50", data: "2026-01-01" }),
      row({ type: "despesa", valor: "500.50", data: "2026-01-02" }),
    ];
    const map = saldoAnteriorByAccount(rows);
    expect(map.get("A")).toBeCloseTo(1000, 2);
  });
});
