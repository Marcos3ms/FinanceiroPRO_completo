"use client";

import { useFormState, useFormStatus } from "react-dom";
import { initialActionState } from "@/features/common/types";
import { updateCompanyAction } from "@/features/profile/actions";

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-blue self-end disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export default function CompanyForm({
  initialName,
  initialCnpj,
}: {
  initialName: string;
  initialCnpj: string;
}) {
  const [state, formAction] = useFormState(
    updateCompanyAction,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="no-print mb-5 flex flex-wrap items-end gap-5 rounded-lg border border-border bg-bg-card px-6 py-5"
    >
      <div className="flex min-w-[200px] flex-[2] flex-col gap-1.5">
        <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
          Nome da Empresa
        </label>
        <input
          name="company_name"
          type="text"
          defaultValue={initialName}
          className="form-input"
          placeholder="Ex: Saudemed Ltda."
        />
      </div>
      <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
        <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
          CNPJ
        </label>
        <input
          name="cnpj"
          type="text"
          defaultValue={initialCnpj}
          className="form-input"
          placeholder="00.000.000/0000-00"
        />
      </div>
      <SaveBtn />
      {state.error && (
        <p className="basis-full text-sm text-brand-red">{state.error}</p>
      )}
      {state.ok && (
        <p className="basis-full text-sm text-brand-green">
          Dados da empresa atualizados.
        </p>
      )}
    </form>
  );
}
