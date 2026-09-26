import { useState, type DragEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { groupByStage } from "@/lib/crm/metrics";
import type { Funnel, Lead } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";
import LeadCard from "./LeadCard";

interface PipelineBoardProps {
  funnel: Funnel;
  leads: Lead[];
  today: string;
  showOwner: boolean;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onMove: (lead: Lead, stageId: string) => void;
  onSubStage: (lead: Lead, subStageId: string) => void;
  onWon: (lead: Lead) => void;
  /** Negociação que acabou de virar venda feita. */
  celebrateId?: string | null;
}

const DRAG_TYPE = "text/plain";

const headerTone = { open: "text-charcoal/50", won: "text-sage", lost: "text-burgundy" };

export default function PipelineBoard({
  funnel,
  leads,
  today,
  showOwner,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  onSubStage,
  onWon,
  celebrateId,
}: PipelineBoardProps) {
  const { labelOf } = useWorkspace();
  const columns = groupByStage(leads, funnel);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, lead: Lead) {
    event.dataTransfer.setData(DRAG_TYPE, lead._id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(lead._id);
  }

  function reset() {
    setDraggingId(null);
    setOverStage(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, stageId: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || draggingId;
    const lead = leads.find((item) => item._id === id);
    reset();
    if (lead && lead.stageId !== stageId) onMove(lead, stageId);
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      <div className="noma-stagger flex min-w-full gap-3">
        {columns.map((column) => {
          const isOver = overStage === column.stage._id && draggingId !== null;
          return (
            <section
              key={column.stage._id}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overStage !== column.stage._id) setOverStage(column.stage._id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverStage(null);
              }}
              onDrop={(event) => handleDrop(event, column.stage._id)}
              className={`flex min-h-[calc(100vh-240px)] w-[300px] min-w-[300px] flex-1 flex-col rounded-2xl border p-3 transition duration-150 ${
                isOver ? "border-tan bg-tan/[0.05] ring-2 ring-tan/15" : "border-charcoal/[0.06] bg-beige"
              }`}
            >
              <header className="mb-3 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-charcoal">{column.stage.name}</h3>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-charcoal/60">{column.leads.length}</span>
                </div>
                <p data-money className={`mt-0.5 text-sm font-medium ${headerTone[column.stage.kind]}`}>{formatCurrencyBRL(column.total)}</p>
              </header>
              <div className="flex min-h-[140px] flex-1 flex-col gap-2.5">
                {column.leads.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    stages={funnel.stages}
                    today={today}
                    showOwner={showOwner}
                    serviceLabel={lead.service ? labelOf("leadService", lead.service) : ""}
                    isDragging={draggingId === lead._id}
                    celebrating={celebrateId === lead._id}
                    onOpen={onOpen}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                    onSubStage={onSubStage}
                    onWon={onWon}
                    onDragStart={handleDragStart}
                    onDragEnd={reset}
                  />
                ))}
                {column.leads.length === 0 ? (
                  <div
                    className={`flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-6 text-center text-xs ${
                      isOver ? "border-tan/50 text-tan" : "border-charcoal/15 text-charcoal/40"
                    }`}
                  >
                    Arraste uma negociação para cá
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
