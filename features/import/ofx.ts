// Leitura e geração de arquivos OFX (Open Financial Exchange).
// Suporta OFX 1.x (SGML, comum nos bancos brasileiros) e 2.x (XML), pois o
// parser é tolerante a tags sem fechamento.

export type OfxTransaction = {
  /** Chave estável usada para deduplicar/selecionar (FITID ou sintetizada). */
  key: string;
  fitid: string | null;
  /** Data no formato YYYY-MM-DD. */
  data: string;
  /** Valor sempre positivo; o sinal vira `type`. */
  valor: number;
  type: "receita" | "despesa";
  descricao: string;
};

function readTag(block: string, name: string): string | null {
  // Captura tudo após <TAG> até o próximo '<' ou quebra de linha.
  // Funciona tanto para SGML (<TRNAMT>-10.00) quanto XML (<TRNAMT>-10.00</TRNAMT>).
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

/** Converte o valor do OFX (ponto decimal) para número, tolerando vírgula. */
export function parseOfxAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (s.includes(".") && s.includes(",")) {
    // Formato incorreto porém visto em alguns bancos: 1.234,56
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Converte DTPOSTED (YYYYMMDD[HHMMSS...]) para YYYY-MM-DD. */
export function parseOfxDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function sanitizeMemo(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Lê todas as transações (<STMTTRN>) de um conteúdo OFX. */
export function parseOfx(content: string): OfxTransaction[] {
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const txns: OfxTransaction[] = [];
  let counter = 0;

  for (const block of blocks) {
    const amtRaw = readTag(block, "TRNAMT");
    const dtRaw = readTag(block, "DTPOSTED");
    if (amtRaw === null || dtRaw === null) continue;

    const valorSigned = parseOfxAmount(amtRaw);
    const data = parseOfxDate(dtRaw);
    if (valorSigned === null || data === null) continue;

    const fitidRaw = readTag(block, "FITID");
    const fitid = fitidRaw && fitidRaw.length > 0 ? fitidRaw : null;
    const memo = readTag(block, "MEMO");
    const name = readTag(block, "NAME");
    const descricao = sanitizeMemo(memo || name || "Sem descrição");

    // Sem FITID, sintetiza uma chave estável (inclui um contador para não
    // colidir com lançamentos idênticos no mesmo arquivo).
    const key = fitid ?? `syn:${data}:${valorSigned}:${descricao}:${counter}`;
    counter++;

    txns.push({
      key,
      fitid,
      data,
      valor: Math.abs(valorSigned),
      type: valorSigned < 0 ? "despesa" : "receita",
      descricao,
    });
  }

  return txns;
}

// ─────────────────────────── Geração (export) ───────────────────────────

export type ExportTxn = {
  id: string;
  type: "receita" | "despesa";
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  categoria?: string | null;
};

function ofxEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s+/g, " ")
    .trim();
}

function toOfxDate(data: string): string {
  return data.replace(/-/g, "") + "120000";
}

/** Gera um extrato OFX 1.0.2 (SGML) a partir das transações. */
export function buildOfx(txns: ExportTxn[], nowIso?: string): string {
  const sorted = [...txns].sort((a, b) => a.data.localeCompare(b.data));
  const dtStart = sorted.length ? toOfxDate(sorted[0].data) : "19700101120000";
  const dtEnd = sorted.length
    ? toOfxDate(sorted[sorted.length - 1].data)
    : "19700101120000";
  const dtServer = (nowIso ?? new Date().toISOString()).slice(0, 10).replace(/-/g, "") + "120000";

  const header = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
  ].join("\r\n");

  const body: string[] = [];
  body.push("<OFX>");
  body.push("<BANKMSGSRSV1>");
  body.push("<STMTTRNRS>");
  body.push("<TRNUID>1");
  body.push("<STATUS><CODE>0<SEVERITY>INFO</STATUS>");
  body.push("<STMTRS>");
  body.push("<CURDEF>BRL");
  body.push(
    "<BANKACCTFROM><BANKID>0000<ACCTID>FINANCEIROPRO<ACCTTYPE>CHECKING</BANKACCTFROM>",
  );
  body.push("<BANKTRANLIST>");
  body.push(`<DTSTART>${dtStart}`);
  body.push(`<DTEND>${dtEnd}`);

  for (const t of sorted) {
    const signed = (t.type === "receita" ? t.valor : -t.valor).toFixed(2);
    const memo = ofxEscape(
      t.categoria ? `${t.descricao} [${t.categoria}]` : t.descricao,
    );
    body.push("<STMTTRN>");
    body.push(`<TRNTYPE>${t.type === "receita" ? "CREDIT" : "DEBIT"}`);
    body.push(`<DTPOSTED>${toOfxDate(t.data)}`);
    body.push(`<TRNAMT>${signed}`);
    body.push(`<FITID>${ofxEscape(t.id)}`);
    body.push(`<MEMO>${memo}`);
    body.push("</STMTTRN>");
  }

  body.push("</BANKTRANLIST>");
  body.push(`<LEDGERBAL><BALAMT>0.00<DTASOF>${dtServer}</LEDGERBAL>`);
  body.push("</STMTRS>");
  body.push("</STMTTRNRS>");
  body.push("</BANKMSGSRSV1>");
  body.push("</OFX>");

  return header + "\r\n" + body.join("\r\n") + "\r\n";
}
