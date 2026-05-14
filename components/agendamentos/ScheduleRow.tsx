"use client";

import { useTransition } from "react";
import EditButton from "@/components/ui/EditButton";
import { DeleteIconButton } from "@/components/ui/DeleteButton";
import { formatBRL, type Schedule } from "@/features/common/types";
import {
  deleteScheduleAction,
  markScheduleAsPaidAction,
} from "@/features/schedules/actions";

const FREQ_LABEL: Record<string, string> = {
  mensal: "Mensal",
  semanal: "Semanal",
  anual: "Anual",
};

type Status = "pago" | "atrasado" | "vence_hoje" | "pendente";

const STATUS_LABEL: Record<Status, string> = {
  pago: "Pago",
  atrasado: "Atrasado",
  vence_hoje: "Vence hoje",
  pendente: "Pendente",
};

const STATUS_CLASS: Record<Status, string> = {
  pago: "bg-brand-green-bg text-brand-green",
  atrasado: "bg-brand-red-bg text-brand-red",
  vence_hoje: "bg-yellow-500/15 text-yellow-500",
  pendente: "bg-brand-blue-bg text-brand-blue",
};

export default function ScheduleRow({
  schedule,
  accountName,
  status,
}: {
  schedule: Schedule;
  accountName: string;
  status: Status;
}) {
  const [pending, start] = useTransition();
  const isPaid = status === "pago";

  const handlePay = () => {
    if (isPaid) return;
    if (
      !confirm(
        `Marcar "${schedule.descricao}" como paga? A despesa será registrada automaticamente em Despesas.`,
      )
    )
      return;
    const fd = new FormData();
    fd.append("id", schedule.id);
    start(async () => {
      await markScheduleAsPaidAction(fd);
    });
  };

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="border-b border-border px-5 py-3.5">
        {isPaid ? (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={pending}
            title="Clique para marcar como paga"
            className={`inline-flex cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50 ${STATUS_CLASS[status]}`}
          >
            {pending ? "Pagando..." : STATUS_LABEL[status]}
          </button>
        )}
      </td>
      <td className="border-b border-border px-5 py-3.5 text-[0.85rem] text-fg-secondary">
        {accountName}
      </td>
      <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-primary">
        {schedule.descricao}
        {schedule.categoria && (
          <span className="ml-2 text-[0.75rem] text-fg-muted">
            {schedule.categoria}
          </span>
        )}
      </td>
      <td className="border-b border-border px-5 py-3.5 text-right text-[0.9rem] font-semibold text-fg-primary">
        {formatBRL(schedule.valor)}
      </td>
      <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-secondary">
        {FREQ_LABEL[schedule.frequencia] ?? schedule.frequencia}
      </td>
      <td className="border-b border-border px-5 py-3.5 text-[0.9rem] text-fg-secondary">
        {new Date(schedule.vencimento).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })}
      </td>
      <td className="border-b border-border px-5 py-3.5 print:hidden">
        <div className="flex items-center gap-1">
          <EditButton payload={{ kind: "agendar", row: schedule }} />
          <form action={deleteScheduleAction}>
            <input type="hidden" name="id" value={schedule.id} />
            <DeleteIconButton confirmMessage="Excluir este agendamento?" />
          </form>
        </div>
      </td>
    </tr>
  );
}
