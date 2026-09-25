import { HiOutlineDocumentText, HiOutlinePencilSquare } from "react-icons/hi2";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { proposalLeads } from "@/lib/crm/metrics";
import type { Lead } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";
import EmptyState from "./EmptyState";
import StageChip from "./StageChip";

interface ProposalsViewProps {
  leads: Lead[];
  showOwner: boolean;
  onEdit: (lead: Lead) => void;
  onOpenGenerator: (lead: Lead) => void;
}

export default function ProposalsView({ leads, showOwner, onEdit, onOpenGenerator }: ProposalsViewProps) {
  const items = proposalLeads(leads);

  if (!items.length) {
    return (
      <EmptyState
        title="Nenhuma proposta em andamento"
        text="Quando um lead chegar à etapa “Proposta enviada”, ele aparece aqui para você acompanhar."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((lead) => (
        <article key={lead._id} className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-charcoal">{lead.name}</h3>
              <p className="truncate text-sm text-charcoal/55">{lead.company || "Sem empresa"}</p>
            </div>
            <StageChip stage={lead.stage} label={LEAD_STAGE_LABELS[lead.stage]} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-charcoal/50">{lead.service}</p>
              <p className="text-xl font-semibold tracking-tight text-charcoal">{formatCurrencyBRL(lead.value || 0)}</p>
            </div>
            {showOwner && lead.ownerName ? (
              <span className="chip bg-charcoal/[0.06] text-charcoal/60">{lead.ownerName}</span>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-charcoal/[0.06] pt-4">
            <button type="button" className="btn-secondary flex-1 px-3 py-2" onClick={() => onEdit(lead)}>
              <HiOutlinePencilSquare className="h-4 w-4" /> Editar lead
            </button>
            <button type="button" className="btn-primary flex-1 px-3 py-2" onClick={() => onOpenGenerator(lead)}>
              <HiOutlineDocumentText className="h-4 w-4" /> Abrir no Gerador de Propostas
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
