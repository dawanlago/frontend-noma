import { HiArrowTrendingDown, HiArrowTrendingUp, HiOutlineChartBar } from "react-icons/hi2";
import { computeYearTotals } from "@/lib/finance/metrics";
import { monthName } from "@/lib/finance/model";
import type { FinanceMonthSummary } from "@/types";
import { currentMonthISO, formatCurrencyBRL } from "@/utils/format";
import StatCard from "./StatCard";

interface YearViewProps {
  year: string;
  months: FinanceMonthSummary[];
  isLoading: boolean;
  error: string;
  onOpenMonth: (month: string) => void;
}

export default function YearView({ year, months, isLoading, error, onOpenMonth }: YearViewProps) {
  const totals = computeYearTotals(months);
  const current = currentMonthISO();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Faturamento recebido no ano"
          value={formatCurrencyBRL(totals.received)}
          tone="sage"
          icon={<HiArrowTrendingUp className="h-4 w-4" />}
          loading={isLoading}
          text={totals.pending > 0 ? `${formatCurrencyBRL(totals.pending)} ainda a receber.` : undefined}
        />
        <StatCard
          label="Despesas pagas no ano"
          value={formatCurrencyBRL(totals.expenses)}
          tone="burgundy"
          icon={<HiArrowTrendingDown className="h-4 w-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Resultado acumulado"
          value={formatCurrencyBRL(totals.result)}
          tone={totals.result < 0 ? "burgundy" : "default"}
          icon={<HiOutlineChartBar className="h-4 w-4" />}
          loading={isLoading}
        />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-charcoal/[0.06] p-5">
          <h2 className="text-base font-semibold text-charcoal">Resumo de {year}</h2>
          <p className="text-sm text-charcoal/55">Clique em um mês para ver as movimentações.</p>
        </div>
        {error ? (
          <p className="p-5 text-sm text-burgundy">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[620px] text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left">Mês</th>
                  <th className="px-5 py-3 text-right">Recebido</th>
                  <th className="px-5 py-3 text-right">Despesas</th>
                  <th className="px-5 py-3 text-right">Resultado</th>
                  <th className="px-5 py-3 text-right">A receber</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={5} className="px-5 py-3">
                          <div className="skeleton h-5" />
                        </td>
                      </tr>
                    ))
                  : months.map((row) => {
                      const empty = !row.received && !row.expenses && !row.pending;
                      return (
                        <tr
                          key={row.month}
                          className={`cursor-pointer ${empty ? "text-charcoal/40" : ""}`}
                          onClick={() => onOpenMonth(row.month)}
                        >
                          <td className="px-5 py-3 font-semibold text-charcoal">
                            {monthName(row.month)}
                            {row.month === current ? <span className="chip ml-2 bg-tan/10 text-tan">Atual</span> : null}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyBRL(row.received)}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyBRL(row.expenses)}</td>
                          <td
                            className={`px-5 py-3 text-right font-semibold tabular-nums ${
                              row.result < 0 ? "text-burgundy" : row.result > 0 ? "text-charcoal" : ""
                            }`}
                          >
                            {formatCurrencyBRL(row.result)}
                          </td>
                          <td className={`px-5 py-3 text-right tabular-nums ${row.pending > 0 ? "text-gold" : ""}`}>
                            {formatCurrencyBRL(row.pending)}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
              {!isLoading && months.length ? (
                <tfoot>
                  <tr className="bg-beige font-semibold">
                    <td className="px-5 py-3">Total</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyBRL(totals.received)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyBRL(totals.expenses)}</td>
                    <td className={`px-5 py-3 text-right tabular-nums ${totals.result < 0 ? "text-burgundy" : ""}`}>
                      {formatCurrencyBRL(totals.result)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrencyBRL(totals.pending)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
