"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { deleteMyAccountAction } from "@/features/user/actions";
import { initialActionState } from "@/features/common/types";

function ConfirmSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn btn-red btn-full disabled:opacity-50"
    >
      {pending ? "Excluindo..." : "Excluir minha conta definitivamente"}
    </button>
  );
}

export default function DeleteMyAccountButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction] = useFormState(
    deleteMyAccountAction,
    initialActionState,
  );

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();

  function close() {
    setOpen(false);
    setTyped("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-red"
      >
        Excluir conta
      </button>

      <Modal open={open} onClose={close} title="Excluir conta definitivamente">
        <form action={formAction}>
          <div className="mb-4 flex items-start gap-3 rounded border border-brand-red-border bg-brand-red-bg px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
            <div className="text-[0.85rem] text-fg-secondary">
              Esta ação é <strong className="text-brand-red">definitiva</strong> e
              não pode ser desfeita. Toda a sua conta será apagada do banco de
              dados: perfil, contas, receitas, despesas, transferências,
              agendamentos, categorias, relatórios e importações. Você será
              desconectado imediatamente.
            </div>
          </div>

          <label
            htmlFor="confirm-delete-account"
            className="mb-1.5 block text-[0.85rem] text-fg-secondary"
          >
            Para confirmar, digite seu e-mail:{" "}
            <strong className="text-fg-primary">{email}</strong>
          </label>
          <input
            id="confirm-delete-account"
            name="confirmEmail"
            type="email"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={email}
            className="form-input mb-3"
          />

          {state.error && (
            <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="btn btn-outline btn-full"
            >
              Cancelar
            </button>
            <ConfirmSubmit disabled={!matches} />
          </div>
        </form>
      </Modal>
    </>
  );
}
