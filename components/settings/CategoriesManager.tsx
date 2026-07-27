"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { initialActionState } from "@/features/common/types";
import {
  createCategoryAction,
  deleteCategoryAction,
} from "@/features/categories/actions";

type Category = { id: string; nome: string };

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-green shrink-0 disabled:opacity-60"
    >
      <Plus className="h-4 w-4" />
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

function DeleteButton({ nome }: { nome: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Remover categoria"
      onClick={(e) => {
        if (
          !confirm(
            `Remover a categoria "${nome}"? Os lançamentos que já usam esse nome não mudam.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-debit-bg hover:text-debit disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export default function CategoriesManager({
  categories,
}: {
  categories: Category[];
}) {
  const [state, formAction] = useFormState(
    createCategoryAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input
          name="nome"
          type="text"
          required
          maxLength={60}
          placeholder="Nova categoria (ex: Marketing)"
          className="form-input"
          aria-label="Nome da nova categoria"
        />
        <AddButton />
      </form>

      {state.error && (
        <p className="mt-2 text-sm text-debit">{state.error}</p>
      )}

      <div className="mt-4 flex flex-col divide-y divide-border rounded border border-border">
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-center text-[0.85rem] text-fg-muted">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-[0.9rem] text-fg-primary">{c.nome}</span>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <DeleteButton nome={c.nome} />
              </form>
            </div>
          ))
        )}
      </div>

      <p className="mt-3 text-[0.75rem] text-fg-muted">
        As categorias aparecem nos lançamentos de receita, despesa e
        agendamento. Remover uma categoria não altera os lançamentos que já a
        utilizam.
      </p>
    </div>
  );
}
