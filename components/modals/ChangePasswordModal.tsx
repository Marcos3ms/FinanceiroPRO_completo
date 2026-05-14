"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { FormGroup } from "@/components/ui/FormField";
import { initialActionState } from "@/features/common/types";
import { updatePasswordAction } from "@/features/profile/actions";
import { useModals } from "./ModalsProvider";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue btn-full btn-lg disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Atualizar Senha"}
    </button>
  );
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <FormGroup label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={6}
          className="form-input pr-10"
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-fg-muted hover:text-fg-primary"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormGroup>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useFormState(
    updatePasswordAction,
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
      <PasswordField
        id="pw-new"
        name="password"
        label="Nova senha"
        placeholder="Mínimo 6 caracteres"
      />
      <PasswordField
        id="pw-confirm"
        name="confirm"
        label="Confirmar senha"
        placeholder="Repita a nova senha"
      />

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

export default function ChangePasswordModal() {
  const { current, close } = useModals();
  const open = current === "alterar-senha";
  return (
    <Modal open={open} onClose={close} title="Alterar Senha">
      <PasswordForm onDone={close} />
    </Modal>
  );
}
