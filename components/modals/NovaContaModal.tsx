"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { FormGroup, FormRow } from "@/components/ui/FormField";
import { initialActionState, type Account } from "@/features/common/types";
import { saveAccountAction } from "@/features/accounts/actions";
import { useModals } from "./ModalsProvider";

function SubmitBtn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Salvando..."
    : editing
      ? "Atualizar Conta"
      : "Salvar Conta";
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue btn-full btn-lg disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ContaForm({
  onDone,
  initial,
}: {
  onDone: () => void;
  initial?: Account;
}) {
  const [state, formAction] = useFormState(
    saveAccountAction,
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

      <FormGroup label="Nome da Conta" htmlFor="conta-nome">
        <input
          id="conta-nome"
          name="nome"
          type="text"
          required
          className="form-input"
          placeholder="Ex: Conta Corrente Itaú"
          defaultValue={initial?.nome ?? ""}
        />
      </FormGroup>

      <FormGroup label="Banco" htmlFor="conta-banco">
        <input
          id="conta-banco"
          name="banco"
          type="text"
          className="form-input"
          placeholder="Ex: Itaú, Bradesco, Nubank..."
          defaultValue={initial?.banco ?? ""}
        />
      </FormGroup>

      <FormRow>
        <FormGroup label="Agência" htmlFor="conta-agencia">
          <input
            id="conta-agencia"
            name="agencia"
            type="text"
            className="form-input"
            placeholder="0000"
            defaultValue={initial?.agencia ?? ""}
          />
        </FormGroup>
        <FormGroup label="Conta" htmlFor="conta-numero">
          <input
            id="conta-numero"
            name="conta"
            type="text"
            className="form-input"
            placeholder="00000-0"
            defaultValue={initial?.conta ?? ""}
          />
        </FormGroup>
      </FormRow>

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn editing={!!initial} />
    </form>
  );
}

export default function NovaContaModal() {
  const { current, close, editing } = useModals();
  const open = current === "nova-conta";
  const isEdit = editing?.kind === "conta";
  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? "Editar Conta" : "Nova Conta"}
    >
      <ContaForm onDone={close} initial={isEdit ? editing.row : undefined} />
    </Modal>
  );
}
