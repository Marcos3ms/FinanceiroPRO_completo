"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { moveAccountAction } from "@/features/accounts/actions";
import { useModals } from "./ModalsProvider";

const ARROW_BTN =
  "flex h-8 w-8 items-center justify-center rounded-sm text-fg-muted transition-all hover:bg-bg-card hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent";

export default function ReordenarContasModal() {
  const { current, close, accounts } = useModals();
  const open = current === "reordenar-contas";

  return (
    <Modal open={open} onClose={close} title="Reordenar contas">
      <p className="mb-4 text-[0.85rem] text-fg-secondary">
        Use as setas para definir a ordem em que as contas aparecem nos
        relatórios e nas listas.
      </p>

      {accounts.length === 0 ? (
        <p className="text-[0.85rem] italic text-fg-muted">
          Nenhuma conta cadastrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((a, i) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded border border-border bg-bg-elevated px-3 py-2"
            >
              <span className="num-mono w-5 text-right text-[0.8rem] text-fg-muted tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-[0.9rem] text-fg-primary">
                {a.nome}
              </span>
              <form action={moveAccountAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="dir" value="up" />
                <button
                  type="submit"
                  disabled={i === 0}
                  title="Mover para cima"
                  className={ARROW_BTN}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </form>
              <form action={moveAccountAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="dir" value="down" />
                <button
                  type="submit"
                  disabled={i === accounts.length - 1}
                  title="Mover para baixo"
                  className={ARROW_BTN}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={close}
        className="btn btn-outline btn-full mt-5"
      >
        Fechar
      </button>
    </Modal>
  );
}
