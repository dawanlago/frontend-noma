import type { FinanceEntry, FinanceMonthSummary } from "@/types";
import { isEntryOpen } from "./model";

export type EntryFilter = "all" | "income" | "expense" | "open";

export const ENTRY_FILTERS: { value: EntryFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Entradas" },
  { value: "expense", label: "Despesas" },
  { value: "open", label: "Pendentes" },
];

export function filterEntries(entries: FinanceEntry[], filter: EntryFilter): FinanceEntry[] {
  if (filter === "income") return entries.filter((entry) => entry.type === "income");
  if (filter === "expense") return entries.filter((entry) => entry.type === "expense");
  if (filter === "open") return entries.filter(isEntryOpen);
  return entries;
}

export interface MonthTotals {
  received: number;
  paid: number;
  result: number;
  pending: number;
  pendingCount: number;
  planned: number;
  /** Recebido na categoria "Contrato mensal". */
  recurringReceived: number;
}

export const RECURRING_INCOME_CATEGORY = "Contrato mensal";

export function computeMonthTotals(entries: FinanceEntry[]): MonthTotals {
  const totals: MonthTotals = { received: 0, paid: 0, result: 0, pending: 0, pendingCount: 0, planned: 0, recurringReceived: 0 };
  for (const entry of entries) {
    const value = Number(entry.value) || 0;
    if (entry.type === "income") {
      if (entry.status === "received") {
        totals.received += value;
        if (entry.category === RECURRING_INCOME_CATEGORY) totals.recurringReceived += value;
      } else if (entry.status === "pending") {
        totals.pending += value;
        totals.pendingCount += 1;
      }
    } else if (entry.status === "paid") {
      totals.paid += value;
    } else if (entry.status === "planned") {
      totals.planned += value;
    }
  }
  totals.result = totals.received - totals.paid;
  return totals;
}

/** Percentual (0–100) arredondado; 0 quando a base é zero. */
export function percentOf(part: number, base: number): number {
  return base > 0 ? Math.round((part / base) * 100) : 0;
}

export interface ClientRevenue {
  client: string;
  value: number;
  count: number;
  share: number;
}

export function clientRanking(entries: FinanceEntry[]): ClientRevenue[] {
  const map = new Map<string, ClientRevenue>();
  let total = 0;
  for (const entry of entries) {
    if (entry.type !== "income" || entry.status !== "received") continue;
    const name = entry.client?.trim() || "Sem cliente informado";
    const key = name.toLowerCase();
    const row = map.get(key) || { client: name, value: 0, count: 0, share: 0 };
    row.value += Number(entry.value) || 0;
    row.count += 1;
    total += Number(entry.value) || 0;
    map.set(key, row);
  }
  return Array.from(map.values())
    .map((row) => ({ ...row, share: total ? row.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface YearTotals {
  received: number;
  expenses: number;
  result: number;
  pending: number;
}

export function computeYearTotals(months: FinanceMonthSummary[]): YearTotals {
  return months.reduce(
    (acc, row) => ({
      received: acc.received + row.received,
      expenses: acc.expenses + row.expenses,
      result: acc.result + row.result,
      pending: acc.pending + row.pending,
    }),
    { received: 0, expenses: 0, result: 0, pending: 0 },
  );
}
