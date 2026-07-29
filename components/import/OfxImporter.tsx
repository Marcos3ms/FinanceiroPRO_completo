"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, FileText, Check } from "lucide-react";
import { FormGroup } from "@/components/ui/FormField";
import { formatBRL } from "@/features/common/types";
import { parseOfx, type OfxTransaction } from "@/features/import/ofx";
import { importOfxAction, type ImportResult } from "@/features/import/actions";

type Account = { id: string; nome: string };

/** Lê o arquivo respeitando o charset declarado no cabeçalho OFX. */
async function readOfxFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  // Peek no cabeçalho em ASCII para descobrir o charset.
  const head = new TextDecoder("ascii").decode(buffer.slice(0, 512)).toUpperCase();
  let label = "windows-1252"; // padrão comum nos bancos BR (OFX 1.x)
  if (head.includes("UTF-8") || head.includes("UNICODE")) label = "utf-8";
  else if (head.includes("8859")) label = "iso-8859-1";
  try {
    return new TextDecoder(label).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function OfxImporter({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [txns, setTxns] = useState<OfxTransaction[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setParseError(null);
    if (!file) return;
    setFileName(file.name);
    const text = await readOfxFile(file);
    setContent(text);
    const parsed = parseOfx(text);
    if (parsed.length === 0) {
      setTxns([]);
      setParseError(
        "Nenhum lançamento encontrado. O arquivo é um extrato OFX válido?",
      );
      return;
    }
    setTxns(parsed);
    setExcluded(new Set());
  }

  const toggle = (key: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedKeys = txns.filter((t) => !excluded.has(t.key)).map((t) => t.key);
  const selectedTxns = txns.filter((t) => !excluded.has(t.key));
  const totalCredito = selectedTxns
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + t.valor, 0);
  const totalDebito = selectedTxns
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + t.valor, 0);

  function doImport() {
    setResult(null);
    startTransition(async () => {
      const res = await importOfxAction(content, accountId, selectedKeys);
      setResult(res);
      if (res.ok) {
        setTxns([]);
        setContent("");
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  const canImport =
    !!accountId && selectedKeys.length > 0 && !pending;

  return (
    <div className="flex flex-col gap-5">
      {/* Passo 1: conta + arquivo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormGroup label="Conta de destino" htmlFor="import-conta">
          <select
            id="import-conta"
            className="form-select"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Selecione a conta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Arquivo OFX" htmlFor="import-file">
          <input
            ref={fileRef}
            id="import-file"
            type="file"
            accept=".ofx,application/x-ofx,text/plain"
            onChange={onFile}
            className="block w-full text-[0.85rem] text-fg-secondary file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-accent file:px-4 file:py-2 file:text-accent-ink hover:file:bg-accent-hover"
          />
        </FormGroup>
      </div>

      {fileName && (
        <div className="flex items-center gap-2 text-[0.8rem] text-fg-secondary">
          <FileText className="h-4 w-4" /> {fileName}
          {txns.length > 0 && (
            <span className="text-fg-muted">
              · {txns.length} lançamento(s) encontrado(s)
            </span>
          )}
        </div>
      )}

      {parseError && <p className="text-sm text-debit">{parseError}</p>}

      {result && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            result.ok
              ? "border-credit-border bg-credit-bg text-credit"
              : "border-debit-border bg-debit-bg text-debit"
          }`}
        >
          {result.ok ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {result.imported} lançamento(s) importado(s).
              {result.duplicated > 0 &&
                ` ${result.duplicated} já existia(m) e foram ignorados.`}
            </span>
          ) : (
            result.error
          )}
        </div>
      )}

      {/* Passo 2: prévia */}
      {txns.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[0.85rem] text-fg-secondary">
              Revise e desmarque o que não quer importar.
            </div>
            <div className="num-mono flex gap-4 text-[0.8rem]">
              <span className="text-credit">
                + {formatBRL(totalCredito)}
              </span>
              <span className="text-debit">− {formatBRL(totalDebito)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border bg-bg-elevated px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                    Importar
                  </th>
                  <th className="border-b border-border bg-bg-elevated px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                    Data
                  </th>
                  <th className="border-b border-border bg-bg-elevated px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                    Descrição
                  </th>
                  <th className="border-b border-border bg-bg-elevated px-3 py-2 text-right text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const on = !excluded.has(t.key);
                  return (
                    <tr key={t.key} className={on ? "" : "opacity-40"}>
                      <td className="border-b border-border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(t.key)}
                          className="h-4 w-4 accent-[color:var(--c-accent)]"
                        />
                      </td>
                      <td className="num-mono border-b border-border px-3 py-2 text-[0.8rem] text-fg-secondary tabular-nums">
                        {formatDateBR(t.data)}
                      </td>
                      <td className="border-b border-border px-3 py-2 text-[0.85rem] text-fg-primary">
                        {t.descricao}
                      </td>
                      <td
                        className={`num-mono border-b border-border px-3 py-2 text-right text-[0.85rem] font-medium tabular-nums ${
                          t.type === "receita" ? "text-credit" : "text-debit"
                        }`}
                      >
                        {t.type === "receita" ? "+" : "−"}
                        {formatBRL(t.valor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8rem] text-fg-muted">
              {selectedKeys.length} de {txns.length} selecionado(s)
            </span>
            <button
              type="button"
              onClick={doImport}
              disabled={!canImport}
              className="btn btn-green disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {pending
                ? "Importando..."
                : `Importar ${selectedKeys.length} lançamento(s)`}
            </button>
          </div>
          {!accountId && (
            <p className="text-right text-[0.78rem] text-debit">
              Selecione a conta de destino antes de importar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
