import { describe, it, expect } from "vitest";
import {
  normalizeDescricao,
  suggestCategory,
  type CategoryRule,
} from "./categorize";

describe("normalizeDescricao", () => {
  it("remove acentos, números e pontuação; mantém letras em maiúsculas", () => {
    expect(normalizeDescricao("EQUATORIAL ENERGIA - PGTO 12345")).toBe(
      "EQUATORIAL ENERGIA PGTO",
    );
    expect(normalizeDescricao("Serviços Contábeis (Ref. 2026)")).toBe(
      "SERVICOS CONTABEIS REF",
    );
  });

  it("gera a mesma chave ignorando números de documento variáveis", () => {
    const a = normalizeDescricao("PIX 000123 FULANO DE TAL");
    const b = normalizeDescricao("PIX 998877 FULANO DE TAL");
    expect(a).toBe(b);
    expect(a).toBe("PIX FULANO DE TAL");
  });

  it("retorna vazio para descrição só com números", () => {
    expect(normalizeDescricao("123 456")).toBe("");
  });
});

describe("suggestCategory", () => {
  const rules: CategoryRule[] = [
    { pattern: "EQUATORIAL ENERGIA PGTO", categoria: "Energia" },
    { pattern: "ALUGUEL", categoria: "Aluguel" },
  ];

  it("casa exatamente pela chave normalizada", () => {
    expect(suggestCategory("EQUATORIAL ENERGIA - PGTO 55", rules)).toBe(
      "Energia",
    );
  });

  it("casa por conteúdo (padrão contido na descrição)", () => {
    expect(suggestCategory("PGTO ALUGUEL ESCRITORIO 900", rules)).toBe(
      "Aluguel",
    );
  });

  it("prefere o padrão mais longo/específico", () => {
    const r: CategoryRule[] = [
      { pattern: "PGTO", categoria: "Outros" },
      { pattern: "PGTO ENERGIA ELETRICA", categoria: "Energia" },
    ];
    expect(suggestCategory("PGTO ENERGIA ELETRICA - CIA 12", r)).toBe("Energia");
  });

  it("retorna null quando nada casa", () => {
    expect(suggestCategory("COMPRA MERCADO XYZ", rules)).toBeNull();
  });
});
