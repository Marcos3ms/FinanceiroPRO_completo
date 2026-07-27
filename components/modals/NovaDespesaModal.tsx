"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { FormGroup, FormRow } from "@/components/ui/FormField";
import { despesaCategoryOptions, TRANSFER_CATEGORY } from "@/lib/categories";
import {
  initialActionState,
  todayBR,
  type Transaction,
} from "@/features/common/types";
import { saveDespesaAction } from "@/features/transactions/actions";
import { useModals } from "./ModalsProvider";

const PAYMENT_DETAIL_FIELD: Record<
  string,
  { label: string; placeholder: string }
> = {
  pix: {
    label: "Chave PIX",
    placeholder: "CPF, CNPJ, e-mail, telefone ou chave aleatória",
  },
  transferencia: {
    label: "Dados bancários",
    placeholder: "Banco, agência, conta e titular",
  },
  boleto: {
    label: "Identificação do boleto",
    placeholder: "Banco emissor, número, beneficiário",
  },
  cartao: {
    label: "Identificação do cartão",
    placeholder: "Bandeira, final do número, titular",
  },
};

function parseInputValor(raw: string): number {
  if (!raw) return 0;
  const normalized = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/[R$]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function SubmitBtn({
  editing,
  isTransfer,
}: {
  editing: boolean;
  isTransfer: boolean;
}) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Salvando..."
    : editing
      ? "Atualizar Despesa"
      : isTransfer
        ? "Salvar Transferência"
        : "Salvar Despesa";
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-red btn-full btn-lg disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function DespesaForm({
  onDone,
  initial,
}: {
  onDone: () => void;
  initial?: Transaction;
}) {
  const { accounts, categories } = useModals();
  const [state, formAction] = useFormState(
    saveDespesaAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!initial;
  const isEditTransfer = !!initial?.transfer_id;

  const [categoria, setCategoria] = useState<string>(initial?.categoria ?? "");
  const isTransferSelected = categoria === TRANSFER_CATEGORY;
  const showTransferFields = isTransferSelected && !isEditing;

  const [paymentMethod, setPaymentMethod] = useState<string>(
    initial?.payment_method ?? "",
  );
  const detailField = paymentMethod
    ? (PAYMENT_DETAIL_FIELD[paymentMethod] ?? null)
    : null;

  // Campos de valor, desconto e acréscimo.
  // No banco, `valor` guarda o valor final; o campo do formulário usa o valor
  // base (valor + desconto − acréscimo) para que a edição preserve a composição.
  const initialDesconto = Number(initial?.desconto ?? 0);
  const initialAcrescimo = Number(initial?.acrescimo ?? 0);
  const initialBase = initial
    ? Number(initial.valor) + initialDesconto - initialAcrescimo
    : 0;
  const formatCurrencyInput = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const [valorStr, setValorStr] = useState<string>(
    initial ? formatCurrencyInput(initialBase) : "",
  );
  const [descontoStr, setDescontoStr] = useState<string>(
    initialDesconto > 0 ? formatCurrencyInput(initialDesconto) : "",
  );
  const [acrescimoStr, setAcrescimoStr] = useState<string>(
    initialAcrescimo > 0 ? formatCurrencyInput(initialAcrescimo) : "",
  );

  const valorNum = parseInputValor(valorStr);
  const descontoNum = parseInputValor(descontoStr);
  const acrescimoNum = parseInputValor(acrescimoStr);

  const valorFinal = useMemo(() => {
    const result = valorNum - descontoNum + acrescimoNum;
    return result >= 0 ? result : 0;
  }, [valorNum, descontoNum, acrescimoNum]);

  const hasAdjustments = descontoNum > 0 || acrescimoNum > 0;

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategoria("");
      setPaymentMethod("");
      setValorStr("");
      setDescontoStr("");
      setAcrescimoStr("");
      onDone();
    }
  }, [state.ok, onDone]);

  // Quando editando, exclui a opção de transferência da lista (ou trava no valor atual)
  const baseOptions = isEditing
    ? isEditTransfer
      ? [TRANSFER_CATEGORY]
      : categories
    : despesaCategoryOptions(categories);
  // Preserva a categoria atual mesmo que ela tenha sido removida da lista,
  // para não zerar o campo ao editar um lançamento antigo.
  const categoryOptions =
    initial?.categoria && !baseOptions.includes(initial.categoria)
      ? [initial.categoria, ...baseOptions]
      : baseOptions;

  return (
    <form ref={formRef} action={formAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <FormGroup label="Descrição" htmlFor="despesa-descricao">
        <input
          id="despesa-descricao"
          name="descricao"
          type="text"
          required
          className="form-input"
          placeholder="Ex: Aluguel, Supermercado..."
          defaultValue={initial?.descricao ?? ""}
        />
      </FormGroup>

      <FormRow>
        <FormGroup label="Valor (R$)" htmlFor="despesa-valor">
          <input
            id="despesa-valor"
            name="valor"
            type="text"
            required
            className="form-input"
            placeholder="0,00"
            inputMode="decimal"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Data" htmlFor="despesa-data">
          <input
            id="despesa-data"
            name="data"
            type="date"
            required
            className="form-input"
            defaultValue={initial?.data ?? todayBR()}
          />
        </FormGroup>
      </FormRow>

      {/* Desconto e Acréscimo (não se aplicam a transferências) */}
      {!isTransferSelected && (
        <FormRow>
          <FormGroup label="Desconto (R$)" htmlFor="despesa-desconto">
            <input
              id="despesa-desconto"
              name="desconto"
              type="text"
              className="form-input"
              placeholder="0,00"
              inputMode="decimal"
              value={descontoStr}
              onChange={(e) => setDescontoStr(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Acréscimo (R$)" htmlFor="despesa-acrescimo">
            <input
              id="despesa-acrescimo"
              name="acrescimo"
              type="text"
              className="form-input"
              placeholder="0,00"
              inputMode="decimal"
              value={acrescimoStr}
              onChange={(e) => setAcrescimoStr(e.target.value)}
            />
          </FormGroup>
        </FormRow>
      )}

      {/* Preview do valor final */}
      {!isTransferSelected && hasAdjustments && (
        <div className="mb-4 rounded-lg border border-border bg-bg-elevated px-4 py-3">
          <div className="flex items-center justify-between text-[0.8rem]">
            <span className="text-fg-muted">Valor base:</span>
            <span className="font-medium text-fg-primary">
              {valorNum.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          {descontoNum > 0 && (
            <div className="flex items-center justify-between text-[0.8rem]">
              <span className="text-fg-muted">Desconto:</span>
              <span className="font-medium text-brand-green">
                − {descontoNum.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          )}
          {acrescimoNum > 0 && (
            <div className="flex items-center justify-between text-[0.8rem]">
              <span className="text-fg-muted">Acréscimo:</span>
              <span className="font-medium text-brand-red">
                + {acrescimoNum.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-[0.85rem] font-semibold text-fg-primary">
              Valor final:
            </span>
            <span className="text-[1rem] font-bold text-fg-primary">
              {valorFinal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      )}

      {!showTransferFields && (
        <FormGroup label="Conta" htmlFor="despesa-conta">
          <select
            id="despesa-conta"
            name="account_id"
            className="form-select"
            defaultValue={initial?.account_id ?? ""}
          >
            <option value="">Selecione</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </FormGroup>
      )}

      <FormGroup label="Categoria" htmlFor="despesa-categoria">
        <select
          id="despesa-categoria"
          name="categoria"
          className="form-select disabled:opacity-70"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={isEditTransfer}
        >
          <option value="">Selecione uma categoria</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isEditTransfer && (
          <input type="hidden" name="categoria" value={TRANSFER_CATEGORY} />
        )}
      </FormGroup>

      {!isTransferSelected && (
        <>
          <FormGroup label="Forma de Pagamento" htmlFor="despesa-pagamento">
            <select
              id="despesa-pagamento"
              name="payment_method"
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência bancária</option>
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão</option>
            </select>
          </FormGroup>

          {detailField && (
            <FormGroup
              label={detailField.label}
              htmlFor="despesa-pagamento-detalhes"
            >
              <input
                id="despesa-pagamento-detalhes"
                name="payment_details"
                type="text"
                className="form-input"
                placeholder={detailField.placeholder}
                defaultValue={initial?.payment_details ?? ""}
              />
            </FormGroup>
          )}
        </>
      )}

      {showTransferFields && (
        <FormRow>
          <FormGroup label="Conta Origem" htmlFor="despesa-origem">
            <select
              id="despesa-origem"
              name="account_origem"
              className="form-select"
              defaultValue=""
              required
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Conta Destino" htmlFor="despesa-destino">
            <select
              id="despesa-destino"
              name="account_destino"
              className="form-select"
              defaultValue=""
              required
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </FormGroup>
        </FormRow>
      )}

      {showTransferFields && accounts.length < 2 && (
        <p className="mb-3 rounded border border-border bg-bg-elevated px-3 py-2 text-[0.8rem] text-fg-secondary">
          Cadastre ao menos duas contas em <strong>Contas</strong> para fazer
          uma transferência.
        </p>
      )}

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn editing={isEditing} isTransfer={showTransferFields} />
    </form>
  );
}

export default function NovaDespesaModal() {
  const { current, close, editing } = useModals();
  const open = current === "nova-despesa";
  const isEdit = editing?.kind === "despesa";
  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? "Editar Despesa" : "Nova Despesa"}
    >
      <DespesaForm onDone={close} initial={isEdit ? editing.row : undefined} />
    </Modal>
  );
}
