import { HiOutlinePencilSquare } from "react-icons/hi2";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { isLeadOverdue } from "@/lib/crm/metrics";
import { leadDateOnly } from "@/lib/crm/model";
import type { Lead } from "@/types";
import { formatCurrencyBRL, formatDateOnly } from "@/utils/format";
import StageChip from "./StageChip";

interface LeadsTableProps {
  leads: Lead[];
  today: string;
  showOwner: boolean;
  onEdit: (lead: Lead) => void;
}

export default function LeadsTable({ leads, today, showOwner, onEdit }: LeadsTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Contato</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Serviço</th>
              <th className="px-4 py-3 text-left">Etapa</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Próxima ação</th>
              {showOwner ? <th className="px-4 py-3 text-left">Dono</th> : null}
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Editar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const date = leadDateOnly(lead);
              const overdue = isLeadOverdue(lead, today);
              return (
                <tr key={lead._id} className="cursor-pointer" onClick={() => onEdit(lead)}>
                  <td className="px-4 py-3 font-semibold text-charcoal">{lead.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{lead.company || "Sem empresa"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{lead.service}</td>
                  <td className="px-4 py-3">
                    <StageChip stage={lead.stage} label={LEAD_STAGE_LABELS[lead.stage]} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-charcoal">
                    {formatCurrencyBRL(lead.value || 0)}
                  </td>
                  <td className={`px-4 py-3 ${overdue ? "font-semibold text-burgundy" : "text-charcoal/70"}`}>
                    {date ? formatDateOnly(date) : <span className="text-charcoal/35">—</span>}
                  </td>
                  {showOwner ? <td className="px-4 py-3 text-charcoal/70">{lead.ownerName || "—"}</td> : null}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-ghost h-8 w-8"
                      aria-label={`Editar ${lead.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(lead);
                      }}
                    >
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
