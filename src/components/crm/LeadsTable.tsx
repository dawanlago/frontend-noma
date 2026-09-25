import { isLeadOverdue } from "@/lib/crm/metrics";
import { leadDateOnly } from "@/lib/crm/model";
import type { Funnel, Lead } from "@/types";
import { formatCurrencyBRL, formatDateOnly } from "@/utils/format";
import StageChip from "./StageChip";
import { TemperatureBadge } from "./Temperature";

interface LeadsTableProps {
  leads: Lead[];
  funnels: Funnel[];
  today: string;
  showOwner: boolean;
  onOpen: (lead: Lead) => void;
}

export default function LeadsTable({ leads, funnels, today, showOwner, onOpen }: LeadsTableProps) {
  const stageOf = (lead: Lead) => funnels.find((funnel) => funnel._id === lead.funnelId)?.stages.find((stage) => stage._id === lead.stageId);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table min-w-[820px] text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Negociação</th>
              <th className="px-4 py-3 text-left">Contato / empresa</th>
              <th className="px-4 py-3 text-left">Etapa</th>
              <th className="px-4 py-3 text-left">Termômetro</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Próxima ação</th>
              {showOwner ? <th className="px-4 py-3 text-left">Dono</th> : null}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const date = leadDateOnly(lead);
              const overdue = isLeadOverdue(lead, today);
              const stage = stageOf(lead);
              return (
                <tr key={lead._id} className="cursor-pointer" onClick={() => onOpen(lead)}>
                  <td className="px-4 py-3 font-semibold text-charcoal">{lead.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{[lead.contactName, lead.company].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3">{stage ? <StageChip kind={stage.kind} label={stage.name} /> : "—"}</td>
                  <td className="px-4 py-3">
                    <TemperatureBadge value={lead.temperature} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(lead.value || 0)}</td>
                  <td className={`px-4 py-3 ${overdue ? "font-semibold text-burgundy" : "text-charcoal/70"}`}>
                    {date ? formatDateOnly(date) : <span className="text-charcoal/35">—</span>}
                  </td>
                  {showOwner ? <td className="px-4 py-3 text-charcoal/70">{lead.ownerName || "—"}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
