import type { FinanceEntry, TransactionType } from "@/types";
import { entryTotal } from "./lateCharge";

/** "all" soma tudo (inclui a receber/previsto); "realized" só o que foi recebido/pago. */
export type SheetMode = "all" | "realized";

export interface SheetRow {
  category: string;
  months: number[];
  total: number;
}

export interface SheetTotals {
  months: number[];
  total: number;
}

export interface FinanceSheet {
  income: SheetRow[];
  expense: SheetRow[];
  incomeTotals: SheetTotals;
  expenseTotals: SheetTotals;
  result: SheetTotals;
}

export function isRealized(entry: FinanceEntry) {
  return entry.type === "income" ? entry.status === "received" : entry.status === "paid";
}

const emptyMonths = () => Array.from({ length: 12 }, () => 0);
const round = (value: number) => Math.round(value * 100) / 100;

function rowsFor(entries: FinanceEntry[], type: TransactionType): SheetRow[] {
  const map = new Map<string, SheetRow>();
  for (const entry of entries) {
    if (entry.type !== type) continue;
    const month = Number(entry.date.slice(5, 7)) - 1;
    if (month < 0 || month > 11) continue;
    const category = entry.category || "Sem categoria";
    const row = map.get(category) || { category, months: emptyMonths(), total: 0 };
    row.months[month] = round(row.months[month] + entryTotal(entry));
    row.total = round(row.total + entryTotal(entry));
    map.set(category, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

function totals(rows: SheetRow[]): SheetTotals {
  const months = emptyMonths();
  rows.forEach((row) => row.months.forEach((value, index) => (months[index] = round(months[index] + value))));
  return { months, total: round(months.reduce((sum, value) => sum + value, 0)) };
}

/** Monta a planilha do ano: cada categoria por mês, totais e resultado (entradas − despesas). */
export function buildSheet(entries: FinanceEntry[], mode: SheetMode): FinanceSheet {
  const source = mode === "realized" ? entries.filter(isRealized) : entries;
  const income = rowsFor(source, "income");
  const expense = rowsFor(source, "expense");
  const incomeTotals = totals(income);
  const expenseTotals = totals(expense);
  const months = incomeTotals.months.map((value, index) => round(value - expenseTotals.months[index]));
  return {
    income,
    expense,
    incomeTotals,
    expenseTotals,
    result: { months, total: round(incomeTotals.total - expenseTotals.total) },
  };
}
