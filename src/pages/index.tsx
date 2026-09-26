import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineArrowRight, HiOutlineChartBar } from "react-icons/hi2";
import BirthdayCard from "@/components/base/BirthdayCard";
import TaskChecklist from "@/components/tasks/TaskChecklist";
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

const pillars = [
  { area: "Comercial", title: "Venda melhor", text: "Prospecção, propostas e follow-up no mesmo processo." },
  { area: "Precificação", title: "Cobre melhor", text: "Entenda seus custos e chegue a um valor mais seguro." },
  { area: "Operação", title: "Formalize melhor", text: "Briefing e contrato para reduzir ruído com o cliente." },
  { area: "Gestão", title: "Entenda seu dinheiro", text: "Acompanhe entradas, despesas e valores a receber." },
];

const startHere = [
  { question: "Encontrou um possível cliente?", action: "Comece pela prospecção e abra a conversa.", href: "/prospeccao" },
  { question: "Chegou uma oportunidade?", action: "Calcule o preço antes de apresentar a proposta.", href: "/orcamento" },
  { question: "O cliente aprovou?", action: "Formalize o trabalho com o contrato adequado.", href: "/contratos" },
];

export default function HomePage() {
  const { user, can } = useAuth();
  const { settings } = useWorkspace();
  const [ownerId, setOwnerId] = useState("");
  const { data } = useAsyncData(() => resources.dashboard({ ownerId }), [ownerId]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const firstName = user?.name?.split(" ")[0] || "";
  const title = (settings?.welcomeTitle || "{nome}, tenha o controle do seu negócio para crescer a sua produtora.")
    .replace(/\{nome\}/gi, firstName || "Olá")
    .trim();
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

      <section className="card mb-6 overflow-hidden bg-mesh p-6 sm:p-10">
        <p className="eyebrow">{settings?.welcomeEyebrow || "Central Noma"}</p>
        <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </h1>
        <p className="mt-3 max-w-xl text-charcoal/60">
          {settings?.welcomeText || "Ferramentas para administrar sua produtora audiovisual com mais clareza e profissionalismo."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {can("crm") ? (
            <Link href="/crm?novo=1" className="btn-primary">
              Nova venda <HiOutlineArrowRight />
            </Link>
          ) : null}
          {can("propostas") ? (
            <Link href="/propostas" className="btn-secondary">
              Gerador de Propostas
            </Link>
          ) : null}
          {can("financeiro") ? (
            <Link href="/financeiro" className="btn-secondary">
              Abrir Financeiro
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Seu momento</h2>
        <div className="flex flex-wrap items-center gap-2">
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
              value={formatCurrencyBRL(data?.openPipeline || 0)}
              hint={`${data?.leadsCount || 0} negociações no CRM →`}
            />
          </Link>
        ) : (
          <MetricCard
            label="Potencial em aberto"
            value={formatCurrencyBRL(data?.openPipeline || 0)}
            hint={`${data?.leadsCount || 0} negociações no CRM`}
          />
        )}
        {data?.finance !== null ? (
          <>
            <MetricCard
              label="Recebido no mês"
              value={formatCurrencyBRL(data?.finance?.monthReceived || 0)}
              hint={`Resultado ${formatCurrencyBRL(data?.finance?.monthResult || 0)}`}
              tone="sage"
            />
            <MetricCard label="A receber no mês" value={formatCurrencyBRL(data?.finance?.monthPending || 0)} tone="gold" />
          </>
        ) : (
          <>
            <MetricCard label="Vendas feitas" value={formatCurrencyBRL(data?.wonValue || 0)} tone="sage" />
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

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map((pillar) => (
          <div key={pillar.area} className="card-muted p-5">
            <p className="eyebrow">{pillar.area}</p>
            <h3 className="mt-2 font-semibold text-charcoal">{pillar.title}</h3>
            <p className="mt-1 text-sm text-charcoal/60">{pillar.text}</p>
          </div>
        ))}
      </section>

      <h2 className="text-lg font-semibold text-charcoal">Ferramentas da Noma</h2>
      <p className="mb-4 text-sm text-charcoal/55">Tudo o que você precisa para organizar a rotina comercial e operacional.</p>
      <section className="noma-stagger mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool, index) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="card group flex flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} / {tool.area}
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-charcoal">{tool.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-charcoal/55">{tool.description}</p>
            <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tan">
              Abrir ferramenta
              <HiOutlineArrowRight className="h-4 w-4 transition duration-300 ease-out-expo group-hover:translate-x-1" />
            </p>
          </Link>
        ))}
      </section>

      <h2 className="mb-4 text-lg font-semibold text-charcoal">Comece por aqui</h2>
      <section className="grid gap-4 md:grid-cols-3">
        {startHere.map((item, index) => (
          <Link key={item.href} href={item.href} className="card group p-5 transition hover:shadow-lift">
            <span className="text-3xl font-semibold text-tan/30">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 font-semibold text-charcoal">{item.question}</h3>
            <p className="mt-1 text-sm text-charcoal/60">{item.action}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
