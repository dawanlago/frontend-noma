import type { FinanceEntry, LateCharge, LateChargeRules } from "@/types";

/*
 * Mesmo cálculo do servidor (backend src/lib/lateCharge.ts), para prévias na tela:
 * multa fixa em % + juros ao mês pro rata die (mês de 30 dias), contados desde o vencimento;
 * dentro da carência nada é cobrado. O servidor recalcula ao salvar.
 */

const DAY = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const cents = (value: number) => Math.round(value * 100) / 100;

export function daysBetween(from: string, to: string) {
  const parse = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / DAY);
}

export function hasLateRules(rules?: LateChargeRules | null): rules is LateChargeRules {
  return Boolean(rules && (rules.lateFee > 0 || rules.monthlyInterest > 0));
}

export function computeLateCharge(value: number, dueDate: string, paidAt: string, rules?: LateChargeRules | null): LateCharge | null {
  if (!hasLateRules(rules) || !ISO_DATE.test(dueDate) || !ISO_DATE.test(paidAt) || !(value > 0)) return null;
  const days = daysBetween(dueDate, paidAt);
  if (days <= 0 || days <= (rules.graceDays || 0)) return null;
  const fee = cents((value * rules.lateFee) / 100);
  const interest = cents((value * rules.monthlyInterest * days) / 100 / 30);
  if (fee + interest <= 0) return null;
  return { days, fee, interest, total: cents(fee + interest) };
}

/** Valor que conta no recebido/pago: valor + juros/multa (quando houver). */
export function entryTotal(entry: Pick<FinanceEntry, "value" | "lateCharge">): number {
  return cents((Number(entry.value) || 0) + (entry.lateCharge?.total || 0));
}

/** "+ R$ X de juros/multa · N dias de atraso" (sem o valor, que vai formatado à parte). */
export function lateDaysLabel(days: number) {
  return `${days} ${days === 1 ? "dia" : "dias"} de atraso`;
}
