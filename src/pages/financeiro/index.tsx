import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import RequireAdmin from "@/components/auth/RequireAdmin";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  FINANCE_CATEGORY_LABELS,
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_INCOME_CATEGORIES,
} from "@/lib/constants";
import { resources } from "@/lib/resources";
import MoneyInput from "@/components/ui/MoneyInput";
import { formatCurrencyBRL, formatDate, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import type { Transaction, TransactionType } from "@/types";

type PeriodFilter = "month" | "previous" | "all";
type TypeFilter = "all" | TransactionType;

const emptyForm = {
  type: "income" as TransactionType,
  category: "sale",
  description: "",
  value: "",
  date: new Date().toISOString().slice(0, 10),
};

function inPeriod(dateValue: string, period: PeriodFilter) {
  if (period === "all") return true;
  const date = new Date(dateValue);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (period === "previous" ? 1 : 0), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + (period === "previous" ? 0 : 1), 1);
  return date >= start && date < end;
}

function toDateInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function FinancePageContent() {
  const { data: transactions, isLoading, error, reload } = useAsyncData(() => resources.transactions.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const categoryOptions = form.type === "income" ? FINANCE_INCOME_CATEGORIES : FINANCE_EXPENSE_CATEGORIES;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (transactions || []).filter((item) => {
      if (!inPeriod(item.date, period)) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (categoryFilter !== "all") {
        const inDistribution = (item.distribution || []).some((entry) => entry.categoryName === categoryFilter);
        const inLegacy = item.category === categoryFilter;
        if (!inDistribution && !inLegacy) return false;
      }
      if (!term) return true;
      const haystack = [
        item.description,
        item.deal?.title,
        item.category ? FINANCE_CATEGORY_LABELS[item.category] : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [transactions, period, typeFilter, categoryFilter, search]);

  const income = filtered.filter((item) => item.type === "income").reduce((sum, item) => sum + item.value, 0);
  const expense = filtered.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.value, 0);
  const balance = income - expense;
  const sales = filtered.filter((item) => item.type === "income" && item.category === "sale");

  const rateio = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of sales) {
      if (item.distribution?.length) {
        for (const entry of item.distribution) {
          totals.set(entry.categoryName, (totals.get(entry.categoryName) || 0) + entry.value);
        }
      } else if (item.productCalculation) {
        totals.set("Operacional", (totals.get("Operacional") || 0) + item.productCalculation.operational);
        totals.set("Marketing", (totals.get("Marketing") || 0) + item.productCalculation.marketing10);
        totals.set("Imposto", (totals.get("Imposto") || 0) + item.productCalculation.tax8);
        totals.set("Equipamento", (totals.get("Equipamento") || 0) + item.productCalculation.equipment7);
        totals.set("Caixa", (totals.get("Caixa") || 0) + item.productCalculation.cash5);
        totals.set("Lucro", (totals.get("Lucro") || 0) + item.productCalculation.profit25);
      }
    }
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
  }, [sales]);

  const distributionCategories = useMemo(() => {
    const names = new Set<string>();
    for (const item of transactions || []) {
      for (const entry of item.distribution || []) names.add(entry.categoryName);
      if (item.category) names.add(item.category);
    }
    return Array.from(names);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, { type: TransactionType; value: number }>();
    for (const item of filtered) {
      const category = item.category || (item.type === "income" ? "other_income" : "other_expense");
      const current = totals.get(category);
      totals.set(category, { type: item.type, value: (current?.value || 0) + item.value });
    }
    return Array.from(totals.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const evolution = useMemo(() => {
    const map = new Map<string, { sold: number; moved: number }>();
    for (const item of filtered) {
      const key = item.date.slice(0, 7);
      const current = map.get(key) || { sold: 0, moved: 0 };
      if (item.type === "income") current.moved += item.value;
      if (item.type === "income" && item.category === "sale") current.sold += item.value;
      map.set(key, current);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const incomeCategories = categoryBreakdown.filter((item) => item.type === "income");
  const expenseCategories = categoryBreakdown.filter((item) => item.type === "expense");

  function openCreate() {
    setEditing(null);
    setSubmitError("");
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setSubmitError("");
    setForm({
      type: transaction.type,
      category: transaction.category || (transaction.type === "income" ? "sale" : "marketing"),
      description: transaction.description || transaction.deal?.title || "",
      value: maskCurrencyBRL(transaction.value),
      date: toDateInput(transaction.date),
    });
    setModalOpen(true);
  }

  function setType(type: TransactionType) {
    setForm({
      ...form,
      type,
      category: type === "income" ? "sale" : "marketing",
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    const payload = {
      type: form.type,
      category: form.category,
      description: form.description.trim() || undefined,
      value: parseCurrencyBRL(form.value),
      date: new Date(`${form.date}T12:00:00`).toISOString(),
    };
    try {
      if (editing) await resources.transactions.update(editing._id, payload);
      else await resources.transactions.create(payload);
      setModalOpen(false);
      await reload();
    } catch {
      setSubmitError("Não foi possível salvar o lançamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir este lançamento?")) return;
    await resources.transactions.remove(id);
    await reload();
  }

  return (
    <>
      <Head><title>Financeiro | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Growth"
        title="Dashboard financeiro"
        description="Vendas fechadas, data da movimentação e distribuição por categorias."
        actions={
          <div className="flex gap-2">
            <Link href="/configuracoes/financeiro" className="btn-secondary">Categorias</Link>
            <button type="button" className="btn-gold" onClick={openCreate}>Novo lançamento</button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          ["month", "Este mês"],
          ["previous", "Mês passado"],
          ["all", "Todo o período"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              period === value ? "bg-ink text-white" : "bg-white text-charcoal/60 hover:bg-beige"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px self-center bg-charcoal/10 sm:block" />
        {([
          ["all", "Todos"],
          ["income", "Entradas"],
          ["expense", "Saídas"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTypeFilter(value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              typeFilter === value ? "bg-tan text-white" : "bg-white text-charcoal/60 hover:bg-beige"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {distributionCategories.map((category) => (
            <option key={category} value={category}>
              {FINANCE_CATEGORY_LABELS[category] || category}
            </option>
          ))}
        </select>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total vendido" value={formatCurrencyBRL(sales.reduce((sum, item) => sum + item.value, 0))} tone="gold" />
        <MetricCard label="Total movimentado" value={formatCurrencyBRL(income)} tone="sage" />
        <MetricCard label="Saídas" value={formatCurrencyBRL(expense)} tone="burgundy" />
        <MetricCard label="Saldo" value={formatCurrencyBRL(balance)} />
        <MetricCard label="Qtd. de vendas" value={String(sales.length)} hint="fechamentos no recorte" />
      </section>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <article className="card p-5">
          <p className="eyebrow mb-3">Evolução por período</p>
          {evolution.length ? (
            <div className="space-y-2">
              {evolution.map(([periodLabel, values]) => (
                <div key={periodLabel}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{periodLabel}</span>
                    <span>{formatCurrencyBRL(values.sold)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                    <div
                      className="h-full bg-tan"
                      style={{ width: `${Math.min(100, (values.sold / (sales.reduce((sum, item) => sum + item.value, 0) || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/45">Sem movimentação neste recorte.</p>
          )}
        </article>

        <article className="card p-5">
          <p className="eyebrow mb-3">Por categoria</p>
          {categoryBreakdown.length ? (
            <div className="space-y-3">
              {([
                ["Entradas", incomeCategories, income, "bg-sage"],
                ["Saídas", expenseCategories, expense, "bg-burgundy"],
              ] as const).map(([label, rows, total, barClass]) =>
                rows.length ? (
                  <div key={label}>
                    <p className="mb-1.5 text-xs font-medium text-charcoal/45">{label}</p>
                    <div className="space-y-1.5">
                      {rows.map((row) => (
                        <div key={row.category}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-charcoal/65">{FINANCE_CATEGORY_LABELS[row.category] || row.category}</span>
                            <span className="font-medium">{formatCurrencyBRL(row.value)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                            <div
                              className={`h-full ${barClass}`}
                              style={{ width: `${Math.min(100, (row.value / (total || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-sm text-charcoal/45">As categorias aparecem depois do primeiro lançamento.</p>
          )}
        </article>

        <article className="card p-5">
          <p className="eyebrow mb-3">Distribuição das vendas</p>
          {rateio.length ? (
            <div className="space-y-2">
              {rateio.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-charcoal/55">{row.label}</span>
                  <span className="font-medium">{formatCurrencyBRL(row.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/45">O rateio aparece quando uma venda é fechada no funil.</p>
          )}
        </article>
      </div>

      <ListWorkspace
        countLabel={`${filtered.length} lançamentos neste recorte`}
        columns={["Tipo", "Descrição", "Categoria", "Origem", "Valor", "Data", "Ações"]}
        emptyMessage="Nenhum lançamento neste recorte."
        searchPlaceholder="Buscar descrição, categoria ou venda"
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.map((transaction) => (
          <tr key={transaction._id}>
            <td className="px-4 py-3">
              <span className={`chip ${transaction.type === "income" ? "bg-sage/10 text-sage" : "bg-burgundy/10 text-burgundy"}`}>
                {transaction.type === "income" ? "Entrada" : "Saída"}
              </span>
            </td>
            <td className="px-4 py-3 font-medium">
              {transaction.description || transaction.deal?.title || "Lançamento"}
            </td>
            <td className="px-4 py-3 text-charcoal/65">
              {transaction.distribution?.length
                ? transaction.distribution.map((entry) => entry.categoryName).join(", ")
                : transaction.category
                  ? FINANCE_CATEGORY_LABELS[transaction.category] || transaction.category
                  : "—"}
            </td>
            <td className="px-4 py-3">
              {transaction.dealId && transaction.deal?.funnelId ? (
                <Link
                  href={`/funis/${transaction.deal.funnelId}/negociacao/${transaction.dealId}`}
                  className="text-sm font-medium text-tan hover:underline"
                >
                  Venda
                </Link>
              ) : (
                <span className="text-charcoal/45">Manual</span>
              )}
            </td>
            <td className={`px-4 py-3 font-semibold ${transaction.type === "income" ? "text-sage" : "text-burgundy"}`}>
              {transaction.type === "income" ? "+" : "−"} {formatCurrencyBRL(transaction.value)}
            </td>
            <td className="px-4 py-3 text-charcoal/65">{formatDate(transaction.date)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-3">
                <button type="button" className="text-sm font-medium text-tan" onClick={() => openEdit(transaction)}>
                  Editar
                </button>
                <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(transaction._id)}>
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar lançamento" : "Novo lançamento"}
        description="Registre uma entrada ou saída com categoria e descrição."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" form="transaction-form" className="btn-gold" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editing ? "Salvar alterações" : "Salvar lançamento"}
            </button>
          </>
        }
      >
        <form id="transaction-form" onSubmit={handleSubmit}>
          <FormField label="Tipo">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  form.type === "income"
                    ? "border-sage bg-sage/10 text-sage"
                    : "border-charcoal/10 bg-surface text-charcoal/55 hover:bg-beige"
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  form.type === "expense"
                    ? "border-burgundy bg-burgundy/10 text-burgundy"
                    : "border-charcoal/10 bg-surface text-charcoal/55 hover:bg-beige"
                }`}
              >
                Saída
              </button>
            </div>
          </FormField>

          <FormField label="Categoria">
            <Select
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              options={categoryOptions.map((item) => ({ value: item.value, label: item.label }))}
            />
          </FormField>

          <FormField label="Descrição">
            <input
              className="input-search"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={form.type === "income" ? "Ex.: Fechamento do cliente X" : "Ex.: Anúncio Meta Ads"}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Valor">
              <MoneyInput
                value={form.value}
                onChange={(value) => setForm({ ...form, value })}
                required
              />
            </FormField>
            <FormField label="Data da movimentação">
              <input
                className="input-search"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </FormField>
          </div>
          {submitError ? <p className="mt-3 text-sm text-burgundy">{submitError}</p> : null}
        </form>
      </Modal>
    </>
  );
}

export default function FinancePage() {
  return (
    <RequireAdmin>
      <FinancePageContent />
    </RequireAdmin>
  );
}
