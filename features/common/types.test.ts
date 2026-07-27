import { describe, it, expect } from "vitest";
import {
  parseValor,
  formatBRL,
  nextDay,
  prevDay,
  nextMonthStart,
  prevMonthStart,
  isValidMonth,
  isValidDate,
} from "./types";

describe("parseValor", () => {
  it("interpreta o formato pt-BR (milhar com ponto, decimal com vírgula)", () => {
    expect(parseValor("1.234,56")).toBe(1234.56);
    expect(parseValor("1.000")).toBe(1000);
    expect(parseValor("10,5")).toBe(10.5);
    expect(parseValor("100")).toBe(100);
  });

  it("remove prefixo R$ e espaços", () => {
    expect(parseValor("R$ 1.000,00")).toBe(1000);
    expect(parseValor("  R$2.500,00 ")).toBe(2500);
  });

  it("retorna null para vazio ou inválido", () => {
    expect(parseValor("")).toBeNull();
    expect(parseValor("abc")).toBeNull();
  });

  it("aceita valores negativos", () => {
    expect(parseValor("-50,00")).toBe(-50);
  });
});

describe("formatBRL", () => {
  it("formata em reais com 2 casas", () => {
    // Normaliza espaços especiais (NBSP/narrow-NBSP) do Intl.
    const norm = (s: string) => s.replace(/[  ]/g, " ");
    expect(norm(formatBRL(1234.56))).toBe("R$ 1.234,56");
    expect(norm(formatBRL(0))).toBe("R$ 0,00");
    expect(norm(formatBRL(-99.9))).toBe("-R$ 99,90");
  });
});

describe("nextDay / prevDay", () => {
  it("nextDay avança um dia, cruzando mês e ano", () => {
    expect(nextDay("2026-01-31")).toBe("2026-02-01");
    expect(nextDay("2026-02-28")).toBe("2026-03-01"); // 2026 não é bissexto
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });

  it("prevDay volta um dia, cruzando mês e ano", () => {
    expect(prevDay("2026-06-01")).toBe("2026-05-31");
    expect(prevDay("2026-01-01")).toBe("2025-12-31");
    expect(prevDay("2026-03-01")).toBe("2026-02-28");
  });
});

describe("nextMonthStart / prevMonthStart", () => {
  it("nextMonthStart retorna o dia 1 do mês seguinte", () => {
    expect(nextMonthStart("2026-01")).toBe("2026-02-01");
    expect(nextMonthStart("2026-12")).toBe("2027-01-01");
  });

  it("prevMonthStart retorna o dia 1 do mês anterior", () => {
    expect(prevMonthStart("2026-03")).toBe("2026-02-01");
    expect(prevMonthStart("2026-01")).toBe("2025-12-01");
  });
});

describe("isValidMonth", () => {
  it("aceita YYYY-MM válido", () => {
    expect(isValidMonth("2026-01")).toBe(true);
    expect(isValidMonth("2026-12")).toBe(true);
  });

  it("rejeita formatos inválidos", () => {
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth("abc")).toBe(false);
    expect(isValidMonth("")).toBe(false);
  });
});

describe("isValidDate", () => {
  it("aceita YYYY-MM-DD válido", () => {
    expect(isValidDate("2026-01-31")).toBe(true);
    expect(isValidDate("2025-12-01")).toBe(true);
  });

  it("rejeita formatos e datas inválidas", () => {
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-01-1")).toBe(false);
    expect(isValidDate("31/01/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});
