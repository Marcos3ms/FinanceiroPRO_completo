"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { FormGroup, FormRow } from "@/components/ui/FormField";
import { receitaCategoryOptions } from "@/lib/categories";
import {
  initialActionState,
  todayBR,
  type Transaction,
} from "@/features/common/types";
import { saveReceitaAction } from "@/features/transactions/actions";
import { useModals } from "./ModalsProvider";

function SubmitBtn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Salvando..."
    : editing
      ? "Atualizar Receita"
      : "Salvar Receita";
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-green btn-full btn-lg disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ReceitaForm({
  onDone,
  initial,
}: {
  onDone: () => void;
  initial?: Transaction;
}) {
  const { accounts, categories } = useModals();
  const baseOptions = receitaCategoryOptions(categories);
  const categoryOptions =
    initial?.categoria && !baseOptions.includes(initial.categoria)
      ? [initial.categoria, ...baseOptions]
      : baseOptions;
  const [state, formAction] = useFormState(
    saveReceitaAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form ref={formRef} action={formAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <FormGroup label="Descrição" htmlFor="receita-descricao">
        <input
          id="receita-descricao"
          name="descricao"
          type="text"
          required
          className="form-input"
          placeholder="Ex: Aluguel, Supermercado..."
          defaultValue={initial?.descricao ?? ""}
        />
      </FormGroup>

      <FormRow>
        <FormGroup label="Valor (R$)" htmlFor="receita-valor">
          <input
            id="receita-valor"
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
        <FormGroup label="Data" htmlFor="receita-data">
          <input
            id="receita-data"
            name="data"
            type="date"
            required
            className="form-input"
            defaultValue={initial?.data ?? todayBR()}
          />
        </FormGroup>
      </FormRow>

      <FormGroup label="Conta" htmlFor="receita-conta">
        <select
          id="receita-conta"
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

      <FormGroup label="Categoria" htmlFor="receita-categoria">
        <select
          id="receita-categoria"
          name="categoria"
          className="form-select"
          defaultValue={initial?.categoria ?? ""}
        >
          <option value="">Selecione uma categoria</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormGroup>

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn editing={!!initial} />
    </form>
  );
}

export default function NovaReceitaModal() {
  const { current, close, editing } = useModals();
  const open = current === "nova-receita";
  const isEdit = editing?.kind === "receita";
  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? "Editar Receita" : "Nova Receita"}
    >
      <ReceitaForm onDone={close} initial={isEdit ? editing.row : undefined} />
    </Modal>
  );
}
