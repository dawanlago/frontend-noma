import Link from "next/link";
import StageChip from "@/components/crm/StageChip";
import MetricCard from "@/components/ui/MetricCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import type { ProfileHistory as History } from "@/types";
import { formatCurrencyBRL, formatDate, formatDateOnly, formatDateTime } from "@/utils/format";

/** Históricos do perfil: vendas, pareceres, recebimentos e contratos. */
export default function ProfileHistory({ history, showCompany }: { history: History; showCompany?: boolean }) {
  const { funnels } = useWorkspace();
  const stageOf = (funnelId: string, stageId: string) =>
    funnels.find((funnel) => funnel._id === funnelId)?.stages.find((stage) => stage._id === stageId);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vendas feitas" value={formatCurrencyBRL(history.totals.wonValue)} hint={`${history.totals.wonCount} vendas`} tone="sage" />
        <MetricCard label="Em negociação" value={formatCurrencyBRL(history.totals.openValue)} hint={`${history.totals.openCount} abertas`} />
        <MetricCard label="Recebido no financeiro" value={formatCurrencyBRL(history.totals.received)} tone="gold" />
        <MetricCard
          label="NPS"
          value={history.nps.length ? String(history.nps[0].rating) : "—"}
          hint={history.nps.length ? `${history.nps.length} resposta(s) · última nota` : "Sem respostas"}
          tone={!history.nps.length ? "default" : history.nps[0].rating >= 9 ? "sage" : history.nps[0].rating >= 7 ? "gold" : "burgundy"}
        />
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-charcoal/[0.06] px-5 py-4 text-base font-semibold text-charcoal">Histórico de vendas</h2>
        {history.leads.length ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left">Negociação</th>
                  {showCompany ? <th className="px-5 py-3 text-left">Contato</th> : null}
                  <th className="px-5 py-3 text-left">Etapa</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {history.leads.map((lead) => {
                  const stage = stageOf(lead.funnelId, lead.stageId);
                  return (
                    <tr key={lead._id}>
                      <td className="px-5 py-3">
                        <Link href={`/crm/${lead._id}`} className="font-semibold text-charcoal hover:text-tan">
                          {lead.name}
                        </Link>
                      </td>
                      {showCompany ? <td className="px-5 py-3 text-charcoal/70">{lead.contactName || "—"}</td> : null}
                      <td className="px-5 py-3">
                        {stage ? <StageChip kind={stage.kind} label={stage.name} /> : <span className="chip bg-charcoal/[0.06]">{LEAD_STATUS_LABELS[lead.status]}</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrencyBRL(lead.value || 0)}</td>
                      <td className="px-5 py-3 text-charcoal/60">{formatDate(lead.wonAt || lead.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-charcoal/50">Nenhuma negociação vinculada ainda.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-charcoal">Histórico de pareceres</h2>
          {history.comments.length ? (
            <ol className="space-y-3">
              {history.comments.map((comment) => (
                <li key={comment._id} className="rounded-lg border border-charcoal/[0.08] p-3">
                  <p className="mb-1 text-xs text-charcoal/50">
                    <Link href={`/crm/${comment.leadId}`} className="font-semibold text-tan hover:underline">
                      {comment.leadName}
                    </Link>{" "}
                    · {comment.authorName} · {formatDateTime(comment.createdAt)}
                  </p>
                  <p className="whitespace-pre-line text-sm text-charcoal">{comment.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-charcoal/50">Nenhum parecer registrado.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-charcoal">Lançamentos no financeiro</h2>
            {history.entries.length ? (
              <ul className="divide-y divide-charcoal/[0.06] text-sm">
                {history.entries.map((entry) => (
                  <li key={entry._id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-charcoal/75">
                      {entry.description}
                      <span className="block text-xs text-charcoal/45">{formatDateOnly(entry.date)}</span>
                    </span>
                    <span className={`tabular-nums font-semibold ${entry.type === "expense" ? "text-burgundy" : "text-charcoal"}`}>
                      {entry.type === "expense" ? "- " : ""}
                      {formatCurrencyBRL(entry.value)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-charcoal/50">Nenhum lançamento vinculado.</p>
            )}
          </section>
          {history.nps.length ? (
            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-charcoal">Respostas de NPS</h2>
              <ul className="space-y-2 text-sm">
                {history.nps.map((item) => (
                  <li key={item._id} className="flex gap-3">
                    <span className="chip h-fit bg-tan/10 text-tan">{item.rating}</span>
                    <span className="text-charcoal/70">
                      {item.comment || "Sem comentário"}
                      <span className="block text-xs text-charcoal/45">{formatDate(item.date)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-charcoal">Contratos importados</h2>
            {history.files.length ? (
              <ul className="space-y-1 text-sm">
                {history.files.map((file) => (
                  <li key={file._id}>
                    <Link href="/contratos" className="text-tan hover:underline">
                      {file.title || file.name}
                    </Link>
                    <span className="text-xs text-charcoal/45"> · {formatDate(file.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-charcoal/50">Nenhum contrato vinculado.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
