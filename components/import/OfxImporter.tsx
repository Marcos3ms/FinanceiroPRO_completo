"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Upload, FileText, Check, X } from "lucide-react";
import { FormGroup } from "@/components/ui/FormField";
import { formatBRL } from "@/features/common/types";
import { TRANSFER_CATEGORY } from "@/lib/categories";
import { parseOfx, type OfxTransaction } from "@/features/import/ofx";
import {
  suggestCategory,
  type CategoryRule,
} from "@/features/import/categorize";
import {
  importOfxAction,
  analyzeOfxAction,
  type ImportResult,
  type AnalyzedRow,
} from "@/features/import/actions";
import type { RowStatus } from "@/features/import/classify";

type Account = { id: string; nome: string };

/** Lê o arquivo respeitando o charset declarado no cabeçalho OFX. */
async function readOfxFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
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

const STATUS_LABEL: Record<RowStatus, string> = {
  novo: "Novo",
  concilia: "Concilia",
  transferencia: "Transferência",
  importado: "Já importado",
};
const STATUS_CLASS: Record<RowStatus, string> = {
  novo: "text-fg-muted",
  concilia: "text-accent",
  transferencia: "text-credit",
  importado: "text-debit",
};

export default function OfxImporter({
  accounts,
  categories,
  rules,
}: {
  accounts: Account[];
  categories: string[];
  rules: CategoryRule[];
}) {
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [txns, setTxns] = useState<OfxTransaction[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [categoriaByKey, setCategoriaByKey] = useState<Record<string, string>>(
    {},
  );
  // Contas origem/destino por linha marcada manualmente como transferência.
  const [transferAccts, setTransferAccts] = useState<
    Record<string, { origem: string; destino: string }>
  >({});
  const [statuses, setStatuses] = useState<Record<string, AnalyzedRow>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Analisa contra o banco quando há conta + arquivo (dedup e conciliação).
  useEffect(() => {
    if (!content || !accountId || txns.length === 0) {
      setStatuses({});
      return;
    }
    let active = true;
    const keys = txns.map((t) => t.key);
    analyzeOfxAction(content, accountId, keys).then((res) => {
      if (!active) return;
      setStatuses(res);
      // Desmarca por padrão os já importados.
      setExcluded((prev) => {
        const next = new Set(prev);
        for (const k of keys) if (res[k]?.status === "importado") next.add(k);
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [content, accountId, txns]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setParseError(null);
    setStatuses({});
    if (!file) return;
    setFileName(file.name);
    const text = await readOfxFile(file);
    const parsed = parseOfx(text);
    if (parsed.length === 0) {
      setTxns([]);
      setContent("");
      setParseError(
        "Nenhum lançamento encontrado. O arquivo é um extrato OFX válido?",
      );
      return;
    }
    // Pré-preenche categoria pela memória de regras.
    const initialCat: Record<string, string> = {};
    for (const t of parsed) {
      const s = suggestCategory(t.descricao, rules);
      if (s) initialCat[t.key] = s;
    }
    setContent(text);
    setTxns(parsed);
    setExcluded(new Set());
    setCategoriaByKey(initialCat);
  }

  function clearFile() {
    setFileName("");
    setContent("");
    setTxns([]);
    setExcluded(new Set());
    setCategoriaByKey({});
    setTransferAccts({});
    setStatuses({});
    setParseError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const toggle = (key: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const setCategoria = (key: string, value: string) => {
    setCategoriaByKey((prev) => ({ ...prev, [key]: value }));
    // Ao marcar como transferência, pré-preenche a conta do extrato no lado
    // correto (débito -> origem; crédito -> destino) e deixa o outro em aberto.
    if (value === TRANSFER_CATEGORY) {
      setTransferAccts((prev) => {
        if (prev[key]) return prev;
        const t = txns.find((x) => x.key === key);
        const preset =
          t?.type === "despesa"
            ? { origem: accountId, destino: "" }
            : { origem: "", destino: accountId };
        return { ...prev, [key]: preset };
      });
    }
  };

  const setTransferAcct = (
    key: string,
    side: "origem" | "destino",
    value: string,
  ) => {
    setTransferAccts((prev) => ({
      ...prev,
      [key]: {
        origem: prev[key]?.origem ?? "",
        destino: prev[key]?.destino ?? "",
        [side]: value,
      },
    }));
  };

  // Inclui "Transferência entre contas" como opção manual de categoria.
  const categoryOptions = categories.includes(TRANSFER_CATEGORY)
    ? categories
    : [...categories, TRANSFER_CATEGORY];

  const selectedTxns = txns.filter((t) => !excluded.has(t.key));
  const selectedKeys = selectedTxns.map((t) => t.key);
  const totalCredito = selectedTxns
    .filter((t) => t.type === "receita")
    .reduce((s, t) => s + t.valor, 0);
  const totalDebito = selectedTxns
    .filter((t) => t.type === "despesa")
    .reduce((s, t) => s + t.valor, 0);

  // Uma linha marcada como transferência (manual) exige origem e destino
  // distintos. Auto-detectadas já têm contraparte e não precisam disso.
  const isAutoTransfer = (key: string) =>
    statuses[key]?.status === "transferencia";
  const incompleteTransfer = (key: string): boolean => {
    if (categoriaByKey[key] !== TRANSFER_CATEGORY) return false;
    if (isAutoTransfer(key)) return false;
    const ta = transferAccts[key];
    return !ta || !ta.origem || !ta.destino || ta.origem === ta.destino;
  };
  const hasIncompleteTransfer = selectedKeys.some(incompleteTransfer);

  function doImport() {
    setResult(null);
    const catByKey: Record<string, string> = {};
    const transfersByKey: Record<string, { origem: string; destino: string }> =
      {};
    for (const k of selectedKeys) {
      if (categoriaByKey[k]) catByKey[k] = categoriaByKey[k];
      if (categoriaByKey[k] === TRANSFER_CATEGORY && transferAccts[k])
        transfersByKey[k] = transferAccts[k];
    }
    startTransition(async () => {
      const res = await importOfxAction(
        content,
        accountId,
        selectedKeys,
        catByKey,
        transfersByKey,
      );
      setResult(res);
      if (res.ok) clearFile();
    });
  }

  const canImport =
    !!accountId &&
    selectedKeys.length > 0 &&
    !pending &&
    !hasIncompleteTransfer;

  return (
    <div className="flex flex-col gap-5">
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
          <button
            type="button"
            onClick={clearFile}
            disabled={pending}
            className="ml-1 inline-flex items-center gap-1 text-[0.78rem] text-fg-muted underline-offset-2 transition-colors hover:text-debit hover:underline disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Descartar
          </button>
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
              {result.imported} importado(s)
              {result.reconciled > 0 &&
                `, ${result.reconciled} conciliado(s)`}
              {result.transfers > 0 &&
                `, ${result.transfers} transferência(s) vinculada(s)`}
              {result.duplicated > 0 &&
                `, ${result.duplicated} já existia(m)`}
              .
            </span>
          ) : (
            result.error
          )}
        </div>
      )}

      {txns.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[0.85rem] text-fg-secondary">
              Revise, ajuste a categoria e desmarque o que não quer importar.
            </div>
            <div className="num-mono flex gap-4 text-[0.8rem]">
              <span className="text-credit">+ {formatBRL(totalCredito)}</span>
              <span className="text-debit">− {formatBRL(totalDebito)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["", "Data", "Descrição", "Categoria", "Situação", "Valor"].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={`border-b border-border bg-bg-elevated px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted ${
                          h === "Valor" ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const on = !excluded.has(t.key);
                  const analyzed = statuses[t.key];
                  const status = analyzed?.status;
                  const isTransfer = status === "transferencia";
                  const manualTransfer =
                    !isTransfer && categoriaByKey[t.key] === TRANSFER_CATEGORY;
                  const ta = transferAccts[t.key];
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
                      <td className="border-b border-border px-3 py-2 align-top">
                        {isTransfer ? (
                          <span className="text-[0.8rem] text-fg-muted">
                            Transferência entre contas
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <select
                              value={categoriaByKey[t.key] ?? ""}
                              onChange={(e) =>
                                setCategoria(t.key, e.target.value)
                              }
                              className="form-select !py-1 text-[0.8rem]"
                            >
                              <option value="">—</option>
                              {categoryOptions.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            {manualTransfer && (
                              <div className="flex flex-col gap-1.5 rounded border border-border bg-bg-elevated p-2">
                                <label className="flex flex-col gap-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                                  Conta origem
                                  <select
                                    value={ta?.origem ?? ""}
                                    onChange={(e) =>
                                      setTransferAcct(
                                        t.key,
                                        "origem",
                                        e.target.value,
                                      )
                                    }
                                    className="form-select !py-1 text-[0.8rem] font-normal normal-case tracking-normal text-fg-primary"
                                  >
                                    <option value="">Selecione</option>
                                    {accounts.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.nome}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
                                  Conta destino
                                  <select
                                    value={ta?.destino ?? ""}
                                    onChange={(e) =>
                                      setTransferAcct(
                                        t.key,
                                        "destino",
                                        e.target.value,
                                      )
                                    }
                                    className="form-select !py-1 text-[0.8rem] font-normal normal-case tracking-normal text-fg-primary"
                                  >
                                    <option value="">Selecione</option>
                                    {accounts.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.nome}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                {incompleteTransfer(t.key) && (
                                  <span className="text-[0.7rem] text-debit">
                                    Escolha origem e destino diferentes.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-border px-3 py-2 align-top text-[0.72rem]">
                        {manualTransfer ? (
                          <span className={STATUS_CLASS.transferencia}>
                            {STATUS_LABEL.transferencia}
                          </span>
                        ) : status ? (
                          <span className={STATUS_CLASS[status]}>
                            {STATUS_LABEL[status]}
                            {isTransfer && analyzed?.counterpartName && (
                              <span className="text-fg-muted">
                                {" "}
                                ↔ {analyzed.counterpartName}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.8rem] text-fg-muted">
              {selectedKeys.length} de {txns.length} selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearFile}
                disabled={pending}
                className="btn btn-outline disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Excluir arquivo
              </button>
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
          </div>
          {!accountId && (
            <p className="text-right text-[0.78rem] text-debit">
              Selecione a conta de destino antes de importar.
            </p>
          )}
          {accountId && hasIncompleteTransfer && (
            <p className="text-right text-[0.78rem] text-debit">
              Há transferência(s) sem conta de origem/destino definida.
            </p>
          )}
        </>
      )}
    </div>
  );
}
