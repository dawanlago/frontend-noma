import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { catalogDefaults } from "@/lib/budget/catalog";
import { BUDGET_UNITS } from "@/lib/budget/model";
import { resources } from "@/lib/resources";
import type { OptionItem } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";
import { CurrencyInput } from "./NumberInput";

/** Unidade e valor padrão de um item do catálogo (extra da lista "Itens de orçamento"). */
export default function BudgetCatalogFields({ item, editable }: { item: OptionItem; editable: boolean }) {
  const { upsertOption } = useWorkspace();
  const saved = catalogDefaults(item);
  const [value, setValue] = useState(saved.value);
  const [error, setError] = useState(false);

  useEffect(() => setValue(saved.value), [saved.value]);

  async function save(changes: { unit?: string; value?: number }) {
    const next = { unit: saved.unit, value: saved.value, ...changes };
    if (next.unit === saved.unit && next.value === saved.value) return;
    setError(false);
    try {
      upsertOption(await resources.options.update(item._id, { meta: { ...(item.meta || {}), ...next } }));
    } catch {
      setError(true);
    }
  }

  if (!editable) {
    return (
      <span className="shrink-0 text-xs tabular-nums text-charcoal/50">
        {formatCurrencyBRL(saved.value)}/{saved.unit}
      </span>
    );
  }

  const units: string[] = [...BUDGET_UNITS];
  if (!units.includes(saved.unit)) units.push(saved.unit);

  return (
    <div className="flex shrink-0 items-center gap-1.5" title={error ? "Não foi possível salvar." : undefined}>
      <select
        className={`input-search !w-28 !py-1.5 text-sm ${error ? "!border-burgundy" : ""}`}
        aria-label={`Unidade de ${item.label}`}
        value={saved.unit}
        onChange={(event) => void save({ unit: event.target.value })}
      >
        {units.map((unit) => (
          <option key={unit} value={unit}>
            por {unit}
          </option>
        ))}
      </select>
      <div className="w-36" onBlur={() => void save({ value })}>
        <CurrencyInput value={value} onChange={setValue} />
      </div>
    </div>
  );
}
