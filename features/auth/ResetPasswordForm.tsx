"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePasswordAction, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue btn-full btn-lg disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export default function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-fg-label">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="form-input"
          placeholder="••••••••"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-fg-label">
          Confirme a nova senha
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="form-input"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
