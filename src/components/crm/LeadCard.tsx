import { useState, type DragEvent } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import { HiOutlineCalendarDays, HiOutlineEllipsisHorizontal } from "react-icons/hi2";
import { LEAD_STAGES } from "@/lib/constants";
import { isLeadOverdue } from "@/lib/crm/metrics";
import { leadDateOnly } from "@/lib/crm/model";
import type { Lead, LeadStage } from "@/types";
import { formatCurrencyBRL, formatDateOnly } from "@/utils/format";

interface LeadCardProps {
  lead: Lead;
  today: string;
  showOwner: boolean;
  isDragging: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onMove: (lead: Lead, stage: LeadStage) => void;
  onDragStart: (event: DragEvent<HTMLElement>, lead: Lead) => void;
  onDragEnd: () => void;
}

export default function LeadCard({
  lead,
  today,
  showOwner,
  isDragging,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const date = leadDateOnly(lead);
  const overdue = isLeadOverdue(lead, today);

  function close() {
    setAnchor(null);
  }

  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, lead)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onEdit(lead)}
      className={`group cursor-grab rounded-lg border border-charcoal/[0.08] bg-white p-3.5 transition duration-150 hover:border-charcoal/20 hover:shadow-soft active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-charcoal">{lead.name}</h3>
          <p className="truncate text-xs text-charcoal/55">{lead.company || "Sem empresa"}</p>
        </div>
        <button
          type="button"
          aria-label="Ações do lead"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-charcoal/40 transition hover:bg-beige hover:text-charcoal"
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <HiOutlineEllipsisHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="chip bg-tan/10 text-tan">{lead.service}</span>
        {showOwner && lead.ownerName ? (
          <span className="chip bg-charcoal/[0.06] text-charcoal/60">{lead.ownerName}</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-charcoal">{formatCurrencyBRL(lead.value || 0)}</span>
        {date ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              overdue ? "text-burgundy" : "text-charcoal/50"
            }`}
            title={overdue ? "Próxima ação vencida" : "Próxima ação"}
          >
            <HiOutlineCalendarDays className="h-3.5 w-3.5" />
            Próx. {formatDateOnly(date).slice(0, 5)}
          </span>
        ) : null}
      </div>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            onEdit(lead);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            close();
            onDelete(lead);
          }}
        >
          Excluir
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: "32px", fontSize: 12 }}>Mover para</ListSubheader>
        {LEAD_STAGES.filter((stage) => stage.value !== lead.stage).map((stage) => (
          <MenuItem
            key={stage.value}
            dense
            onClick={() => {
              close();
              onMove(lead, stage.value);
            }}
          >
            {stage.label}
          </MenuItem>
        ))}
      </Menu>
    </article>
  );
}
