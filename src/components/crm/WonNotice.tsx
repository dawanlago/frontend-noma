import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";

/** Confirmação da "Venda feita", com atalho para lançar a entrada no financeiro. */
export default function WonNotice({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const { can } = useAuth();
  return (
    <Modal
      open={Boolean(lead)}
      onClose={onClose}
      title="Venda registrada"
      description={lead ? `${lead.name} · ${formatCurrencyBRL(lead.value || 0)}` : ""}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          {lead && can("financeiro") ? (
            <Link href={`/financeiro?negociacao=${lead._id}`} className="btn-primary" onClick={onClose}>
              Lançar entrada no financeiro
            </Link>
          ) : null}
        </>
      }
    >
      <p className="text-sm text-charcoal/65">
        A negociação foi marcada como venda feita{lead?.contactName ? ` e fica no histórico de ${lead.contactName}` : ""}. Quer lançar o
        valor como entrada no financeiro, já vinculado a esta venda?
      </p>
    </Modal>
  );
}
