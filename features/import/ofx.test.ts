import { describe, it, expect } from "vitest";
import {
  parseOfx,
  buildOfx,
  parseOfxAmount,
  parseOfxDate,
  type ExportTxn,
} from "./ofx";

// OFX 1.x (SGML) típico de banco brasileiro: tags de folha sem fechamento.
const SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20260501120000[-03:BRT]
<DTEND>20260531120000[-03:BRT]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260510120000[-03:BRT]
<TRNAMT>-150.90
<FITID>2026051000123
<MEMO>PAGAMENTO ENERGIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260515120000[-03:BRT]
<TRNAMT>16233.75
<FITID>2026051500999
<MEMO>PM SAO MIGUEL - NF 2026961
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

// OFX 2.x (XML) com tags fechadas.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
    <STMTTRN>
      <TRNTYPE>DEBIT</TRNTYPE>
      <DTPOSTED>20260601</DTPOSTED>
      <TRNAMT>-1000.00</TRNAMT>
      <FITID>ABC-1</FITID>
      <NAME>ALUGUEL ESCRITORIO</NAME>
    </STMTTRN>
  </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("parseOfxAmount", () => {
  it("lê ponto decimal e sinal", () => {
    expect(parseOfxAmount("-150.90")).toBe(-150.9);
    expect(parseOfxAmount("16233.75")).toBe(16233.75);
  });
  it("tolera vírgula decimal e milhar com ponto", () => {
    expect(parseOfxAmount("-150,90")).toBe(-150.9);
    expect(parseOfxAmount("1.234,56")).toBe(1234.56);
  });
  it("retorna null para inválido", () => {
    expect(parseOfxAmount("abc")).toBeNull();
  });
});

describe("parseOfxDate", () => {
  it("extrai YYYY-MM-DD de DTPOSTED", () => {
    expect(parseOfxDate("20260510120000[-03:BRT]")).toBe("2026-05-10");
    expect(parseOfxDate("20260601")).toBe("2026-06-01");
  });
  it("retorna null para formato inválido", () => {
    expect(parseOfxDate("2026-05")).toBeNull();
  });
});

describe("parseOfx (SGML 1.x)", () => {
  const txns = parseOfx(SGML);

  it("lê todas as transações", () => {
    expect(txns).toHaveLength(2);
  });

  it("mapeia débito (valor negativo) para despesa positiva", () => {
    expect(txns[0]).toMatchObject({
      data: "2026-05-10",
      valor: 150.9,
      type: "despesa",
      descricao: "PAGAMENTO ENERGIA",
      fitid: "2026051000123",
    });
  });

  it("mapeia crédito para receita", () => {
    expect(txns[1]).toMatchObject({
      data: "2026-05-15",
      valor: 16233.75,
      type: "receita",
      fitid: "2026051500999",
    });
  });

  it("usa o FITID como chave", () => {
    expect(txns[0].key).toBe("2026051000123");
  });
});

describe("parseOfx (XML 2.x)", () => {
  it("lê tags fechadas e usa NAME quando não há MEMO", () => {
    const txns = parseOfx(XML);
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({
      data: "2026-06-01",
      valor: 1000,
      type: "despesa",
      descricao: "ALUGUEL ESCRITORIO",
    });
  });
});

describe("parseOfx sem FITID", () => {
  it("sintetiza uma chave e não colide entre linhas idênticas", () => {
    const noFit = `<OFX><BANKTRANLIST>
      <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260101<TRNAMT>-50.00<MEMO>X</STMTTRN>
      <STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260101<TRNAMT>-50.00<MEMO>X</STMTTRN>
    </BANKTRANLIST></OFX>`;
    const txns = parseOfx(noFit);
    expect(txns).toHaveLength(2);
    expect(txns[0].fitid).toBeNull();
    expect(txns[0].key).not.toBe(txns[1].key); // contador evita colisão
  });
});

describe("buildOfx", () => {
  const txns: ExportTxn[] = [
    {
      id: "t1",
      type: "despesa",
      valor: 150.9,
      data: "2026-05-10",
      descricao: "Energia",
      categoria: "Energia",
    },
    {
      id: "t2",
      type: "receita",
      valor: 16233.75,
      data: "2026-05-15",
      descricao: "Repasse",
      categoria: null,
    },
  ];

  it("gera um OFX que pode ser lido de volta (round-trip)", () => {
    const ofx = buildOfx(txns, "2026-06-01T00:00:00Z");
    expect(ofx).toContain("OFXHEADER:100");
    const parsed = parseOfx(ofx);
    expect(parsed).toHaveLength(2);
    // Débito volta como despesa positiva; crédito como receita.
    const despesa = parsed.find((t) => t.type === "despesa");
    const receita = parsed.find((t) => t.type === "receita");
    expect(despesa?.valor).toBe(150.9);
    expect(receita?.valor).toBe(16233.75);
    expect(despesa?.fitid).toBe("t1");
  });

  it("inclui a categoria no memo", () => {
    const ofx = buildOfx(txns, "2026-06-01T00:00:00Z");
    expect(ofx).toContain("Energia [Energia]");
  });
});
