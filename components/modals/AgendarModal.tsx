"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Bell } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { FormGroup, FormRow } from "@/components/ui/FormField";
import { CATEGORIES } from "@/lib/categories";
import {
  initialActionState,
  todayBR,
  type Schedule,
} from "@/features/common/types";
import { saveScheduleAction } from "@/features/schedules/actions";
import { useModals } from "./ModalsProvider";

const REMINDERS = [
  "No dia",
  "1 dia antes",
  "3 dias antes",
  "5 dias antes",
  "7 dias antes",
];

function SubmitBtn({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Salvando..."
    : editing
      ? "Atualizar Agendamento"
      : "Agendar Despesa";
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-dark btn-full btn-lg disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function AgendarForm({
  onDone,
  initial,
}: {
  onDone: () => void;
  initial?: Schedule;
}) {
  const { accounts } = useModals();
  const [active, setActive] = useState<Set<string>>(
    () => new Set(initial?.lembretes ?? []),
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initial?.payment_method ?? "",
  );
  const needsPaymentDetails =
    paymentMethod === "pix" || paymentMethod === "transferencia";
  const [frequencia, setFrequencia] = useState<string>(
    initial?.frequencia ?? "mensal",
  );
  const isEditing = !!initial;
  const showQuantidade = frequencia === "mensal" && !isEditing;
  const [state, formAction] = useFormState(
    saveScheduleAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setActive(new Set());
      setPaymentMethod("");
      setFrequencia("mensal");
      onDone();
    }
  }, [state.ok, onDone]);

  const toggle = (key: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <form ref={formRef} action={formAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <FormGroup label="Descrição" htmlFor="agendar-descricao">
        <input
          id="agendar-descricao"
          name="descricao"
          type="text"
          required
          className="form-input"
          placeholder="Ex: Netflix, Aluguel, Academia..."
          defaultValue={initial?.descricao ?? ""}
        />
      </FormGroup>

      <FormRow>
        <FormGroup label="Valor (R$)" htmlFor="agendar-valor">
          <input
            id="agendar-valor"
            name="valor"
            type="text"
            required
            className="form-input"
            placeholder="0,00"
            inputMode="decimal"
            defaultValue={
              initial
                ? initial.valor.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })
                : ""
            }
          />
        </FormGroup>
        <FormGroup label="Frequência" htmlFor="agendar-frequencia">
          <select
            id="agendar-frequencia"
            name="frequencia"
            className="form-select"
            value={frequencia}
            onChange={(e) => setFrequencia(e.target.value)}
          >
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
            <option value="anual">Anual</option>
          </select>
        </FormGroup>
      </FormRow>

      {showQuantidade && (
        <FormGroup
          label="Quantidade de meses"
          htmlFor="agendar-quantidade-meses"
        >
          <input
            id="agendar-quantidade-meses"
            name="quantidade_meses"
            type="number"
            min={1}
            max={120}
            defaultValue={1}
            className="form-input"
            placeholder="Ex: 12 para um ano de agendamentos"
          />
        </FormGroup>
      )}

      <FormRow>
        <FormGroup label="Data de Vencimento" htmlFor="agendar-vencimento">
          <input
            id="agendar-vencimento"
            name="vencimento"
            type="date"
            required
            className="form-input"
            defaultValue={initial?.vencimento ?? todayBR()}
          />
        </FormGroup>
        <FormGroup label="Categoria" htmlFor="agendar-categoria">
          <select
            id="agendar-categoria"
            name="categoria"
            className="form-select"
            defaultValue={initial?.categoria ?? ""}
          >
            <option value="">Selecione</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormGroup>
      </FormRow>

      <FormGroup label="Conta para Débito" htmlFor="agendar-conta">
        <select
          id="agendar-conta"
          name="account_id"
          className="form-select"
          defaultValue={initial?.account_id ?? ""}
        >
          <option value="">Selecione</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label="Forma de Pagamento" htmlFor="agendar-pagamento">
        <select
          id="agendar-pagamento"
          name="payment_method"
          className="form-select"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">Selecione</option>
          <option value="pix">PIX</option>
          <option value="transferencia">Transferência bancária</option>
          <option value="boleto">Boleto</option>
        </select>
      </FormGroup>

      {needsPaymentDetails && (
        <FormGroup
          label={paymentMethod === "pix" ? "Chave PIX" : "Dados bancários"}
          htmlFor="agendar-pagamento-detalhes"
        >
          <input
            id="agendar-pagamento-detalhes"
            name="payment_details"
            type="text"
            className="form-input"
            placeholder={
              paymentMethod === "pix"
                ? "CPF, CNPJ, e-mail, telefone ou chave aleatória"
                : "Banco, agência, conta e titular"
            }
            defaultValue={initial?.payment_details ?? ""}
          />
        </FormGroup>
      )}

      <div className="mb-4 flex flex-col gap-1.5">
        <div className="mb-3 flex items-center gap-2 text-[0.85rem] text-fg-secondary">
          <Bell className="h-4 w-4" />
          Lembretes (dias antes do vencimento)
        </div>
        <div className="flex flex-wrap gap-2">
          {REMINDERS.map((label) => {
            const on = active.has(label);
            return (
              <label
                key={label}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[0.8rem] transition-all ${
                  on
                    ? "border-brand-blue bg-brand-blue-bg text-brand-blue"
                    : "border-border text-fg-secondary hover:border-brand-blue hover:text-brand-blue"
                }`}
              >
                <input
                  type="checkbox"
                  name="lembretes"
                  value={label}
                  checked={on}
                  onChange={() => toggle(label)}
                  className="hidden"
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      {state.error && (
        <p className="mb-3 rounded border border-brand-red-border bg-brand-red-bg px-3 py-2 text-sm text-brand-red">
          {state.error}
        </p>
      )}

      <SubmitBtn editing={!!initial} />
    </form>
  );
}

export default function AgendarModal() {
  const { current, close, editing } = useModals();
  const open = current === "agendar";
  const isEdit = editing?.kind === "agendar";
  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? "Editar Agendamento" : "Agendar Despesa"}
    >
      <AgendarForm onDone={close} initial={isEdit ? editing.row : undefined} />
    </Modal>
  );
}
