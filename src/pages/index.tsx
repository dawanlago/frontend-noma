import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineArrowRight, HiOutlineChartBar } from "react-icons/hi2";
import BirthdayCard from "@/components/base/BirthdayCard";
import { OrgBadge } from "@/components/layout/OrgSwitcher";
import TaskChecklist from "@/components/tasks/TaskChecklist";
import HideValuesToggle from "@/components/ui/HideValuesToggle";
import MetricCard from "@/components/ui/MetricCard";
import OwnerFilter from "@/components/tools/OwnerFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { moduleForPath } from "@/lib/modules";
import { resources } from "@/lib/resources";
import { TOOLS } from "@/lib/tools";
import type { Task } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";

/** Texto padrão de boas-vindas: no início limpo só aparece um texto que a produtora escreveu em Configurações. */
const DEFAULT_WELCOME_TEXT = "Ferramentas para administrar sua produtora audiovisual com mais clareza e profissionalismo.";

export default function HomePage() {
  const { user, can, switchOrg } = useAuth();
  const orgs = user?.orgs || [];
  const { settings } = useWorkspace();
  const [ownerId, setOwnerId] = useState("");
  const { data } = useAsyncData(() => resources.dashboard({ ownerId }), [ownerId]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const firstName = user?.name?.split(" ")[0] || "";
  const title = (settings?.welcomeTitle || "{nome}, tenha o controle do seu negócio para crescer a sua produtora.")
    .replace(/\{nome\}/gi, firstName || "Olá")
    .trim();
  const welcomeText = settings?.welcomeText && settings.welcomeText.trim() !== DEFAULT_WELCOME_TEXT ? settings.welcomeText.trim() : "";
  const tools = TOOLS.filter((tool) => {
    const moduleKey = moduleForPath(tool.href);
    return !moduleKey || can(moduleKey);
  });

  useEffect(() => {
    if (data) setTasks(data.tasks.preview);
  }, [data]);

  return (
    <>
      <Head>
        <title>Início | Noma</title>
      </Head>

      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{settings?.welcomeEyebrow || "Central Noma"}</p>
          <h1 className="mt-1 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-charcoal sm:text-3xl">
            {title.charAt(0).toUpperCase() + title.slice(1)}
          </h1>
          {welcomeText ? <p className="mt-1 max-w-xl text-sm text-charcoal/60">{welcomeText}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {can("crm") ? (
            <Link href="/crm?novo=1" className="btn-primary">
              Nova negociação <HiOutlineArrowRight />
            </Link>
          ) : null}
          {can("propostas") ? (
            <Link href="/propostas" className="btn-secondary">
              Propostas
            </Link>
          ) : null}
          {can("financeiro") ? (
            <Link href="/financeiro" className="btn-secondary">
              Financeiro
            </Link>
          ) : null}
        </div>
      </section>

      {orgs.length > 1 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-charcoal/50">Seus CRMs</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {orgs.map((item) => {
              const active = item._id === user?.orgId;
              return (
                <button
                  key={item._id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => !active && switchOrg(item._id)}
                  className={`card flex items-center gap-3 p-4 text-left transition ${active ? "ring-2 ring-tan/40" : "hover:-translate-y-0.5 hover:shadow-lift"}`}
                >
                  <OrgBadge org={item} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-charcoal">{item.name}</span>
                    <span className="block text-xs text-charcoal/50">{active ? "Aberto agora" : "Abrir este CRM"}</span>
                  </span>
                  {active ? null : <HiOutlineArrowRight className="h-4 w-4 text-charcoal/40" />}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Seu momento</h2>
        <div className="flex flex-wrap items-center gap-2">
          <HideValuesToggle />
          {can("crm") ? (
            <Link href="/crm" className="btn-secondary">
              <HiOutlineChartBar className="h-4 w-4" /> Métricas do CRM <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <OwnerFilter value={ownerId} onChange={setOwnerId} />
        </div>
      </div>
      <section className="noma-stagger mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("crm") ? (
          <Link href="/crm" className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-lift" title="Ver métricas no CRM">
            <MetricCard
              label="Potencial em aberto"
              value={formatCurrencyBRL(data?.openPipeline || 0)} money
              hint={`${data?.leadsCount || 0} negociações no CRM →`}
            />
          </Link>
        ) : (
          <MetricCard
            label="Potencial em aberto"
            value={formatCurrencyBRL(data?.openPipeline || 0)} money
            hint={`${data?.leadsCount || 0} negociações no CRM`}
          />
        )}
        {data?.finance !== null ? (
          <>
            <MetricCard
              label="Recebido no mês"
              value={formatCurrencyBRL(data?.finance?.monthReceived || 0)} money
              hint={`Resultado ${formatCurrencyBRL(data?.finance?.monthResult || 0)}`}
              tone="sage"
            />
            <MetricCard label="A receber no mês" value={formatCurrencyBRL(data?.finance?.monthPending || 0)} tone="gold" money />
          </>
        ) : (
          <>
            <MetricCard label="Vendas feitas" value={formatCurrencyBRL(data?.wonValue || 0)} tone="sage" money />
            <MetricCard
              label="Atividades pendentes"
              value={String(data?.tasks.pending || 0)}
              hint={data?.tasks.overdue ? `${data.tasks.overdue} atrasadas` : undefined}
              tone={data?.tasks.overdue ? "burgundy" : "default"}
            />
          </>
        )}
        <MetricCard
          label="Próximas ações vencendo"
          value={String(data?.leadsDueToday || 0)}
          hint="Negociações com ação para hoje ou atrasada"
          tone={data?.leadsDueToday ? "burgundy" : "default"}
        />
      </section>

      <section className="card mb-8 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Checklist de atividades</h2>
            <p className="text-sm text-charcoal/55">
              {data?.tasks.pending
                ? `${data.tasks.pending} pendente${data.tasks.pending > 1 ? "s" : ""}${data.tasks.overdue ? ` · ${data.tasks.overdue} atrasada${data.tasks.overdue > 1 ? "s" : ""}` : ""}`
                : "Tudo em dia."}
            </p>
          </div>
          {can("atividades") ? (
            <Link href="/atividades" className="text-sm font-semibold text-tan hover:underline">
              Ver todas →
            </Link>
          ) : null}
        </div>
        <TaskChecklist tasks={tasks} onChange={setTasks} showLead readOnly={!can("atividades")} emptyText="Nenhuma atividade pendente." />
      </section>

      <BirthdayCard birthdays={data?.birthdays || []} />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-charcoal/50">Atalhos</h2>
      <nav aria-label="Atalhos" className="mb-8 flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-surface px-4 py-2 text-sm font-medium text-charcoal transition hover:border-tan/40 hover:text-tan"
          >
            {tool.title}
            <HiOutlineArrowRight className="h-3.5 w-3.5 text-charcoal/30 transition group-hover:translate-x-0.5 group-hover:text-tan" />
          </Link>
        ))}
      </nav>
    </>
  );
}
