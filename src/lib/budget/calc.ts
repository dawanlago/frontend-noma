import type { BudgetData, FixedFieldKey } from "./model";

/** Entradas mínimas para o cálculo (independente do formato salvo). */
export type BudgetInput = Pick<
  BudgetData,
  | "days"
  | "dailyRate"
  | "shootingHours"
  | "prepHours"
  | "videos"
  | "editHoursPerVideo"
  | "editHourlyRate"
  | "reviewHours"
  | "operationalPercent"
  | "marginPercent"
> & {
  items: ReadonlyArray<{ quantity: number; unitValue: number }>;
  /** Campos fixos removidos: contam como zero. */
  hiddenFields?: ReadonlyArray<FixedFieldKey>;
};

export interface BudgetResult {
  productionCost: number;
  postProductionCost: number;
  /** profissionais e custos (quantidade × valor unitário) */
  itemsTotal: number;
  /** produção + pós + itens */
  baseCost: number;
  operationalCost: number;
  /** base + operacional */
  estimatedCost: number;
  /** custo estimado + 15% */
  minimumPrice: number;
  /** custo estimado × (1 + margem) */
  suggestedPrice: number;
  /** sugerido + 15% */
  premiumPrice: number;
  totalHours: number;
  /** sugerido ÷ horas totais (0 quando não há horas) */
  hourlyValue: number;
}

export const MINIMUM_MARKUP = 0.15;
export const PREMIUM_MARKUP = 0.15;

const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/** Total de uma linha: quantidade × valor unitário. */
export function itemTotal(item: { quantity: number; unitValue: number }) {
  return safe(item.quantity) * safe(item.unitValue);
}

/** Cálculo puro do orçamento. Ajuste as fórmulas aqui para mudar o método de precificação. */
export function calculateBudget(input: BudgetInput): BudgetResult {
  const hidden = new Set(input.hiddenFields || []);
  // Campo removido do orçamento não entra no cálculo.
  const use = (key: FixedFieldKey, value: number) => (hidden.has(key) ? 0 : safe(value));

  const productionCost = hidden.has("production") ? 0 : safe(input.days) * safe(input.dailyRate);
  const editHours = hidden.has("postProduction") ? 0 : safe(input.videos) * safe(input.editHoursPerVideo);
  const postProductionCost = editHours * safe(input.editHourlyRate);
  const itemsTotal = input.items.reduce((sum, item) => sum + itemTotal(item), 0);

  const baseCost = productionCost + postProductionCost + itemsTotal;
  const operationalCost = baseCost * (safe(input.operationalPercent) / 100);
  const estimatedCost = baseCost + operationalCost;

  const suggestedPrice = estimatedCost * (1 + safe(input.marginPercent) / 100);
  const minimumPrice = estimatedCost * (1 + MINIMUM_MARKUP);
  const premiumPrice = suggestedPrice * (1 + PREMIUM_MARKUP);

  const totalHours =
    use("shootingHours", input.shootingHours) + use("prepHours", input.prepHours) + editHours + use("reviewHours", input.reviewHours);
  const hourlyValue = totalHours > 0 ? suggestedPrice / totalHours : 0;

  return {
    productionCost,
    postProductionCost,
    itemsTotal,
    baseCost,
    operationalCost,
    estimatedCost,
    minimumPrice,
    suggestedPrice,
    premiumPrice,
    totalHours,
    hourlyValue,
  };
}
