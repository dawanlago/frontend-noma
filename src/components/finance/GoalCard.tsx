import { HiOutlineFlag, HiOutlinePencilSquare } from "react-icons/hi2";
import { percentOf } from "@/lib/finance/metrics";
import { formatCurrencyBRL } from "@/utils/format";

interface GoalCardProps {
  goal: number;
  received: number;
  canEdit: boolean;
  onEdit: () => void;
}

export default function GoalCard({ goal, received, canEdit, onEdit }: GoalCardProps) {
  const pct = percentOf(received, goal);
  const reached = goal > 0 && received >= goal;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">Meta do mês</h2>
          <p className="text-sm text-charcoal/55">Quanto você quer faturar?</p>
        </div>
        {canEdit && goal > 0 ? (
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onEdit}>
            <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Editar
          </button>
        ) : null}
      </div>

      {goal > 0 ? (
        <>
          <p className="mt-4 text-[26px] font-semibold tabular-nums tracking-tight text-charcoal">{formatCurrencyBRL(goal)}</p>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-charcoal/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${reached ? "bg-sage" : "bg-tan"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-2.5 text-[13px] text-charcoal/60">
            {reached ? (
              <span className="font-semibold text-sage">
                Meta atingida{received > goal ? ` — ${formatCurrencyBRL(received - goal)} acima.` : "."}
              </span>
            ) : (
              <>
                <strong className="text-charcoal">{pct}% concluído.</strong> Faltam {formatCurrencyBRL(goal - received)} para
                atingir a meta.
              </>
            )}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-charcoal/15 p-4 text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-tan/10 text-tan">
            <HiOutlineFlag className="h-4 w-4" />
          </span>
          <p className="mt-2 text-sm text-charcoal/60">
            {canEdit
              ? "Defina uma meta de faturamento para acompanhar o progresso do mês."
              : "Nenhuma meta definida para este mês."}
          </p>
          {canEdit ? (
            <button type="button" className="btn-primary mt-3 px-3 py-2 text-xs" onClick={onEdit}>
              Definir meta
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
