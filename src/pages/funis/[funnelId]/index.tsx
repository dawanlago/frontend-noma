import { DragEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ClosureModal from "@/components/deals/ClosureModal";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { DEAL_SOURCE_LABELS, TEMPERATURE_LABELS } from "@/lib/constants";
import { formatCurrencyBRL, getInitials } from "@/utils/format";
import type { Deal, DealSource } from "@/types";

const stagePalette = [
  { bar: "bg-tan", tint: "bg-tan/10" },
  { bar: "bg-gold", tint: "bg-gold/10" },
  { bar: "bg-sage", tint: "bg-sage/10" },
  { bar: "bg-burgundy", tint: "bg-burgundy/10" },
  { bar: "bg-[#4A6FA5]", tint: "bg-[#4A6FA5]/10" },
];

export default function FunnelKanbanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const funnelId = String(router.query.funnelId || "");
  const { data, isLoading, error, reload } = useAsyncData(
    () => (funnelId ? resources.funnels.kanban(funnelId) : Promise.resolve(null)),
    [funnelId],
  );
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [closure, setClosure] = useState<{ dealId: string; stageId: string; title: string } | null>(null);
  const [financeNotice, setFinanceNotice] = useState("");

  async function handleDrop(stageId: string) {
    if (!draggingDealId) return;
    const stage = data?.stages.find((item) => item._id === stageId);
    const deal = data?.stages.flatMap((item) => item.deals).find((item) => item._id === draggingDealId);
    if (stage?.type === "closure" && !(deal as Deal | undefined)?.closedTransactionId) {
      setClosure({ dealId: draggingDealId, stageId, title: deal?.title || "Negociação" });
      setDraggingDealId(null);
      return;
    }
    const result = await resources.deals.moveStage(draggingDealId, stageId);
    setFinanceNotice(
      isAdmin && result.meta?.financeRemoved
        ? result.meta.message || "O lançamento no financeiro foi removido."
        : "",
    );
    setDraggingDealId(null);
    await reload();
  }

  function onDragStart(event: DragEvent, dealId: string) {
    setDraggingDealId(dealId);
    event.dataTransfer.setData("text/plain", dealId);
  }

  return (
    <>
      <Head><title>Kanban | Noma CRM</title></Head>

      <PageHeader
        eyebrow="Pipeline"
        title={data?.funnel.name || "Quadro Kanban"}
        description={`Valor total em aberto: ${formatCurrencyBRL(data?.totalValue || 0)}`}
      />

      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}
      {financeNotice ? (
        <p className="mb-4 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-charcoal">
          {financeNotice}
        </p>
      ) : null}

      {isLoading && !data ? (
        <section className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2, 3].map((column) => (
            <div key={column} className="min-w-[280px] flex-1 rounded-[1.6rem] border border-charcoal/[0.05] bg-beige/40 p-3.5">
              <div className="mb-4 h-3 w-10 skeleton" />
              <div className="mb-4 h-6 w-32 skeleton" />
              <div className="space-y-2.5">
                <div className="h-28 rounded-2xl skeleton" />
                <div className="h-28 rounded-2xl skeleton" />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {data ? (
      <section className="flex gap-4 overflow-x-auto pb-4">
        {(data?.stages || []).map((stage, index) => {
          const palette = stagePalette[index % stagePalette.length];
          const isDropTarget = Boolean(draggingDealId);

          return (
            <div
              key={stage._id}
              className={`min-w-[280px] flex-1 rounded-[1.6rem] border border-charcoal/[0.05] bg-beige/40 p-3.5 transition ${
                isDropTarget ? "ring-2 ring-tan/25 bg-tan/[0.04]" : ""
              }`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(stage._id)}
            >
              <div className="mb-4 px-1">
                <div className={`mb-3 h-1 w-10 rounded-full ${palette.bar}`} />
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-charcoal">{stage.name}</h3>
                  <span className={`chip ${palette.tint} text-charcoal/70`}>{stage.deals.length}</span>
                </div>
                <p className="mt-1 text-xs text-charcoal/40">{formatCurrencyBRL(stage.totalValue)}</p>
              </div>

              <div className="min-h-[120px] space-y-2.5">
                {stage.deals.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-charcoal/10 px-3 py-8 text-center text-xs text-charcoal/35">
                    Arraste uma negociação
                  </p>
                ) : (
                  stage.deals.map((deal) => (
                    <KanbanCard
                      key={deal._id}
                      deal={deal as Deal & { contact?: { name: string }; company?: { name: string } }}
                      funnelId={funnelId}
                      onDragStart={onDragStart}
                      dragging={draggingDealId === deal._id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>
      ) : null}

      <ClosureModal
        open={Boolean(closure)}
        dealTitle={closure?.title}
        onClose={() => setClosure(null)}
        onConfirm={async (movementDate) => {
          if (!closure) return;
          await resources.deals.moveStage(closure.dealId, closure.stageId, {
            movementDate: new Date(`${movementDate}T12:00:00`).toISOString(),
          });
          await reload();
        }}
      />
    </>
  );
}

function KanbanCard({
  deal,
  funnelId,
  onDragStart,
  dragging,
}: {
  deal: Deal & { contact?: { name: string }; company?: { name: string } };
  funnelId: string;
  onDragStart: (event: DragEvent, dealId: string) => void;
  dragging: boolean;
}) {
  const temperatureClass =
    deal.temperature === "hot"
      ? "bg-gold/15 text-gold"
      : deal.temperature === "warm"
        ? "bg-tan/10 text-tan"
        : "bg-charcoal/5 text-charcoal/50";

  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, deal._id)}
      className={`cursor-grab rounded-2xl border border-charcoal/[0.05] bg-white p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-card active:cursor-grabbing ${
        dragging ? "scale-[0.98] opacity-50" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <Link href={`/funis/${funnelId}/negociacao/${deal._id}`} className="font-semibold text-charcoal hover:text-tan">
          {deal.title}
        </Link>
        <span className={`chip ${temperatureClass}`}>
          {TEMPERATURE_LABELS[deal.temperature]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-beige text-[10px] font-semibold text-tan">
          {getInitials(deal.contact?.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-charcoal/70">{deal.contact?.name || "Contato"}</p>
          <p className="truncate text-xs text-charcoal/40">{deal.company?.name || "Sem empresa"}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="mt-1 font-display text-lg font-semibold text-charcoal">{formatCurrencyBRL(deal.value)}</p>
        <span className="text-[11px] font-medium text-charcoal/40">
          {DEAL_SOURCE_LABELS[deal.source as DealSource] || deal.source}
        </span>
      </div>
    </article>
  );
}
