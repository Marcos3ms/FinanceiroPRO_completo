"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signupAction, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-green btn-full btn-lg disabled:opacity-60"
    >
      {pending ? "Criando conta..." : "Criar conta"}
    </button>
  );
}

export default function SignupForm() {
  const [state, formAction] = useFormState(signupAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="full_name"
            className="text-sm font-medium text-fg-label"
          >
            Nome completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="form-input"
            placeholder="Marcos Souza"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="username"
            className="text-sm font-medium text-fg-label"
          >
            Usuário
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="form-input"
            placeholder="marcos"
          />
        </div>
      </div>

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-fg-label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="form-input"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {state.error && (
        <p className="rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="mt-2 text-center text-sm text-fg-secondary">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Fazer login
        </Link>
      </p>
    </form>
  );
}
