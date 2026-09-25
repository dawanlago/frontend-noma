import { formatCurrencyBRL } from "@/utils/format";
import { percentOf, type MonthTotals } from "./metrics";

export type InsightTone = "sage" | "gold" | "burgundy" | "tan";

export interface FinanceInsight {
  key: string;
  tone: InsightTone;
  title: string;
  text: string;
}

/** Leituras rápidas do mês (no máximo 4). */
export function buildMonthInsights(totals: MonthTotals, goal: number): FinanceInsight[] {
  const insights: FinanceInsight[] = [];
  const { received, paid, pending, pendingCount, recurringReceived } = totals;

  if (recurringReceived > 0 && received > 0) {
    insights.push({
      key: "recurring",
      tone: "sage",
      title: "Receita recorrente",
      text: `${percentOf(recurringReceived, received)}% do que entrou veio de contratos mensais — uma base mais previsível para o seu mês.`,
    });
  }

  if (pendingCount > 0) {
    insights.push({
      key: "pending",
      tone: "gold",
      title: "Atenção aos recebimentos",
      text: `Ainda há ${formatCurrencyBRL(pending)} a receber em ${pendingCount} ${
        pendingCount === 1 ? "movimentação" : "movimentações"
      }. Vale lembrar o cliente antes do vencimento.`,
    });
  }

  if (paid > 0 && (received === 0 || paid / received >= 0.5)) {
    insights.push({
      key: "costs-high",
      tone: "burgundy",
      title: "Custos elevados",
      text:
        received > 0
          ? `As despesas pagas já consomem ${percentOf(paid, received)}% do que você recebeu. Revise o que pode ser reduzido ou repassado no preço.`
          : "Você já tem despesas pagas, mas nenhum recebimento registrado neste mês.",
    });
  } else if (received > 0) {
    insights.push({
      key: "costs-ok",
      tone: "sage",
      title: "Custos sob controle",
      text: `As despesas pagas representam ${percentOf(paid, received)}% do valor recebido.`,
    });
  }

  if (goal > 0) {
    const ratio = received / goal;
    if (ratio >= 1) {
      const over = received - goal;
      insights.push({
        key: "goal-done",
        tone: "sage",
        title: "Meta atingida",
        text: over > 0 ? `Você passou da meta em ${formatCurrencyBRL(over)}. Ótimo mês!` : "Você bateu exatamente a meta do mês.",
      });
    } else if (ratio >= 0.75) {
      insights.push({
        key: "goal-near",
        tone: "tan",
        title: "Meta próxima",
        text: `Faltam ${formatCurrencyBRL(goal - received)} para bater a meta — ${percentOf(received, goal)}% já concluído.`,
      });
    }
  }

  if (!insights.length) {
    insights.push({
      key: "start",
      tone: "tan",
      title: "Comece registrando",
      text: "Lance suas entradas e despesas do mês para o Box mostrar como anda o resultado do seu trabalho.",
    });
  }

  return insights.slice(0, 4);
}
