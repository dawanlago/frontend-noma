import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineCog6Tooth, HiOutlinePlus } from "react-icons/hi2";
import EmptyState from "@/components/crm/EmptyState";
import FunnelPicker from "@/components/crm/FunnelPicker";
import LeadModal from "@/components/crm/LeadModal";
import LeadsTable from "@/components/crm/LeadsTable";
import PipelineBoard from "@/components/crm/PipelineBoard";
import ReportsView from "@/components/crm/ReportsView";
import WonNotice from "@/components/crm/WonNotice";
import OptionSelect from "@/components/options/OptionSelect";
import OwnerFilter, { useOwnerName } from "@/components/tools/OwnerFilter";
import FilterBar, { type FilterChip } from "@/components/ui/FilterBar";
import ListHeader from "@/components/ui/ListHeader";
import HideValuesToggle from "@/components/ui/HideValuesToggle";
import MetricCard from "@/components/ui/MetricCard";
import Select from "@/components/ui/Select";
import { LEAD_TEMPERATURES, MONTH_NAMES } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { computeLeadMetrics, EMPTY_LEAD_FILTERS, filterLeads, formatPercent, type LeadFilters } from "@/lib/crm/metrics";
import { formToPayload, type LeadFormState } from "@/lib/crm/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Lead } from "@/types";
import { formatCurrencyBRL, todayISO } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

type CrmTab = "pipeline" | "list" | "reports";

const FUNNEL_KEY = "noma:crm:funnel";

const TABS: { value: CrmTab; label: string }[] = [
  { value: "pipeline", label: "Funil" },
  { value: "list", label: "Lista" },
  { value: "reports", label: "Painel" },
];

export default function CrmPage() {
  const router = useRouter();
  const { user, can, seesAll } = useAuth();
  // Quem tem o CRM no nível "todos" vê de quem é cada negociação e filtra por usuário.
  const isAdmin = seesAll("crm");
  const { funnels, isReady, labelOf } = useWorkspace();
  const [tab, setTab] = useState<CrmTab>("pipeline");
  const [funnelId, setFunnelId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [modal, setModal] = useState<{ open: boolean; lead: Lead | null }>({ open: false, lead: null });
  const [preset, setPreset] = useState<{ contactId?: string; companyId?: string }>({});
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const today = todayISO();

  const { data, isLoading, error, setData } = useAsyncData(() => resources.leads.list({ ownerId }), [ownerId]);
  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (data || []).forEach((lead) => {
      if (lead.status === "open") counts[lead.funnelId] = (counts[lead.funnelId] || 0) + 1;
    });
    return counts;
  }, [data]);
  // Funil aberto: o escolhido; senão o último usado neste navegador; senão o que tem mais negociações em aberto.
  const funnel = useMemo(() => {
    const chosen = funnels.find((item) => item._id === funnelId);
    if (chosen) return chosen;
    let saved = "";
    try {
      saved = localStorage.getItem(FUNNEL_KEY) || "";
    } catch {
      saved = "";
    }
    const remembered = funnels.find((item) => item._id === saved);
    if (remembered) return remembered;
    return [...funnels].sort((a, b) => (openCounts[b._id] || 0) - (openCounts[a._id] || 0))[0];
  }, [funnels, funnelId, openCounts]);

  function pickFunnel(id: string) {
    setFunnelId(id);
    try {
      localStorage.setItem(FUNNEL_KEY, id);
    } catch {
      // Sem armazenamento local: só não lembra a escolha.
    }
  }
  const leads = useMemo(() => (data || []).filter((lead) => lead.funnelId === funnel?._id), [data, funnel]);
  const filtered = useMemo(() => filterLeads(leads, filters), [leads, filters]);
  const metrics = useMemo(() => computeLeadMetrics(filtered), [filtered]);
  // "Na mesa": tudo o que está em aberto, somando todos os funis.
  const onTable = useMemo(() => {
    const open = (data || []).filter((lead) => lead.status === "open");
    return { count: open.length, value: open.reduce((total, lead) => total + (Number(lead.value) || 0), 0) };
  }, [data]);
  const ownerName = useOwnerName(ownerId, "crm");
  const chips: FilterChip[] = [
    filters.search ? { key: "search", label: `Busca: ${filters.search}`, onRemove: () => setFilters((f) => ({ ...f, search: "" })) } : null,
    filters.service
      ? { key: "service", label: labelOf("leadService", filters.service), onRemove: () => setFilters((f) => ({ ...f, service: "" })) }
      : null,
    filters.temperature
      ? {
          key: "temperature",
          label: LEAD_TEMPERATURES.find((item) => item.value === filters.temperature)?.label || filters.temperature,
          onRemove: () => setFilters((f) => ({ ...f, temperature: "" })),
        }
      : null,
    filters.month
      ? {
          key: "month",
          label: MONTH_NAMES[Number(filters.month) - 1]?.replace(/^./, (c) => c.toUpperCase()) || filters.month,
          onRemove: () => setFilters((f) => ({ ...f, month: "" })),
        }
      : null,
    ownerId ? { key: "owner", label: ownerName || "Usuário", onRemove: () => setOwnerId("") } : null,
  ].filter((chip): chip is FilterChip => Boolean(chip));

  const openNew = useCallback(() => {
    setPreset({});
    setModal({ open: true, lead: null });
  }, []);

  // "Nova negociação" (barra superior, perfis) abre /crm?novo=1[&contato=id][&empresa=id].
  useEffect(() => {
    if (!router.isReady || router.query.novo !== "1") return;
    const { contato, empresa } = router.query;
    setPreset({
      contactId: typeof contato === "string" ? contato : undefined,
      companyId: typeof empresa === "string" ? empresa : undefined,
    });
    setModal({ open: true, lead: null });
    const query = { ...router.query };
    delete query.novo;
    delete query.contato;
    delete query.empresa;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const replaceLead = (saved: Lead) =>
    setData((current) =>
      (current || []).map((item) => (item._id === saved._id ? { ...item, ...saved, ownerName: item.ownerName, commentsCount: item.commentsCount } : item)),
    );

  async function handleSave(form: LeadFormState) {
    const payload = formToPayload(form);
    if (modal.lead) {
      replaceLead(await resources.leads.update(modal.lead._id, payload));
    } else {
      const saved = await resources.leads.create(payload);
      setData((current) => [{ ...saved, ownerName: saved.ownerName || user?.name }, ...(current || [])]);
      if (saved.funnelId !== funnel?._id) pickFunnel(saved.funnelId);
    }
    setModal({ open: false, lead: null });
  }

  async function handleDelete(lead: Lead) {
    await resources.leads.remove(lead._id);
    setData((current) => (current || []).filter((item) => item._id !== lead._id));
    setModal({ open: false, lead: null });
  }

  async function quickDelete(lead: Lead) {
    if (!(await confirmDialog({ title: `Excluir a negociação "${lead.name}"?`, message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    try {
      await handleDelete(lead);
    } catch (err) {
      setNotice(apiError(err, "Não foi possível excluir a negociação."));
    }
  }

  async function moveLead(lead: Lead, stageId: string) {
    const previous = data;
    const stage = funnel?.stages.find((item) => item._id === stageId);
    setData((current) =>
      (current || []).map((item) => (item._id === lead._id ? { ...item, stageId, status: stage?.kind || item.status } : item)),
    );
    try {
      replaceLead(await resources.leads.update(lead._id, { stageId }));
      if (stage?.kind === "won") celebrate(lead);
    } catch (err) {
      setData(previous);
      setNotice(apiError(err, `Não foi possível mover "${lead.name}".`));
    }
  }

  async function moveSubStage(lead: Lead, subStageId: string) {
    const previous = data;
    setData((current) =>
      (current || []).map((item) => (item._id === lead._id ? { ...item, subStageId, subStageEnteredAt: new Date().toISOString() } : item)),
    );
    try {
      replaceLead(await resources.leads.update(lead._id, { subStageId }));
    } catch (err) {
      setData(previous);
      setNotice(apiError(err, `Não foi possível mudar a microetapa de "${lead.name}".`));
    }
  }

  async function markWon(lead: Lead) {
    try {
      const saved = await resources.leads.setStatus(lead._id, "won");
      replaceLead(saved);
      celebrate(saved);
    } catch (err) {
      setNotice(apiError(err, "Não foi possível registrar a venda."));
    }
  }

  // Pulso de comemoração no card; o modal de "Venda registrada" abre logo depois.
  function celebrate(lead: Lead) {
    setCelebrateId(lead._id);
    window.setTimeout(() => setCelebrateId((current) => (current === lead._id ? null : current)), 1000);
    window.setTimeout(() => setWonLead(lead), 650);
  }

  const openLead = (lead: Lead) => void router.push(`/crm/${lead._id}`);

  function renderContent() {
    if (isLoading || !isReady) {
      return (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-72 w-[272px] shrink-0" />
          ))}
        </div>
      );
    }
    if (error) return <EmptyState title="Não foi possível carregar as negociações" text={error} />;
    if (!funnel) {
      return (
        <EmptyState
          title="Nenhum funil cadastrado"
          text="Crie um funil com as etapas da sua venda para começar."
          action={
            can("configuracoes") ? (
              <Link href="/configuracoes/funis" className="btn-primary">
                Criar funil
              </Link>
            ) : undefined
          }
        />
      );
    }
    if (tab === "pipeline") {
      return (
        <PipelineBoard
          funnel={funnel}
          leads={filtered}
          today={today}
          showOwner={isAdmin}
          onOpen={openLead}
          onEdit={(lead) => setModal({ open: true, lead })}
          onDelete={(lead) => void quickDelete(lead)}
          onMove={(lead, stageId) => void moveLead(lead, stageId)}
          onSubStage={(lead, subStageId) => void moveSubStage(lead, subStageId)}
          onWon={(lead) => void markWon(lead)}
          celebrateId={celebrateId}
        />
      );
    }
    if (tab === "reports") return <ReportsView leads={filtered} funnel={funnel} />;
    if (!filtered.length) {
      return (
        <EmptyState
          title={leads.length ? "Nada encontrado" : "Nenhuma negociação neste funil"}
          text={leads.length ? "Nenhuma negociação corresponde aos filtros." : "Cadastre uma negociação para acompanhar do primeiro contato ao fechamento."}
          action={
            <button type="button" className="btn-primary" onClick={openNew}>
              <HiOutlinePlus className="h-4 w-4" /> Nova negociação
            </button>
          }
        />
      );
    }
    return <LeadsTable leads={filtered} funnels={funnels} today={today} showOwner={isAdmin} onOpen={openLead} />;
  }

  return (
    <>
      <Head>
        <title>CRM Comercial | Noma</title>
      </Head>

      <ListHeader
        title="CRM"
        aside={
          <>
          {funnels.length ? (
            <FunnelPicker funnels={funnels} value={funnel?._id || ""} counts={openCounts} canManage={can("configuracoes")} onChange={pickFunnel} />
          ) : null}
          </>
        }
        actions={
          <>
          <div role="tablist" className="inline-flex gap-0.5 rounded-lg bg-beige p-0.5">
            {TABS.map((item) => {
              const active = item.value === tab;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition duration-150 ${
                    active ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <HideValuesToggle />
          {can("configuracoes") ? (
            <Link href="/configuracoes/funis" className="btn-ghost h-9 w-9" aria-label="Gerenciar funis" title="Gerenciar funis">
              <HiOutlineCog6Tooth className="h-5 w-5" />
            </Link>
          ) : null}
          <button type="button" className="btn-primary" onClick={openNew}>
            <HiOutlinePlus className="h-4 w-4" /> Nova negociação
          </button>
          </>
        }
      />

      <section className="noma-stagger mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Potencial em aberto" value={formatCurrencyBRL(metrics.openValue)} money />
        <MetricCard label="Vendas feitas" value={formatCurrencyBRL(metrics.wonValue)} hint={`${metrics.wonCount} vendas`} tone="sage" money />
        <MetricCard label="Ticket médio" value={formatCurrencyBRL(metrics.averageTicket)} money />
        <MetricCard
          label="Taxa de conversão"
          value={formatPercent(metrics.conversionRate)}
          hint={`${metrics.wonCount} de ${metrics.total}`}
          tone="gold"
        />
        <MetricCard label="Negociações no funil" value={String(metrics.total)} />
      </section>

      <FilterBar
        search={{ value: filters.search, onChange: (search) => setFilters({ ...filters, search }), placeholder: "Buscar negociação, contato ou empresa" }}
        count={
          <>
            {filtered.length} negociaç{filtered.length === 1 ? "ão" : "ões"} · <span data-money>{formatCurrencyBRL(metrics.openValue)}</span> em aberto
          </>
        }
        chips={chips}
        aside={
          <div className="flex items-center gap-3 rounded-lg border border-tan/20 bg-tan/[0.06] px-3 py-1.5" title="Negociações em aberto somando todos os funis">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-tan">Na mesa</span>
            <span data-money className="text-sm font-semibold tabular-nums text-charcoal">
              {formatCurrencyBRL(onTable.value)}
            </span>
            <span className="text-xs text-charcoal/55">
              {onTable.count} em aberto · todos os funis
            </span>
          </div>
        }
      >
        <OptionSelect
          list="leadService"
          noAdd
          value={filters.service}
          onChange={(service) => setFilters({ ...filters, service })}
          emptyLabel="Todos os serviços"
        />
        <Select
          value={filters.temperature}
          onChange={(temperature) => setFilters({ ...filters, temperature })}
          placeholder="Termômetro"
          options={[{ value: "", label: "Todos os termômetros" }, ...LEAD_TEMPERATURES.map((item) => ({ value: item.value, label: item.label }))]}
        />
        <Select
          value={filters.month}
          onChange={(month) => setFilters({ ...filters, month })}
          placeholder="Todos os meses"
          options={[{ value: "", label: "Todos os meses" }, ...MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name.charAt(0).toUpperCase() + name.slice(1) }))]}
        />
        {isAdmin ? <OwnerFilter module="crm" value={ownerId} onChange={setOwnerId} /> : null}
      </FilterBar>

      {notice ? (
        <div role="alert" className="mb-4 rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm font-medium text-burgundy">
          {notice}
        </div>
      ) : null}

      {renderContent()}

      <LeadModal
        open={modal.open}
        lead={modal.lead}
        funnelId={funnel?._id}
        preset={preset}
        onClose={() => setModal({ open: false, lead: null })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <WonNotice lead={wonLead} onClose={() => setWonLead(null)} onLeadSaved={replaceLead} />
    </>
  );
}
