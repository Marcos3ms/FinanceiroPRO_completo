"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { FormGroup, FormRow } from "@/components/ui/FormField";
import {
  CATEGORIES,
  DESPESA_CATEGORY_OPTIONS,
  TRANSFER_CATEGORY,
} from "@/lib/categories";
import {
  initialActionState,
  todayBR,
  type Transaction,
} from "@/features/common/types";
import { saveDespesaAction } from "@/features/transactions/actions";
import { useModals } from "./ModalsProvider";

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
  const { accounts } = useModals();
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
  const needsPaymentDetails =
    paymentMethod === "pix" || paymentMethod === "transferencia";

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setCategoria("");
      setPaymentMethod("");
      onDone();
    }
  }, [state.ok, onDone]);

  // Quando editando, exclui a opção de transferência da lista (ou trava no valor atual)
  const categoryOptions = isEditing
    ? isEditTransfer
      ? [TRANSFER_CATEGORY]
      : CATEGORIES
    : DESPESA_CATEGORY_OPTIONS;

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
            defaultValue={
              initial
                ? initial.valor.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })
                : ""
            }
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

      {!showTransferFields && (
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
            </select>
          </FormGroup>

          {needsPaymentDetails && (
            <FormGroup
              label={
                paymentMethod === "pix" ? "Chave PIX" : "Dados bancários"
              }
              htmlFor="despesa-pagamento-detalhes"
            >
              <input
                id="despesa-pagamento-detalhes"
                name="payment_details"
                type="text"
                className="form-input"
                placeholder={
                  paymentMethod === "pix"
                    ? "CPF, CNPJ, e-mail, telefone ou chave aleatória"
                    : "Banco, agência, conta e titular"
                }
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
