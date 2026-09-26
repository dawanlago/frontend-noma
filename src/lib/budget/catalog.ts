import type { OptionItem } from "@/types";
import { newItem, type BudgetItem } from "./model";

/** Lista de opções com o catálogo de itens (Configurações → Listas de opções → Itens de orçamento). */
export const BUDGET_ITEM_LIST = "budgetItem";

export interface CatalogDefaults {
  unit: string;
  value: number;
}

/** Unidade e valor padrão guardados no `meta` da opção. */
export function catalogDefaults(option: Pick<OptionItem, "meta">): CatalogDefaults {
  const meta = option.meta || {};
  const value = Number(meta.value);
  return {
    unit: typeof meta.unit === "string" && meta.unit.trim() ? meta.unit : "unidade",
    value: Number.isFinite(value) && value >= 0 ? value : 0,
  };
}

/** Nova linha do orçamento a partir de um item do catálogo. */
export function itemFromCatalog(option: OptionItem): BudgetItem {
  const { unit, value } = catalogDefaults(option);
  return newItem({ name: option.label, unit, unitValue: value });
}
