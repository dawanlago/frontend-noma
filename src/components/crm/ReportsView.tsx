import { useWorkspace } from "@/contexts/WorkspaceContext";
import { computeLeadMetrics, conversionByStage, formatPercent, groupByLostReason, groupBySource, leadDiscount, timeByStage } from "@/lib/crm/metrics";
import type { Funnel, Lead } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";

function Bar({ rate, tone = "bg-tan" }: { rate: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/[0.06]">
      <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${Math.min(100, rate * 100)}%` }} />
    </div>
  );
}

export default function ReportsView({ leads, funnel }: { leads: Lead[]; funnel: Funnel }) {
  const { labelOf } = useWorkspace();
  const lostReasons = groupByLostReason(leads);
  const stages = conversionByStage(leads, funnel);
  const sources = groupBySource(leads);
  const times = timeByStage(leads, funnel);
  const longest = Math.max(1, ...times.map((item) => item.averageDays));
  const metrics = computeLeadMetrics(leads);
  const discounts = leads
    .filter((lead) => lead.status === "won")
    .map(leadDiscount)
    .filter((item): item is NonNullable<ReturnType<typeof leadDiscount>> => Boolean(item));

  const summary = [
    { label: "Negociações", value: String(metrics.total) },
    { label: "Vendas feitas", value: `${metrics.wonCount} (${formatPercent(metrics.conversionRate)})` },
    { label: "Perdidas", value: String(metrics.lostCount) },
    { label: "Potencial em aberto", value: formatCurrencyBRL(metrics.openValue), money: true },
    { label: "Valor vendido", value: formatCurrencyBRL(metrics.wonValue), money: true },
    ...(discounts.length
      ? [
          {
            label: `Descontos concedidos (${discounts.length})`,
            value: `${formatCurrencyBRL(discounts.reduce((sum, item) => sum + item.value, 0))} · média ${formatPercent(
              discounts.reduce((sum, item) => sum + item.percent, 0) / discounts.length,
            )}`,
            money: true,
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Conversão por etapa</h2>
          <p className="mt-1 text-sm text-charcoal/55">Quantas negociações de “{funnel.name}” chegaram a cada etapa (ou foram além dela).</p>
          <ul className="mt-5 grid gap-4">
            {stages.map((item) => (
              <li key={item.stage._id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-charcoal">{item.stage.name}</span>
                  <span className="tabular-nums text-charcoal/55">
                    {item.reached} · <strong className="text-charcoal">{formatPercent(item.rate)}</strong>
                  </span>
                </div>
                <Bar rate={item.rate} tone={item.stage.kind === "won" ? "bg-sage" : "bg-tan"} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Tempo parado por etapa</h2>
          <p className="mt-1 text-sm text-charcoal/55">
            Média de dias das negociações em aberto na etapa e em cada microetapa. “Sem contato” = mais de 7 dias sem parecer ou atividade concluída.
          </p>
          <ul className="mt-5 grid gap-4">
            {times.map((item) => (
              <li key={item.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-charcoal">
                    {item.name} <span className="text-charcoal/45">· {item.count}</span>
                  </span>
                  <span className="tabular-nums text-charcoal/55">
                    {item.stale ? <span className="mr-2 text-burgundy">{item.stale} sem contato</span> : null}
                    <strong className="text-charcoal">{item.count ? `${item.averageDays} dias` : "—"}</strong>
                  </span>
                </div>
                <Bar rate={item.averageDays / longest} tone={item.stale ? "bg-gold" : "bg-tan"} />
                {item.subStages.length ? (
                  <ul className="mt-2 grid gap-1 border-l-2 border-charcoal/[0.06] pl-3">
                    {item.subStages.map((sub) => (
                      <li key={sub.id} className="flex items-center justify-between gap-3 text-xs text-charcoal/60">
                        <span>
                          ↳ {sub.name} <span className="text-charcoal/40">· {sub.count}</span>
                        </span>
                        <span className="tabular-nums">{sub.count ? `${sub.averageDays} dias` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Origem das negociações</h2>
          <p className="mt-1 text-sm text-charcoal/55">De onde vêm as suas oportunidades.</p>
          {sources.length ? (
            <ul className="mt-5 grid gap-4">
              {sources.map((item) => (
                <li key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-charcoal">{item.label}</span>
                    <span className="tabular-nums text-charcoal/55">
                      {item.count} · <span data-money>{formatCurrencyBRL(item.value)}</span>
                    </span>
                  </div>
                  <Bar rate={item.share} tone="bg-gold" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-charcoal/45">Nenhuma negociação no filtro atual.</p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Motivos de perda</h2>
          <p className="mt-1 text-sm text-charcoal/55">Por que as negociações perdidas não fecharam.</p>
          {lostReasons.length ? (
            <ul className="mt-5 grid gap-4">
              {lostReasons.map((item) => (
                <li key={item.reason || "sem-motivo"}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className={`font-medium ${item.reason ? "text-charcoal" : "text-charcoal/50"}`}>
                      {item.reason ? labelOf("lostReason", item.reason) : "Sem motivo registrado"}
                    </span>
                    <span className="tabular-nums text-charcoal/55">
                      {item.count} · <strong className="text-charcoal">{formatPercent(item.share)}</strong> · <span data-money>{formatCurrencyBRL(item.value)}</span>
                    </span>
                  </div>
                  <Bar rate={item.share} tone="bg-burgundy" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-charcoal/45">Nenhuma negociação perdida no filtro atual.</p>
          )}
        </section>
      </div>

      <section className="card self-start p-5 sm:p-6 lg:sticky lg:top-20">
        <h2 className="text-base font-semibold text-charcoal">Resumo comercial</h2>
        <dl className="mt-4 divide-y divide-charcoal/[0.06]">
          {summary.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 py-3 text-sm">
              <dt className="text-charcoal/60">{item.label}</dt>
              <dd data-money={"money" in item || undefined} className="font-semibold tabular-nums text-charcoal">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
