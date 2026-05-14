"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Modal from "@/components/ui/Modal";
import { FormGroup } from "@/components/ui/FormField";
import { initialActionState } from "@/features/common/types";
import { updateProfileAction } from "@/features/profile/actions";
import { useModals } from "./ModalsProvider";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue btn-full btn-lg disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { profile, email } = useModals();
  const [state, formAction] = useFormState(
    updateProfileAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form ref={formRef} action={formAction}>
      <FormGroup label="Nome do Usuário" htmlFor="profile-username">
        <input
          id="profile-username"
          name="username"
          type="text"
          required
          defaultValue={profile?.username ?? ""}
          className="form-input"
        />
      </FormGroup>

      <FormGroup label="Nome do Perfil" htmlFor="profile-fullname">
        <input
          id="profile-fullname"
          name="full_name"
          type="text"
          required
          defaultValue={profile?.full_name ?? ""}
          className="form-input"
        />
      </FormGroup>

      <FormGroup label="E-mail" htmlFor="profile-email">
        <input
          id="profile-email"
          name="email"
          type="email"
          required
          defaultValue={email}
          className="form-input"
        />
      </FormGroup>

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

export default function EditProfileModal() {
  const { current, close } = useModals();
  const open = current === "editar-perfil";
  return (
    <Modal open={open} onClose={close} title="Editar Perfil">
      <ProfileForm onDone={close} />
    </Modal>
  );
}
