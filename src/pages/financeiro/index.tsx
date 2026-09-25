import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  HiArrowTrendingDown,
  HiArrowTrendingUp,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineScale,
} from "react-icons/hi2";
import ClientRankingCard from "@/components/finance/ClientRankingCard";
import DeleteEntryModal from "@/components/finance/DeleteEntryModal";
import EntryList from "@/components/finance/EntryList";
import EntryModal, { useCategoryDefaults } from "@/components/finance/EntryModal";
import GoalCard from "@/components/finance/GoalCard";
import GoalModal from "@/components/finance/GoalModal";
import HealthCard from "@/components/finance/HealthCard";
import StatCard from "@/components/finance/StatCard";
import YearSheet from "@/components/finance/YearSheet";
import YearView from "@/components/finance/YearView";
import OptionSelect from "@/components/options/OptionSelect";
import OwnerFilter from "@/components/tools/OwnerFilter";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { buildMonthInsights } from "@/lib/finance/insights";
import {
  clientRanking,
  computeMonthTotals,
  ENTRY_FILTERS,
  filterEntries,
  percentOf,
  type EntryFilter,
} from "@/lib/finance/metrics";
import { entryFromLead, formToEntryPayload, monthLabel, shiftMonth, type EntryForm } from "@/lib/finance/model";
import { resources } from "@/lib/resources";
import type { FinanceEntry, TransactionType } from "@/types";
import { currentMonthISO, formatCurrencyBRL, todayISO } from "@/utils/format";

type View = "month" | "year" | "sheet";

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

export default function FinancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const defaults = useCategoryDefaults();
  const { optionsOf } = useWorkspace();
  const [view, setView] = useState<View>("month");
  const [month, setMonth] = useState(currentMonthISO);
  const [year, setYear] = useState(() => currentMonthISO().slice(0, 4));
  const [ownerId, setOwnerId] = useState("");
  const [filter, setFilter] = useState<EntryFilter>("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sheetVersion, setSheetVersion] = useState(0);
  const [entryModal, setEntryModal] = useState<{
    open: boolean;
    type: TransactionType;
    entry: FinanceEntry | null;
    preset?: EntryForm | null;
  }>({
    open: false,
    type: "income",
    entry: null,
  });
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const today = todayISO();

  const monthData = useAsyncData(
    () => (view === "month" ? resources.finance.entries(month, { ownerId }) : Promise.resolve(null)),
    [view, month, ownerId],
  );
  const yearData = useAsyncData(
    () => (view === "year" ? resources.finance.summary(year, { ownerId }) : Promise.resolve(null)),
    [view, year, ownerId],
  );

  const entries = useMemo(() => monthData.data?.entries || [], [monthData.data]);
  const goal = monthData.data?.goal || 0;
  const totals = useMemo(() => computeMonthTotals(entries), [entries]);
  const insights = useMemo(() => buildMonthInsights(totals, goal), [totals, goal]);
  const ranking = useMemo(() => clientRanking(entries), [entries]);
  // Filtro por categoria e busca somam-se ao filtro de tipo/situação.
  const narrowed = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (!category || entry.category === category) &&
        (!term || `${entry.description} ${entry.client}`.toLowerCase().includes(term)),
    );
  }, [entries, category, search]);
  const visible = useMemo(() => filterEntries(narrowed, filter), [narrowed, filter]);
  const counts = useMemo(
    () =>
      Object.fromEntries(ENTRY_FILTERS.map((item) => [item.value, filterEntries(narrowed, item.value).length])) as Record<
        EntryFilter,
        number
      >,
    [narrowed],
  );

  // Admin vendo outro usuário: a meta exibida é a dele e não pode ser alterada aqui.
  const canEditGoal = !ownerId || ownerId === user?._id;
  const monthLoading = monthData.isLoading;

  function openNew(type: TransactionType) {
    setEntryModal({ open: true, type, entry: null });
  }

  // "Lançar no financeiro" a partir de uma venda feita no CRM: /financeiro?negociacao=<id>.
  useEffect(() => {
    const leadId = router.query.negociacao;
    if (!router.isReady || typeof leadId !== "string") return;
    void resources.leads
      .get(leadId)
      .then((lead) => setEntryModal({ open: true, type: "income", entry: null, preset: entryFromLead(lead, month, defaults) }))
      .catch(() => setNotice("Não foi possível carregar a negociação."));
    void router.replace({ pathname: router.pathname }, undefined, { shallow: true });
    // Só reage à chegada do parâmetro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.negociacao]);

  function openEdit(entry: FinanceEntry) {
    setEntryModal({ open: true, type: entry.type, entry });
  }

  function closeEntryModal() {
    setEntryModal((current) => ({ ...current, open: false }));
  }

  async function handleSaveEntry(form: EntryForm) {
    const payload = formToEntryPayload(form);
    if (entryModal.entry) {
      await resources.finance.updateEntry(entryModal.entry._id, payload);
    } else {
      await resources.finance.createEntry(payload);
    }
    closeEntryModal();
    const savedMonth = form.date.slice(0, 7);
    if (view === "month" && savedMonth !== month) {
      setNotice(`Movimentação salva em ${monthLabel(savedMonth)}.`);
    }
    setSheetVersion((current) => current + 1);
    if (view === "month") await monthData.reload();
  }

  async function handleSettle(entry: FinanceEntry) {
    const status = entry.type === "income" ? "received" : "paid";
    setBusyId(entry._id);
    try {
      await resources.finance.updateEntry(entry._id, { status });
      monthData.setData((current) =>
        current
          ? { ...current, entries: current.entries.map((item) => (item._id === entry._id ? { ...item, status } : item)) }
          : current,
      );
    } catch (err) {
      setNotice(apiError(err, "Não foi possível atualizar a movimentação."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(entry: FinanceEntry, scope?: "series") {
    await resources.finance.removeEntry(entry._id, scope);
    setDeleting(null);
    setSheetVersion((current) => current + 1);
    monthData.setData((current) =>
      current ? { ...current, entries: current.entries.filter((item) => item._id !== entry._id) } : current,
    );
  }

  async function handleSaveGoal(value: number) {
    await resources.finance.setGoal(month, value);
    monthData.setData((current) => (current ? { ...current, goal: value } : current));
    setGoalOpen(false);
  }

  function switchView(next: View) {
    if (next !== "month" && view === "month") setYear(month.slice(0, 4));
    setView(next);
  }

  function openMonth(target: string) {
    setMonth(target);
    setView("month");
  }

  // Mostra a categoria filtrada só no seletor do tipo a que ela pertence.
  function categoryInList(type: TransactionType) {
    if (!category) return "";
    return optionsOf(type === "income" ? "incomeCategory" : "expenseCategory").some((item) => item.value === category) ? category : "";
  }

  const pendingText =
    totals.pendingCount === 0
      ? "Nenhum recebimento pendente."
      : `${totals.pendingCount} ${totals.pendingCount === 1 ? "recebimento pendente" : "recebimentos pendentes"}`;

  const navLabel = view === "month" ? monthLabel(month) : year;

  function step(delta: number) {
    if (view === "month") setMonth((current) => shiftMonth(current, delta));
    else setYear((current) => String(Number(current) + delta));
  }

  return (
    <>
      <Head>
        <title>Financeiro | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Gestão"
        title="Financeiro"
        description="Registre o que entrou, o que saiu e o que ainda precisa receber. Acompanhe cada mês, a planilha do ano por categoria e o resultado da produtora."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => openNew("expense")}>
              <HiOutlinePlus className="h-4 w-4" /> Despesa
            </button>
            <button type="button" className="btn-primary" onClick={() => openNew("income")}>
              <HiOutlinePlus className="h-4 w-4" /> Entrada
            </button>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost" aria-label="Anterior" onClick={() => step(-1)}>
            <HiOutlineChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[160px] text-center text-lg font-semibold capitalize text-charcoal">{navLabel}</span>
          <button type="button" className="btn-ghost" aria-label="Próximo" onClick={() => step(1)}>
            <HiOutlineChevronRight className="h-5 w-5" />
          </button>
          {view === "month" && month !== currentMonthISO() ? (
            <button type="button" className="ml-1 text-xs font-semibold text-tan hover:underline" onClick={() => setMonth(currentMonthISO())}>
              Mês atual
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" className="inline-flex gap-1 self-start rounded-xl bg-beige p-1">
            {(
              [
                { value: "month", label: "Visão do mês" },
                { value: "year", label: "Visão do ano" },
                { value: "sheet", label: "Planilha" },
              ] as { value: View; label: string }[]
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={view === item.value}
                onClick={() => switchView(item.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  view === item.value ? "bg-white text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <OwnerFilter value={ownerId} onChange={setOwnerId} />
        </div>
      </div>

      {notice ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-tan/20 bg-tan/[0.06] px-4 py-3 text-sm font-medium text-charcoal">
          <span>{notice}</span>
          <button type="button" className="text-xs font-semibold text-tan" onClick={() => setNotice("")}>
            Fechar
          </button>
        </div>
      ) : null}

      {view === "sheet" ? (
        <YearSheet year={year} ownerId={ownerId} version={sheetVersion} onEdit={openEdit} />
      ) : view === "year" ? (
        <YearView
          year={year}
          months={yearData.data?.months || []}
          isLoading={yearData.isLoading}
          error={yearData.error}
          onOpenMonth={openMonth}
        />
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Entradas recebidas"
              value={formatCurrencyBRL(totals.received)}
              text="Valores que já entraram no caixa."
              tone="sage"
              icon={<HiArrowTrendingUp className="h-4 w-4" />}
              loading={monthLoading}
            />
            <StatCard
              label="Despesas pagas"
              value={formatCurrencyBRL(totals.paid)}
              text={
                totals.received > 0
                  ? `As despesas representam ${percentOf(totals.paid, totals.received)}% do valor recebido.`
                  : "Nenhum valor recebido para comparar ainda."
              }
              tone="burgundy"
              icon={<HiArrowTrendingDown className="h-4 w-4" />}
              loading={monthLoading}
            />
            <StatCard
              label="Resultado do mês"
              value={formatCurrencyBRL(totals.result)}
              text={
                totals.received > 0
                  ? `Você ficou com ${percentOf(totals.result, totals.received)}% do valor recebido.`
                  : "Recebido menos despesas pagas."
              }
              tone={totals.result < 0 ? "burgundy" : "default"}
              icon={<HiOutlineScale className="h-4 w-4" />}
              loading={monthLoading}
            />
            <StatCard
              label="A receber"
              value={formatCurrencyBRL(totals.pending)}
              text={pendingText}
              tone="gold"
              icon={<HiOutlineClock className="h-4 w-4" />}
              loading={monthLoading}
            />
          </section>

          {monthData.error ? (
            <div className="mb-4 rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm font-medium text-burgundy">
              {monthData.error}
            </div>
          ) : null}

          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_240px_240px]">
            <input
              className="input-search"
              placeholder="Buscar descrição ou cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <OptionSelect list="incomeCategory" noAdd value={categoryInList("income")} onChange={setCategory} emptyLabel="Todos os tipos de receita" />
            <OptionSelect list="expenseCategory" noAdd value={categoryInList("expense")} onChange={setCategory} emptyLabel="Todas as categorias de despesa" />
          </div>
          {category || search ? (
            <p className="mb-3 text-xs text-charcoal/55">
              Filtro ativo: {category ? `categoria “${category}”` : ""} {search ? `busca “${search}”` : ""} ·{" "}
              <button
                type="button"
                className="font-semibold text-tan hover:underline"
                onClick={() => {
                  setCategory("");
                  setSearch("");
                }}
              >
                Limpar
              </button>
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <EntryList
              entries={visible}
              counts={counts}
              filter={filter}
              onFilterChange={setFilter}
              today={today}
              isLoading={monthLoading}
              showOwner={isAdmin}
              busyId={busyId}
              onSettle={handleSettle}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
            <aside className="grid gap-6 self-start lg:sticky lg:top-20">
              <GoalCard goal={goal} received={totals.received} canEdit={canEditGoal} onEdit={() => setGoalOpen(true)} />
              <HealthCard insights={insights} isLoading={monthLoading} />
              <ClientRankingCard rows={ranking} />
            </aside>
          </div>
        </>
      )}

      <EntryModal
        open={entryModal.open}
        month={month}
        initialType={entryModal.type}
        entry={entryModal.entry}
        preset={entryModal.preset}
        onClose={closeEntryModal}
        onSave={handleSaveEntry}
      />
      <DeleteEntryModal entry={deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
      <GoalModal
        open={goalOpen}
        label={monthLabel(month)}
        goal={goal}
        onClose={() => setGoalOpen(false)}
        onSave={handleSaveGoal}
      />
    </>
  );
}
