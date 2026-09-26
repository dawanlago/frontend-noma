import { useState, type DragEvent } from "react";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCheckCircle,
  HiOutlineEllipsisHorizontal,
} from "react-icons/hi2";
import { isLeadOverdue } from "@/lib/crm/metrics";
import { leadDateOnly, leadSubtitle } from "@/lib/crm/model";
import type { FunnelStage, Lead } from "@/types";
import { formatCurrencyBRL, formatDateOnly } from "@/utils/format";
import { TemperatureBadge } from "./Temperature";

interface LeadCardProps {
  lead: Lead;
  stages: FunnelStage[];
  today: string;
  showOwner: boolean;
  isDragging: boolean;
  /** Acabou de virar venda feita: toca o pulso de comemoração. */
  celebrating?: boolean;
  serviceLabel: string;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onMove: (lead: Lead, stageId: string) => void;
  onWon: (lead: Lead) => void;
  onDragStart: (event: DragEvent<HTMLElement>, lead: Lead) => void;
  onDragEnd: () => void;
}

export default function LeadCard({
  lead,
  stages,
  today,
  showOwner,
  isDragging,
  celebrating,
  serviceLabel,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  onWon,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const date = leadDateOnly(lead);
  const overdue = isLeadOverdue(lead, today);
  const subtitle = leadSubtitle(lead);

  function close() {
    setAnchor(null);
  }

  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead)}
      className={`group cursor-pointer rounded-lg border bg-white p-3.5 transition duration-150 hover:border-charcoal/20 hover:shadow-soft active:cursor-grabbing ${
        lead.status === "won" ? "border-sage/40" : lead.status === "lost" ? "border-burgundy/20 opacity-70" : "border-charcoal/[0.08]"
      } ${isDragging ? "opacity-40" : ""} ${celebrating ? "noma-won" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-charcoal">{lead.name}</h3>
          <p className="truncate text-xs text-charcoal/55">{subtitle || "Sem contato vinculado"}</p>
        </div>
        <button
          type="button"
          aria-label="Ações da negociação"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-charcoal/40 transition hover:bg-beige hover:text-charcoal"
          onClick={(event) => {
            event.stopPropagation();
            setAnchor(event.currentTarget);
          }}
        >
          <HiOutlineEllipsisHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TemperatureBadge value={lead.temperature} />
        {serviceLabel ? <span className="chip bg-tan/10 text-tan">{serviceLabel}</span> : null}
        {showOwner && lead.ownerName ? <span className="chip bg-charcoal/[0.06] text-charcoal/60">{lead.ownerName}</span> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-charcoal">{formatCurrencyBRL(lead.value || 0)}</span>
        <div className="flex items-center gap-2 text-xs text-charcoal/50">
          {lead.commentsCount ? (
            <span className="inline-flex items-center gap-0.5" title="Pareceres">
              <HiOutlineChatBubbleLeftEllipsis className="h-3.5 w-3.5" /> {lead.commentsCount}
            </span>
          ) : null}
          {date ? (
            <span
              className={`inline-flex items-center gap-1 font-medium ${overdue ? "text-burgundy" : ""}`}
              title={overdue ? "Próxima ação vencida" : "Próxima ação"}
            >
              <HiOutlineCalendarDays className="h-3.5 w-3.5" />
              {formatDateOnly(date).slice(0, 5)}
            </span>
          ) : null}
        </div>
      </div>

      {lead.status === "open" ? (
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-sage/30 py-1.5 text-xs font-semibold text-sage opacity-0 transition hover:bg-sage/10 group-hover:opacity-100 focus:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onWon(lead);
          }}
        >
          <HiOutlineCheckCircle className="h-4 w-4" /> Venda feita
        </button>
      ) : null}

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(event) => event.stopPropagation()}>
        <MenuItem
          onClick={() => {
            close();
            onOpen(lead);
          }}
        >
          Abrir negociação
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onEdit(lead);
          }}
        >
          Editar
        </MenuItem>
        {lead.status === "open" ? (
          <MenuItem
            sx={{ color: "success.main" }}
            onClick={() => {
              close();
              onWon(lead);
            }}
          >
            Venda feita
          </MenuItem>
        ) : null}
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
        {stages
          .filter((stage) => stage._id !== lead.stageId)
          .map((stage) => (
            <MenuItem
              key={stage._id}
              dense
              onClick={() => {
                close();
                onMove(lead, stage._id);
              }}
            >
              {stage.name}
            </MenuItem>
          ))}
      </Menu>
    </article>
  );
}
