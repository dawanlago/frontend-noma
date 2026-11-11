import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { FinanceEntry } from "@/types";
import { entryTotal } from "@/lib/finance/lateCharge";
import { formatCurrencyBRL } from "@/utils/format";

interface DeleteEntryModalProps {
  entry: FinanceEntry | null;
  onClose: () => void;
  onConfirm: (entry: FinanceEntry, scope?: "series" | "installments") => Promise<void>;
}

export default function DeleteEntryModal({ entry, onClose, onConfirm }: DeleteEntryModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recurring = Boolean(entry?.recurringId);
  const installment = entry?.installmentGroupId && entry.installment ? entry.installment : null;
  const hasNext = Boolean(installment && installment.number < installment.total);

  async function run(scope?: "series" | "installments") {
    if (!entry) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(entry, scope);
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível excluir a movimentação.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(entry)}
      onClose={onClose}
      title={recurring ? "Excluir despesa recorrente" : installment ? `Excluir parcela ${installment.number}/${installment.total}` : "Excluir movimentação"}
      description={
        entry ? `${entry.description} • ${formatCurrencyBRL(entryTotal(entry))}` : undefined
      }
      footer={
        hasNext ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-secondary" onClick={() => run()} disabled={busy}>
              Só esta parcela
            </button>
            <button type="button" className="btn-danger" onClick={() => run("installments")} disabled={busy}>
              Esta e as próximas
            </button>
          </div>
        ) : recurring ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-secondary" onClick={() => run()} disabled={busy}>
              Excluir só deste mês
            </button>
            <button type="button" className="btn-danger" onClick={() => run("series")} disabled={busy}>
              Encerrar recorrência
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn-danger" onClick={() => run()} disabled={busy}>
              Excluir
            </button>
          </>
        )
      }
    >
      <p className="text-sm text-charcoal/70">
        {hasNext
          ? "Esta movimentação faz parte de um parcelamento. Você pode excluir só esta parcela ou ela e todas as parcelas seguintes."
          : recurring
          ? "Esta despesa se repete todo mês. Você pode removê-la apenas deste mês ou encerrar a recorrência — nesse caso ela deixa de aparecer como prevista nos próximos meses."
          : "Essa ação não pode ser desfeita."}
      </p>
      {error ? <p className="mt-3 text-sm font-medium text-burgundy">{error}</p> : null}
    </Modal>
  );
}
