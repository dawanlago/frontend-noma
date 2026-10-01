import { useCallback, useEffect, useRef, useState } from "react";
import OptionSelect from "@/components/options/OptionSelect";
import Modal from "@/components/ui/Modal";

export const LOST_REASON_LIST = "lostReason";

export interface LossAnswer {
  lostReason: string;
  lostNote?: string;
}

interface LostReasonDialogProps {
  open: boolean;
  leadName?: string;
  onCancel: () => void;
  onConfirm: (answer: LossAnswer) => void;
}

/** Pergunta o motivo da perda (obrigatório) e uma observação opcional. */
export default function LostReasonDialog({ open, leadName, onCancel, onConfirm }: LostReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setNote("");
    setError("");
  }, [open]);

  function confirm() {
    if (!reason) {
      setError("Escolha o motivo da perda.");
      return;
    }
    onConfirm({ lostReason: reason, lostNote: note.trim() || undefined });
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Por que a negociação foi perdida?"
      description={leadName ? `"${leadName}" vai para a etapa de perda. O motivo fica no histórico e no Painel do CRM.` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-danger" onClick={confirm}>
            Marcar como perdida
          </button>
        </>
      }
    >
      <form
        className="space-y-4 pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Motivo *</span>
          <OptionSelect
            list={LOST_REASON_LIST}
            value={reason}
            placeholder="Selecione o motivo"
            onChange={(value) => {
              setReason(value);
              setError("");
            }}
          />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Observação</span>
          <textarea
            className="input-search min-h-[72px] resize-y"
            value={note}
            placeholder="Opcional: o que aconteceu, com quem fechou, quando retomar..."
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm font-medium text-burgundy">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}

/**
 * Motivo da perda sob demanda:
 *   const loss = useLostReason();
 *   const answer = await loss.ask(lead.name); // null = cancelou
 *   ... {loss.dialog}
 */
export function useLostReason() {
  const [leadName, setLeadName] = useState<string | null>(null);
  const resolver = useRef<((answer: LossAnswer | null) => void) | null>(null);

  const finish = useCallback((answer: LossAnswer | null) => {
    resolver.current?.(answer);
    resolver.current = null;
    setLeadName(null);
  }, []);

  const ask = useCallback(
    (name: string) =>
      new Promise<LossAnswer | null>((resolve) => {
        resolver.current?.(null);
        resolver.current = resolve;
        setLeadName(name);
      }),
    [],
  );

  const dialog = (
    <LostReasonDialog open={leadName !== null} leadName={leadName || undefined} onCancel={() => finish(null)} onConfirm={finish} />
  );

  return { ask, dialog };
}
