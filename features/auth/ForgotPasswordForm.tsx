"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordResetAction, type ResetState } from "./actions";

const initialState: ResetState = { error: null, sent: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue btn-full btn-lg disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar link de redefinição"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useFormState(
    requestPasswordResetAction,
    initialState,
  );

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded border border-brand-green-border bg-brand-green-bg px-3 py-3 text-sm text-brand-green">
          Se existe uma conta com esse e-mail, enviamos um link para redefinir a
          senha. Verifique sua caixa de entrada (e o spam).
        </p>
        <Link href="/login" className="text-center text-sm text-brand-blue hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-fg-label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="form-input"
          placeholder="voce@empresa.com"
        />
      </div>

      {state.error && (
        <p className="rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="mt-2 text-center text-sm text-fg-secondary">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
