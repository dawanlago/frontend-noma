import { formatCurrencyBRL } from "@/utils/format";
import { itemTotal, type BudgetResult } from "./calc";
import { formatQuantity, titleOf, type BudgetData } from "./model";

function hours(value: number) {
  return `${String(Math.round(value * 10) / 10).replace(".", ",")} h`;
}

/** Resumo em texto do orçamento (para copiar e colar em proposta, WhatsApp, e-mail...). */
export function budgetSummaryText(data: BudgetData, result: BudgetResult) {
  const hidden = new Set(data.hiddenFields);
  const lines = [`Orçamento — ${titleOf(data)}`, `Tipo de projeto: ${data.projectType}`, ""];

  if (!hidden.has("production")) {
    lines.push(
      `Produção: ${formatQuantity(data.days, "diária")} × ${formatCurrencyBRL(data.dailyRate)} = ${formatCurrencyBRL(result.productionCost)}`,
    );
  }
  if (!hidden.has("postProduction")) {
    lines.push(
      `Pós-produção: ${formatQuantity(data.videos, "vídeo")} × ${hours(data.editHoursPerVideo)} × ${formatCurrencyBRL(data.editHourlyRate)} = ${formatCurrencyBRL(result.postProductionCost)}`,
    );
  }
  const items = data.items.filter((item) => item.name.trim() || itemTotal(item) > 0);
  if (items.length) {
    lines.push("", "Profissionais e custos:");
    items.forEach((item) => {
      lines.push(
        `- ${item.name.trim() || "Item"}: ${formatQuantity(item.quantity, item.unit)} × ${formatCurrencyBRL(item.unitValue)} = ${formatCurrencyBRL(itemTotal(item))}`,
      );
    });
  }

  lines.push(
    "",
    `Custos operacionais (${data.operationalPercent}%): ${formatCurrencyBRL(result.operationalCost)}`,
    `Custo estimado: ${formatCurrencyBRL(result.estimatedCost)}`,
    `Valor mínimo: ${formatCurrencyBRL(result.minimumPrice)}`,
    `Valor sugerido (margem ${data.marginPercent}%): ${formatCurrencyBRL(result.suggestedPrice)}`,
    `Valor premium: ${formatCurrencyBRL(result.premiumPrice)}`,
  );
  if (result.totalHours > 0) {
    lines.push(`Horas totais: ${hours(result.totalHours)} · ${formatCurrencyBRL(result.hourlyValue)}/h`);
  }
  return lines.join("\n");
}
