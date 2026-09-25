import { useState, type DragEvent } from "react";
import { groupByStage } from "@/lib/crm/metrics";
import type { Lead, LeadStage } from "@/types";
import { formatCurrencyBRL } from "@/utils/format";
import LeadCard from "./LeadCard";

interface PipelineBoardProps {
  leads: Lead[];
  today: string;
  showOwner: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onMove: (lead: Lead, stage: LeadStage) => void;
}

const DRAG_TYPE = "text/plain";

export default function PipelineBoard({ leads, today, showOwner, onEdit, onDelete, onMove }: PipelineBoardProps) {
  const columns = groupByStage(leads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, lead: Lead) {
    event.dataTransfer.setData(DRAG_TYPE, lead._id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(lead._id);
  }

  function reset() {
    setDraggingId(null);
    setOverStage(null);
  }

  function handleDrop(event: DragEvent<HTMLElement>, stage: LeadStage) {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || draggingId;
    const lead = leads.find((item) => item._id === id);
    reset();
    if (lead && lead.stage !== stage) onMove(lead, stage);
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {columns.map((column) => {
          const isOver = overStage === column.stage && draggingId !== null;
          return (
            <section
              key={column.stage}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overStage !== column.stage) setOverStage(column.stage);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverStage(null);
              }}
              onDrop={(event) => handleDrop(event, column.stage)}
              className={`flex w-[272px] shrink-0 flex-col rounded-xl border p-3 transition duration-150 ${
                isOver ? "border-tan bg-tan/[0.05] ring-2 ring-tan/15" : "border-charcoal/[0.06] bg-beige"
              }`}
            >
              <header className="mb-3 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-charcoal">{column.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-charcoal/60">
                    {column.leads.length}
                  </span>
                </div>
                <p className={`mt-0.5 text-xs font-medium ${column.stage === "won" ? "text-sage" : "text-charcoal/50"}`}>
                  {formatCurrencyBRL(column.total)}
                </p>
              </header>
              <div className="flex min-h-[140px] flex-1 flex-col gap-2.5">
                {column.leads.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    today={today}
                    showOwner={showOwner}
                    isDragging={draggingId === lead._id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
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
                    Arraste um lead para cá
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
