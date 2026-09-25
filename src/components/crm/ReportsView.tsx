import { computeLeadMetrics, conversionByStage, formatPercent, groupBySource } from "@/lib/crm/metrics";
import type { Lead } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";

function Bar({ rate, tone = "bg-tan" }: { rate: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/[0.06]">
      <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${Math.min(100, rate * 100)}%` }} />
    </div>
  );
}

export default function ReportsView({ leads }: { leads: Lead[] }) {
  const stages = conversionByStage(leads);
  const sources = groupBySource(leads);
  const metrics = computeLeadMetrics(leads);

  const summary = [
    { label: "Leads cadastrados", value: String(metrics.total) },
    { label: "Chegaram à proposta", value: `${metrics.proposalCount} (${formatPercent(metrics.total ? metrics.proposalCount / metrics.total : 0)})` },
    { label: "Potencial em aberto", value: formatCurrencyBRL(metrics.openValue) },
    { label: "Valor ganho", value: formatCurrencyBRL(metrics.wonValue) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Conversão por etapa</h2>
          <p className="mt-1 text-sm text-charcoal/55">Quantos leads chegaram a cada etapa do funil (ou foram além dela).</p>
          <ul className="mt-5 grid gap-4">
            {stages.map((item) => (
              <li key={item.stage}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-charcoal">{item.label}</span>
                  <span className="tabular-nums text-charcoal/55">
                    {item.reached} {item.reached === 1 ? "lead" : "leads"} · <strong className="text-charcoal">{formatPercent(item.rate)}</strong>
                  </span>
                </div>
                <Bar rate={item.rate} tone={item.stage === "won" ? "bg-sage" : "bg-tan"} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-charcoal">Origem dos leads</h2>
          <p className="mt-1 text-sm text-charcoal/55">De onde vêm as suas oportunidades.</p>
          {sources.length ? (
            <ul className="mt-5 grid gap-4">
              {sources.map((item) => (
                <li key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-charcoal">{item.label}</span>
                    <span className="tabular-nums text-charcoal/55">
                      {item.count} · {formatCurrencyBRL(item.value)}
                    </span>
                  </div>
                  <Bar rate={item.share} tone="bg-gold" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-charcoal/45">Nenhum lead no filtro atual.</p>
          )}
        </section>
      </div>

      <section className="card self-start p-5 sm:p-6 lg:sticky lg:top-20">
        <h2 className="text-base font-semibold text-charcoal">Resumo comercial</h2>
        <dl className="mt-4 divide-y divide-charcoal/[0.06]">
          {summary.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 py-3 text-sm">
              <dt className="text-charcoal/60">{item.label}</dt>
              <dd className="font-semibold tabular-nums text-charcoal">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
