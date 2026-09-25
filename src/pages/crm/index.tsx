import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import CrmFilters from "@/components/crm/CrmFilters";
import EmptyState from "@/components/crm/EmptyState";
import LeadModal from "@/components/crm/LeadModal";
import LeadsTable from "@/components/crm/LeadsTable";
import PipelineBoard from "@/components/crm/PipelineBoard";
import ProposalsView from "@/components/crm/ProposalsView";
import ReportsView from "@/components/crm/ReportsView";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { LEAD_STAGE_LABELS } from "@/lib/constants";
import { computeLeadMetrics, EMPTY_LEAD_FILTERS, filterLeads, formatPercent, type LeadFilters } from "@/lib/crm/metrics";
import { formToPayload, type LeadForm } from "@/lib/crm/model";
import { resources } from "@/lib/resources";
import type { Lead, LeadStage } from "@/types";
import { formatCurrencyBRL, todayISO } from "@/utils/format";

type CrmTab = "leads" | "pipeline" | "proposals" | "reports";

const TABS: { value: CrmTab; label: string }[] = [
  { value: "leads", label: "Clientes / Leads" },
  { value: "pipeline", label: "Funil Comercial" },
  { value: "proposals", label: "Propostas" },
  { value: "reports", label: "Relatórios" },
];

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

export default function CrmPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<CrmTab>("pipeline");
  const [ownerId, setOwnerId] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [notice, setNotice] = useState("");
  const today = todayISO();

  const { data, isLoading, error, setData } = useAsyncData(() => resources.leads.list({ ownerId }), [ownerId]);
  const leads = useMemo(() => data || [], [data]);
  const filtered = useMemo(() => filterLeads(leads, filters), [leads, filters]);
  const metrics = useMemo(() => computeLeadMetrics(filtered), [filtered]);

  const openNew = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  // O botão global "Novo lead" da barra superior abre /crm?novo=1.
  useEffect(() => {
    if (!router.isReady || router.query.novo !== "1") return;
    openNew();
    const query = { ...router.query };
    delete query.novo;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router, openNew]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openEdit(lead: Lead) {
    setEditing(lead);
    setModalOpen(true);
  }

  async function handleSave(form: LeadForm) {
    const payload = formToPayload(form);
    if (editing) {
      const saved = await resources.leads.update(editing._id, payload);
      setData((current) =>
        (current || []).map((item) => (item._id === saved._id ? { ...item, ...saved, ownerName: item.ownerName } : item)),
      );
    } else {
      const saved = await resources.leads.create(payload);
      setData((current) => [{ ...saved, ownerName: saved.ownerName || user?.name }, ...(current || [])]);
    }
    setModalOpen(false);
  }

  async function handleDelete(lead: Lead) {
    await resources.leads.remove(lead._id);
    setData((current) => (current || []).filter((item) => item._id !== lead._id));
    setModalOpen(false);
  }

  async function quickDelete(lead: Lead) {
    if (!window.confirm(`Excluir o lead "${lead.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await handleDelete(lead);
    } catch (err) {
      setNotice(apiError(err, "Não foi possível excluir o lead."));
    }
  }

  async function moveLead(lead: Lead, stage: LeadStage) {
    const previous = leads;
    setData((current) => (current || []).map((item) => (item._id === lead._id ? { ...item, stage } : item)));
    try {
      const saved = await resources.leads.update(lead._id, { stage });
      setData((current) =>
        (current || []).map((item) => (item._id === saved._id ? { ...item, ...saved, ownerName: item.ownerName } : item)),
      );
    } catch (err) {
      setData(previous);
      setNotice(apiError(err, `Não foi possível mover "${lead.name}" para ${LEAD_STAGE_LABELS[stage]}.`));
    }
  }

  function openGenerator(lead: Lead) {
    void router.push(
      "/propostas?cliente=" +
        encodeURIComponent(lead.name) +
        "&empresa=" +
        encodeURIComponent(lead.company || "") +
        "&valor=" +
        (Number(lead.value) || 0).toFixed(2),
    );
  }

  const hasFilters = Boolean(filters.search || filters.service || filters.month);

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-72 w-[272px] shrink-0" />
          ))}
        </div>
      );
    }
    if (error) {
      return <EmptyState title="Não foi possível carregar os leads" text={error} />;
    }
    if (!leads.length && tab !== "pipeline") {
      return (
        <EmptyState
          title="Nenhum lead cadastrado ainda"
          text="Cadastre sua primeira oportunidade para acompanhar a negociação do primeiro contato ao fechamento."
          action={
            <button type="button" className="btn-primary" onClick={openNew}>
              <HiOutlinePlus className="h-4 w-4" /> Novo lead
            </button>
          }
        />
      );
    }
    if (tab === "pipeline") {
      return (
        <PipelineBoard
          leads={filtered}
          today={today}
          showOwner={isAdmin}
          onEdit={openEdit}
          onDelete={quickDelete}
          onMove={moveLead}
        />
      );
    }
    if (!filtered.length && tab !== "reports") {
      return <EmptyState title="Nada encontrado" text="Nenhum lead corresponde aos filtros selecionados." />;
    }
    if (tab === "leads") return <LeadsTable leads={filtered} today={today} showOwner={isAdmin} onEdit={openEdit} />;
    if (tab === "proposals") {
      return <ProposalsView leads={filtered} showOwner={isAdmin} onEdit={openEdit} onOpenGenerator={openGenerator} />;
    }
    return <ReportsView leads={filtered} />;
  }

  return (
    <>
      <Head>
        <title>CRM Comercial | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Ferramenta comercial"
        title="CRM Comercial"
        description="Acompanhe leads, propostas e negociações sem depender da memória."
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            <HiOutlinePlus className="h-4 w-4" /> Novo lead
          </button>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Potencial total em aberto" value={formatCurrencyBRL(metrics.openValue)} />
        <MetricCard label="Valor fechado / ganho" value={formatCurrencyBRL(metrics.wonValue)} tone="sage" />
        <MetricCard label="Ticket médio das oportunidades" value={formatCurrencyBRL(metrics.averageTicket)} />
        <MetricCard
          label="Taxa de conversão estimada"
          value={formatPercent(metrics.conversionRate)}
          hint={`${metrics.wonCount} de ${metrics.total} ganhos`}
          tone="gold"
        />
        <MetricCard label="Oportunidades cadastradas" value={String(metrics.total)} />
      </section>

      <div className="card mb-4 p-3 sm:p-4">
        <CrmFilters filters={filters} onChange={setFilters} ownerId={ownerId} onOwnerChange={setOwnerId} />
        {hasFilters ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/55">
            <span>
              {filtered.length} de {leads.length} leads no filtro atual.
            </span>
            <button type="button" className="font-semibold text-tan hover:underline" onClick={() => setFilters(EMPTY_LEAD_FILTERS)}>
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="inline-flex min-w-max gap-1 rounded-xl bg-beige p-1">
          {TABS.map((item) => {
            const active = item.value === tab;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition duration-150 ${
                  active ? "bg-white text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {notice ? (
        <div role="alert" className="mb-4 rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm font-medium text-burgundy">
          {notice}
        </div>
      ) : null}

      {renderContent()}

      <LeadModal
        open={modalOpen}
        lead={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
