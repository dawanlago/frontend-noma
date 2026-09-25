import type { BudgetData } from "./model";

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
> & { externalCosts: ReadonlyArray<{ value: number }> };

export interface BudgetResult {
  productionCost: number;
  postProductionCost: number;
  externalCostsTotal: number;
  /** produção + pós + externos */
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

/** Cálculo puro do orçamento. Ajuste as fórmulas aqui para mudar o método de precificação. */
export function calculateBudget(input: BudgetInput): BudgetResult {
  const productionCost = safe(input.days) * safe(input.dailyRate);
  const postProductionCost = safe(input.videos) * safe(input.editHoursPerVideo) * safe(input.editHourlyRate);
  const externalCostsTotal = input.externalCosts.reduce((sum, cost) => sum + safe(cost.value), 0);

  const baseCost = productionCost + postProductionCost + externalCostsTotal;
  const operationalCost = baseCost * (safe(input.operationalPercent) / 100);
  const estimatedCost = baseCost + operationalCost;

  const suggestedPrice = estimatedCost * (1 + safe(input.marginPercent) / 100);
  const minimumPrice = estimatedCost * (1 + MINIMUM_MARKUP);
  const premiumPrice = suggestedPrice * (1 + PREMIUM_MARKUP);

  const totalHours =
    safe(input.shootingHours) +
    safe(input.prepHours) +
    safe(input.videos) * safe(input.editHoursPerVideo) +
    safe(input.reviewHours);
  const hourlyValue = totalHours > 0 ? suggestedPrice / totalHours : 0;

  return {
    productionCost,
    postProductionCost,
    externalCostsTotal,
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
