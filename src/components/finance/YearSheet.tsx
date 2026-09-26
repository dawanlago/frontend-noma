import { useMemo, useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { MONTH_NAMES } from "@/lib/constants";
import { buildSheet, isRealized, type SheetMode } from "@/lib/finance/sheet";
import { ENTRY_STATUS_LABELS, entryStatusKind } from "@/lib/finance/model";
import { resources } from "@/lib/resources";
import type { FinanceEntry, TransactionType } from "@/types";
import { downloadFile } from "@/utils/document";
import { formatCurrencyBRL, formatDateOnly, todayISO } from "@/utils/format";

const MONTHS = MONTH_NAMES.map((name) => name.charAt(0).toUpperCase() + name.slice(1, 3));

function money(value: number) {
  return value ? formatCurrencyBRL(value) : "—";
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

interface YearSheetProps {
  year: string;
  ownerId: string;
  cashbox?: string;
  onEdit: (entry: FinanceEntry) => void;
  /** Muda quando uma movimentação é salva, para recarregar. */
  version: number;
}

/** Planilha do ano: categorias × meses e a lista completa de lançamentos com filtros. */
export default function YearSheet({ year, ownerId, cashbox = "", onEdit, version }: YearSheetProps) {
  const { labelOf } = useWorkspace();
  const { data, isLoading, error } = useAsyncData(() => resources.finance.yearEntries(year, { ownerId, cashbox }), [year, ownerId, cashbox, version]);
  const [mode, setMode] = useState<SheetMode>("all");
  const [type, setType] = useState<"" | TransactionType>("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const today = todayISO();

  const entries = useMemo(() => data || [], [data]);
  const sheet = useMemo(() => buildSheet(entries, mode), [entries, mode]);
  const categoryLabel = (entryType: TransactionType, value: string) =>
    labelOf(entryType === "income" ? "incomeCategory" : "expenseCategory", value);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    entries.forEach((entry) => seen.set(`${entry.type}|${entry.category}`, categoryLabel(entry.type, entry.category)));
    return [...seen.entries()]
      .filter(([key]) => !type || key.startsWith(`${type}|`))
      .map(([value, label]) => ({ value, label: `${label} (${value.startsWith("income") ? "entrada" : "despesa"})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, type, labelOf]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (mode === "realized" && !isRealized(entry)) return false;
      if (type && entry.type !== type) return false;
      if (category && `${entry.type}|${entry.category}` !== category) return false;
      if (status && entryStatusKind(entry, today) !== status) return false;
      if (month && entry.date.slice(5, 7) !== month) return false;
      if (term && !`${entry.description} ${entry.client}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [entries, mode, type, category, status, month, search, today]);

  const filteredTotal = filtered.reduce((total, entry) => total + (entry.type === "income" ? entry.value : -entry.value), 0);

  function exportSheet() {
    const header = ["Categoria", ...MONTHS, "Total"].map(csvCell).join(";");
    const line = (label: string, values: number[], total: number) => [label, ...values.map((v) => v.toFixed(2).replace(".", ",")), total.toFixed(2).replace(".", ",")].map(csvCell).join(";");
    const rows = [
      header,
      ...sheet.income.map((row) => line(`Entrada: ${categoryLabel("income", row.category)}`, row.months, row.total)),
      line("Total de entradas", sheet.incomeTotals.months, sheet.incomeTotals.total),
      ...sheet.expense.map((row) => line(`Despesa: ${categoryLabel("expense", row.category)}`, row.months, row.total)),
      line("Total de despesas", sheet.expenseTotals.months, sheet.expenseTotals.total),
      line("Resultado", sheet.result.months, sheet.result.total),
    ];
    downloadFile(`financeiro-${year}-categorias.csv`, `﻿${rows.join("\n")}`, "text/csv;charset=utf-8");
  }

  function exportEntries() {
    const header = ["Data", "Descrição", "Tipo", "Categoria", "Cliente/Fornecedor", "Pagamento", "Status", "Valor"].map(csvCell).join(";");
    const rows = filtered.map((entry) =>
      [
        formatDateOnly(entry.date),
        entry.description,
        entry.type === "income" ? "Entrada" : "Despesa",
        categoryLabel(entry.type, entry.category),
        entry.client,
        entry.payment,
        ENTRY_STATUS_LABELS[entryStatusKind(entry, today)],
        (entry.type === "income" ? entry.value : -entry.value).toFixed(2).replace(".", ","),
      ]
        .map(csvCell)
        .join(";"),
    );
    downloadFile(`financeiro-${year}-lancamentos.csv`, `﻿${[header, ...rows].join("\n")}`, "text/csv;charset=utf-8");
  }

  function filterByCategory(entryType: TransactionType, value: string) {
    setType(entryType);
    setCategory(`${entryType}|${value}`);
    document.getElementById("lancamentos-do-ano")?.scrollIntoView({ behavior: "smooth" });
  }

  if (error) return <p className="card p-5 text-sm text-burgundy">{error}</p>;

  const renderRows = (rows: typeof sheet.income, entryType: TransactionType) =>
    rows.map((row) => (
      <tr key={row.category} className="cursor-pointer" onClick={() => filterByCategory(entryType, row.category)} title="Ver lançamentos desta categoria">
        <td className="sticky left-0 bg-surface px-4 py-2 font-medium text-charcoal">{categoryLabel(entryType, row.category)}</td>
        {row.months.map((value, index) => (
          <td key={index} className={`px-3 py-2 text-right tabular-nums ${value ? "text-charcoal" : "text-charcoal/25"}`}>
            {money(value)}
          </td>
        ))}
        <td className="px-4 py-2 text-right font-semibold tabular-nums">{money(row.total)}</td>
      </tr>
    ));

  const totalRow = (label: string, values: number[], total: number, tone = "") => (
    <tr className={`bg-beige font-semibold ${tone}`}>
      <td className="sticky left-0 bg-beige px-4 py-2">{label}</td>
      {values.map((value, index) => (
        <td key={index} className="px-3 py-2 text-right tabular-nums">
          {money(value)}
        </td>
      ))}
      <td className="px-4 py-2 text-right tabular-nums">{money(total)}</td>
    </tr>
  );

  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-charcoal/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Distribuição por categoria · {year}</h2>
            <p className="text-sm text-charcoal/55">Clique numa categoria para ver os lançamentos dela.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex gap-1 rounded-lg bg-beige p-1">
              {(
                [
                  { value: "all", label: "Todos os lançamentos" },
                  { value: "realized", label: "Só realizados" },
                ] as { value: SheetMode; label: string }[]
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mode === item.value}
                  onClick={() => setMode(item.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    mode === item.value ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-secondary !py-1.5" onClick={exportSheet} disabled={isLoading}>
              Exportar (CSV)
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="skeleton m-5 h-64" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1100px] text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-beige px-4 py-2 text-left">Categoria</th>
                  {MONTHS.map((name) => (
                    <th key={name} className="px-3 py-2 text-right">
                      {name}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={14} className="bg-sage/[0.08] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-sage">
                    Entradas
                  </td>
                </tr>
                {renderRows(sheet.income, "income")}
                {totalRow("Total de entradas", sheet.incomeTotals.months, sheet.incomeTotals.total)}
                <tr>
                  <td colSpan={14} className="bg-burgundy/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-burgundy">
                    Despesas
                  </td>
                </tr>
                {renderRows(sheet.expense, "expense")}
                {totalRow("Total de despesas", sheet.expenseTotals.months, sheet.expenseTotals.total)}
                {totalRow("Resultado", sheet.result.months, sheet.result.total, "text-charcoal")}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="lancamentos-do-ano" className="card overflow-hidden">
        <div className="space-y-3 border-b border-charcoal/[0.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-charcoal">Lançamentos de {year}</h2>
            <button type="button" className="btn-secondary !py-1.5" onClick={exportEntries} disabled={!filtered.length}>
              Exportar lançamentos (CSV)
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_220px_150px_140px]">
            <label className="relative block">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
              <input className="input-search pl-9" placeholder="Buscar descrição ou cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <Select
              value={type}
              placeholder="Entradas e despesas"
              onChange={(value) => {
                setType(value as "" | TransactionType);
                setCategory("");
              }}
              options={[
                { value: "", label: "Entradas e despesas" },
                { value: "income", label: "Entradas" },
                { value: "expense", label: "Despesas" },
              ]}
            />
            <Select value={category} onChange={setCategory} placeholder="Todas as categorias" options={[{ value: "", label: "Todas as categorias" }, ...categoryOptions]} />
            <Select
              value={status}
              onChange={setStatus}
              placeholder="Todos os status"
              options={[{ value: "", label: "Todos os status" }, ...Object.entries(ENTRY_STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
            />
            <Select
              value={month}
              onChange={setMonth}
              placeholder="Todos os meses"
              options={[{ value: "", label: "Todos os meses" }, ...MONTHS.map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }))]}
            />
          </div>
          <p className="text-xs text-charcoal/55">
            {filtered.length} lançamento(s) · saldo {formatCurrencyBRL(filteredTotal)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Cliente / fornecedor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-charcoal/50">
                    Nenhum lançamento neste filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry._id} className="cursor-pointer" onClick={() => onEdit(entry)}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-charcoal/65">{formatDateOnly(entry.date)}</td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{entry.description}</td>
                    <td className="px-4 py-2.5 text-charcoal/70">{categoryLabel(entry.type, entry.category)}</td>
                    <td className="px-4 py-2.5 text-charcoal/70">{entry.client || "—"}</td>
                    <td className="px-4 py-2.5 text-charcoal/70">{ENTRY_STATUS_LABELS[entryStatusKind(entry, today)]}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${entry.type === "expense" ? "text-burgundy" : "text-charcoal"}`}>
                      {entry.type === "expense" ? "- " : ""}
                      {formatCurrencyBRL(entry.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
