import type { ClientRevenue } from "@/lib/finance/metrics";
import { formatCurrencyBRL } from "@/utils/format";

export default function ClientRankingCard({ rows }: { rows: ClientRevenue[] }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-charcoal">Clientes que geraram receita</h2>
      <p className="text-sm text-charcoal/55">Ranking das entradas recebidas no mês.</p>
      {rows.length ? (
        <ol className="mt-4 grid gap-3.5">
          {rows.slice(0, 8).map((row, index) => (
            <li key={row.client}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tan/10 text-[11px] font-bold text-tan">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium text-charcoal">{row.client}</span>
                </span>
                <span className="whitespace-nowrap font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(row.value)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/[0.06]">
                <div className="h-full rounded-full bg-sage" style={{ width: `${Math.max(2, row.share * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-charcoal/45">Nenhuma entrada recebida neste mês ainda.</p>
      )}
    </section>
  );
}
