import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, MONTH_NAMES, PAYMENT_METHODS } from "@/lib/constants";
import type { FinanceEntryPayload } from "@/lib/resources";
import type { FinanceEntry, FinanceStatus, TransactionType } from "@/types";
import { currentMonthISO, maskCurrencyBRL, parseCurrencyBRL, todayISO } from "@/utils/format";

export interface EntryForm {
  type: TransactionType;
  description: string;
  client: string;
  category: string;
  value: string;
  date: string;
  status: FinanceStatus;
  payment: string;
  recurring: boolean;
}

/** Data padrão: hoje se o mês visto é o atual, senão o dia 1 do mês visto. */
export function defaultEntryDate(month: string): string {
  return month === currentMonthISO() ? todayISO() : `${month}-01`;
}

export function defaultCategory(type: TransactionType): string {
  return type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
}

export function defaultStatus(type: TransactionType): FinanceStatus {
  return type === "income" ? "received" : "paid";
}

export function emptyEntryForm(month: string, type: TransactionType = "income"): EntryForm {
  return {
    type,
    description: "",
    client: "",
    category: defaultCategory(type),
    value: "",
    date: defaultEntryDate(month),
    status: defaultStatus(type),
    payment: PAYMENT_METHODS[0],
    recurring: false,
  };
}

export function entryToForm(entry: FinanceEntry): EntryForm {
  return {
    type: entry.type,
    description: entry.description || "",
    client: entry.client || "",
    category: entry.category || defaultCategory(entry.type),
    value: entry.value ? maskCurrencyBRL(entry.value) : "",
    date: entry.date,
    status: entry.status,
    payment: entry.payment || PAYMENT_METHODS[0],
    recurring: Boolean(entry.recurringId),
  };
}

/** Troca o tipo mantendo o que faz sentido e reajustando categoria/status. */
export function switchEntryType(form: EntryForm, type: TransactionType): EntryForm {
  if (form.type === type) return form;
  return {
    ...form,
    type,
    category: defaultCategory(type),
    status: defaultStatus(type),
    recurring: type === "expense" ? form.recurring : false,
  };
}

export function formToEntryPayload(form: EntryForm): FinanceEntryPayload {
  const base: FinanceEntryPayload = {
    type: form.type,
    description: form.description.trim(),
    client: form.type === "income" ? form.client.trim() : "",
    category: form.category,
    value: parseCurrencyBRL(form.value),
    date: form.date,
    status: form.status,
    payment: form.payment,
  };
  if (form.type === "expense") base.recurring = form.recurring;
  return base;
}

export function validateEntryForm(form: EntryForm): string {
  if (!form.description.trim()) return "Informe a descrição.";
  if (parseCurrencyBRL(form.value) <= 0) return "Informe um valor maior que zero.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return "Informe a data.";
  return "";
}

/* ---------- Meses ---------- */

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09" → "setembro 2026" */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1] || ""} ${year}`;
}

export function monthName(month: string): string {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1] || "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ---------- Status ---------- */

export type EntryStatusKind = "received" | "pending" | "overdue" | "paid" | "planned";

export function entryStatusKind(entry: FinanceEntry, today: string): EntryStatusKind {
  if (entry.type === "income") {
    if (entry.status === "received") return "received";
    return entry.date < today ? "overdue" : "pending";
  }
  return entry.status === "paid" ? "paid" : "planned";
}

export const ENTRY_STATUS_LABELS: Record<EntryStatusKind, string> = {
  received: "Recebido",
  pending: "A receber",
  overdue: "Vencido",
  paid: "Pago",
  planned: "Previsto",
};

export function isEntryOpen(entry: FinanceEntry): boolean {
  return (entry.type === "income" && entry.status === "pending") || (entry.type === "expense" && entry.status === "planned");
}
