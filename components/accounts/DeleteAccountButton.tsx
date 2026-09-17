"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { deleteAccountAction } from "@/features/accounts/actions";

function ConfirmSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn btn-red btn-full disabled:opacity-50"
    >
      {pending ? "Excluindo..." : "Excluir conta definitivamente"}
    </button>
  );
}

export default function DeleteAccountButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const matches = typed.trim() === nome.trim();

  function close() {
    setOpen(false);
    setTyped("");
  }

  return (
    <>
      <button
        type="button"
        title="Excluir"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-all hover:bg-brand-red-bg hover:text-brand-red"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={close} title="Excluir conta">
        <form action={deleteAccountAction}>
          <input type="hidden" name="id" value={id} />

          <div className="mb-4 flex items-start gap-3 rounded border border-brand-red-border bg-brand-red-bg px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
            <div className="text-[0.85rem] text-fg-secondary">
              Esta ação é <strong className="text-brand-red">definitiva</strong>.
              Ao excluir a conta{" "}
              <strong className="text-fg-primary">{nome}</strong>, todos os seus
              lançamentos serão apagados também: receitas, despesas,
              transferências, agendamentos e o que aparece em relatórios e na
              visão geral. Não é possível desfazer.
            </div>
          </div>

          <label
            htmlFor={`confirm-delete-${id}`}
            className="mb-1.5 block text-[0.85rem] text-fg-secondary"
          >
            Para confirmar, digite o nome da conta:{" "}
            <strong className="text-fg-primary">{nome}</strong>
          </label>
          <input
            id={`confirm-delete-${id}`}
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={nome}
            className="form-input mb-4"
          />

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
