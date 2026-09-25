import type { BudgetResult } from "@/lib/budget/calc";
import { formatCurrencyBRL } from "@/utils/format";

interface BudgetResultPanelProps {
  result: BudgetResult;
  marginPercent: number;
  operationalPercent: number;
  onUseValue: () => void;
}

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return `${String(rounded).replace(".", ",")} h`;
}

function PriceRow({ label, hint, value }: { label: string; hint?: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {hint ? <p className="text-xs text-charcoal/50">{hint}</p> : null}
      </div>
      <p className="text-base font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(value)}</p>
    </div>
  );
}

/** Resultado ao vivo da calculadora (coluna direita). */
export default function BudgetResultPanel({ result, marginPercent, operationalPercent, onUseValue }: BudgetResultPanelProps) {
  const breakdown = [
    { label: "Produção", value: formatCurrencyBRL(result.productionCost) },
    { label: "Pós-produção", value: formatCurrencyBRL(result.postProductionCost) },
    { label: "Custos externos", value: formatCurrencyBRL(result.externalCostsTotal) },
    { label: `Operacionais (${operationalPercent}%)`, value: formatCurrencyBRL(result.operationalCost) },
    { label: "Horas totais", value: formatHours(result.totalHours) },
  ];

  return (
    <div className="space-y-4">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Resultado</p>
        <h2 className="mt-1 text-base font-semibold text-charcoal">Quanto cobrar por este projeto</h2>

        <div className="mt-3 divide-y divide-charcoal/[0.08]">
          <PriceRow label="Custo estimado" hint="O que o projeto custa para você" value={result.estimatedCost} />
          <PriceRow label="Valor mínimo" hint="Custo + 15% — abaixo disso, não vale a pena" value={result.minimumPrice} />
        </div>

        <div className="my-2 rounded-xl border border-tan/25 bg-tan/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-tan">Valor sugerido</p>
            <span className="chip bg-tan/10 text-tan">Margem {marginPercent}%</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-charcoal">
            {formatCurrencyBRL(result.suggestedPrice)}
          </p>
          <p className="mt-1 text-xs text-charcoal/55">Preço recomendado para apresentar ao cliente.</p>
        </div>

        <div className="divide-y divide-charcoal/[0.08]">
          <PriceRow label="Valor premium" hint="+15% extra, para urgência ou entrega diferenciada" value={result.premiumPrice} />
        </div>

        <button type="button" className="btn-primary mt-4 w-full" onClick={onUseValue} disabled={result.suggestedPrice <= 0}>
          Usar este valor na proposta →
        </button>
      </section>

      <section className="card-muted p-5">
        <h3 className="text-sm font-semibold text-charcoal">Como chegamos aqui</h3>
        <dl className="mt-3 space-y-2">
          {breakdown.map((item) => (
            <div key={item.label} className="flex justify-between gap-3 text-sm">
              <dt className="text-charcoal/60">{item.label}</dt>
              <dd className="font-medium tabular-nums text-charcoal">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-charcoal/10 pt-3 text-sm">
          <span className="text-charcoal/60">No valor sugerido</span>
          <span className="font-semibold tabular-nums text-sage">
            {result.totalHours > 0 ? `${formatCurrencyBRL(result.hourlyValue)}/h` : "—"}
          </span>
        </div>
        <p className="mt-4 text-xs leading-5 text-charcoal/50">
          As fórmulas podem ser ajustadas ao seu método de precificação.
        </p>
      </section>
    </div>
  );
}
