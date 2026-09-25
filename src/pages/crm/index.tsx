import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import CrmFilters from "@/components/crm/CrmFilters";
import EmptyState from "@/components/crm/EmptyState";
import LeadModal from "@/components/crm/LeadModal";
import LeadsTable from "@/components/crm/LeadsTable";
import PipelineBoard from "@/components/crm/PipelineBoard";
import ReportsView from "@/components/crm/ReportsView";
import WonNotice from "@/components/crm/WonNotice";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { computeLeadMetrics, EMPTY_LEAD_FILTERS, filterLeads, formatPercent, type LeadFilters } from "@/lib/crm/metrics";
import { formToPayload, type LeadFormState } from "@/lib/crm/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Lead } from "@/types";
import { formatCurrencyBRL, todayISO } from "@/utils/format";

type CrmTab = "pipeline" | "list" | "reports";

const TABS: { value: CrmTab; label: string }[] = [
  { value: "pipeline", label: "Funil" },
  { value: "list", label: "Lista" },
  { value: "reports", label: "Relatórios" },
];

export default function CrmPage() {
  const router = useRouter();
  const { user, isAdmin, can } = useAuth();
  const { funnels, isReady } = useWorkspace();
  const [tab, setTab] = useState<CrmTab>("pipeline");
  const [funnelId, setFunnelId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [modal, setModal] = useState<{ open: boolean; lead: Lead | null }>({ open: false, lead: null });
  const [preset, setPreset] = useState<{ contactId?: string; companyId?: string }>({});
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  const [notice, setNotice] = useState("");
  const today = todayISO();

  const funnel = funnels.find((item) => item._id === funnelId) || funnels[0];
  const { data, isLoading, error, setData } = useAsyncData(() => resources.leads.list({ ownerId }), [ownerId]);
  const leads = useMemo(() => (data || []).filter((lead) => lead.funnelId === funnel?._id), [data, funnel]);
  const filtered = useMemo(() => filterLeads(leads, filters), [leads, filters]);
  const metrics = useMemo(() => computeLeadMetrics(filtered), [filtered]);

  const openNew = useCallback(() => {
    setPreset({});
    setModal({ open: true, lead: null });
  }, []);

  // "Nova venda" (barra superior, perfis) abre /crm?novo=1[&contato=id][&empresa=id].
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
      if (saved.funnelId !== funnel?._id) setFunnelId(saved.funnelId);
    }
    setModal({ open: false, lead: null });
  }

  async function handleDelete(lead: Lead) {
    await resources.leads.remove(lead._id);
    setData((current) => (current || []).filter((item) => item._id !== lead._id));
    setModal({ open: false, lead: null });
  }

  async function quickDelete(lead: Lead) {
    if (!window.confirm(`Excluir a negociação "${lead.name}"? Essa ação não pode ser desfeita.`)) return;
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
      if (stage?.kind === "won") setWonLead(lead);
    } catch (err) {
      setData(previous);
      setNotice(apiError(err, `Não foi possível mover "${lead.name}".`));
    }
  }

  async function markWon(lead: Lead) {
    try {
      const saved = await resources.leads.setStatus(lead._id, "won");
      replaceLead(saved);
      setWonLead(saved);
    } catch (err) {
      setNotice(apiError(err, "Não foi possível registrar a venda."));
    }
  }

  const openLead = (lead: Lead) => void router.push(`/crm/${lead._id}`);
  const hasFilters = Boolean(filters.search || filters.service || filters.month || filters.temperature);

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
          onWon={(lead) => void markWon(lead)}
        />
      );
    }
    if (tab === "reports") return <ReportsView leads={filtered} funnel={funnel} />;
    if (!filtered.length) {
      return (
        <EmptyState
          title={leads.length ? "Nada encontrado" : "Nenhuma negociação neste funil"}
          text={leads.length ? "Nenhuma negociação corresponde aos filtros." : "Cadastre uma venda para acompanhar do primeiro contato ao fechamento."}
          action={
            <button type="button" className="btn-primary" onClick={openNew}>
              <HiOutlinePlus className="h-4 w-4" /> Nova venda
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

      <PageHeader
        eyebrow="Comercial"
        title="CRM Comercial"
        description="Acompanhe cada venda no funil certo, do primeiro contato ao fechamento."
        actions={
          <>
            {can("configuracoes") ? (
              <Link href="/configuracoes/funis" className="btn-secondary">
                Gerenciar funis
              </Link>
            ) : null}
            <button type="button" className="btn-primary" onClick={openNew}>
              <HiOutlinePlus className="h-4 w-4" /> Nova venda
            </button>
          </>
        }
      />

      {funnels.length > 1 ? (
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2">
            {funnels.map((item) => {
              const active = item._id === funnel?._id;
              const count = (data || []).filter((lead) => lead.funnelId === item._id && lead.status === "open").length;
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setFunnelId(item._id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    active ? "border-tan bg-tan text-white" : "border-charcoal/10 bg-white text-charcoal/65 hover:border-charcoal/25"
                  }`}
                >
                  {item.name}
                  <span className={`ml-2 text-xs ${active ? "text-white/75" : "text-charcoal/40"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Potencial em aberto" value={formatCurrencyBRL(metrics.openValue)} />
        <MetricCard label="Vendas feitas" value={formatCurrencyBRL(metrics.wonValue)} hint={`${metrics.wonCount} vendas`} tone="sage" />
        <MetricCard label="Ticket médio" value={formatCurrencyBRL(metrics.averageTicket)} />
        <MetricCard
          label="Taxa de conversão"
          value={formatPercent(metrics.conversionRate)}
          hint={`${metrics.wonCount} de ${metrics.total}`}
          tone="gold"
        />
        <MetricCard label="Negociações no funil" value={String(metrics.total)} />
      </section>

      <div className="card mb-4 p-3 sm:p-4">
        <CrmFilters filters={filters} onChange={setFilters} ownerId={ownerId} onOwnerChange={setOwnerId} />
        {hasFilters ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/55">
            <span>
              {filtered.length} de {leads.length} negociações no filtro atual.
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
        open={modal.open}
        lead={modal.lead}
        funnelId={funnel?._id}
        preset={preset}
        onClose={() => setModal({ open: false, lead: null })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <WonNotice lead={wonLead} onClose={() => setWonLead(null)} />
    </>
  );
}
