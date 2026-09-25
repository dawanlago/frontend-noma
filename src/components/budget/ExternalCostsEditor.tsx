import { newCostId, type ExternalCost } from "@/lib/budget/model";
import { formatCurrencyBRL } from "@/utils/format";
import { CurrencyInput } from "./NumberInput";

interface ExternalCostsEditorProps {
  costs: ExternalCost[];
  onChange: (costs: ExternalCost[]) => void;
}

/** Lista editável de custos externos (deslocamento, assistente, aluguel...). */
export default function ExternalCostsEditor({ costs, onChange }: ExternalCostsEditorProps) {
  const total = costs.reduce((sum, cost) => sum + (cost.value || 0), 0);

  function patch(id: string, changes: Partial<ExternalCost>) {
    onChange(costs.map((cost) => (cost.id === id ? { ...cost, ...changes } : cost)));
  }

  return (
    <div className="space-y-3">
      {costs.length ? (
        <ul className="space-y-2.5">
          {costs.map((cost) => (
            <li key={cost.id} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 sm:grid-cols-[minmax(0,1fr)_180px_40px]">
              <input
                className="input-search"
                value={cost.name}
                placeholder="Nome do custo"
                aria-label="Nome do custo"
                onChange={(event) => patch(cost.id, { name: event.target.value })}
              />
              <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <CurrencyInput value={cost.value} onChange={(value) => patch(cost.id, { value })} />
              </div>
              <button
                type="button"
                className="btn-ghost text-lg"
                aria-label={`Remover ${cost.name || "custo"}`}
                title="Remover"
                onClick={() => onChange(costs.filter((item) => item.id !== cost.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-muted px-4 py-3 text-sm text-charcoal/55">Nenhum custo externo neste projeto.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/[0.08] pt-3">
        <button
          type="button"
          className="btn-secondary !py-2"
          onClick={() => onChange([...costs, { id: newCostId(), name: "", value: 0 }])}
        >
          + Adicionar custo
        </button>
        <p className="text-sm text-charcoal/55">
          Total: <span className="font-semibold text-charcoal">{formatCurrencyBRL(total)}</span>
        </p>
      </div>
    </div>
  );
}
