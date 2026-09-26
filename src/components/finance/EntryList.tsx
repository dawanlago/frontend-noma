import {
  HiOutlineArrowDownRight,
  HiOutlineArrowPath,
  HiOutlineArrowUpRight,
  HiOutlineCheck,
  HiOutlineChartPie,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";
import { ENTRY_FILTERS, type EntryFilter } from "@/lib/finance/metrics";
import { ENTRY_STATUS_LABELS, entryStatusKind, isEntryOpen, type EntryStatusKind } from "@/lib/finance/model";
import type { FinanceEntry } from "@/types";
import { formatCurrencyBRL, formatDateOnly } from "@/utils/format";

const statusTone: Record<EntryStatusKind, string> = {
  received: "bg-sage/15 text-sage",
  paid: "bg-charcoal/[0.06] text-charcoal/65",
  pending: "bg-gold/10 text-gold",
  planned: "bg-tan/10 text-tan",
  overdue: "bg-burgundy/10 text-burgundy",
};

interface EntryListProps {
  entries: FinanceEntry[];
  counts: Record<EntryFilter, number>;
  filter: EntryFilter;
  onFilterChange: (filter: EntryFilter) => void;
  today: string;
  isLoading: boolean;
  showOwner: boolean;
  /** Mostra o caixa de cada movimentação (na aba "Todos"). */
  showCashbox?: boolean;
  busyId: string | null;
  onSettle: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (entry: FinanceEntry) => void;
  /** Distribuir uma entrada recebida nas caixas de distribuição. */
  onDistribute?: (entry: FinanceEntry) => void;
}

export default function EntryList({
  entries,
  counts,
  filter,
  onFilterChange,
  today,
  isLoading,
  showOwner,
  showCashbox = false,
  busyId,
  onSettle,
  onEdit,
  onDelete,
  onDistribute,
}: EntryListProps) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-charcoal/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-charcoal">Movimentações do mês</h2>
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="inline-flex min-w-max gap-1 rounded-lg bg-beige p-1">
            {ENTRY_FILTERS.map((item) => {
              const active = item.value === filter;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilterChange(item.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-charcoal/40">{counts[item.value]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-14" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-semibold text-charcoal">Nenhuma movimentação por aqui</p>
          <p className="mt-1 text-sm text-charcoal/55">
            {filter === "all"
              ? "Registre a primeira entrada ou despesa deste mês."
              : "Nada nesse filtro para o mês selecionado."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-charcoal/[0.06]">
          {entries.map((entry) => {
            const isIncome = entry.type === "income";
            const kind = entryStatusKind(entry, today);
            const open = isEntryOpen(entry);
            const meta = [isIncome ? entry.client || entry.category : entry.category, formatDateOnly(entry.date), entry.payment, entry.bank]
              .filter(Boolean)
              .join(" • ");
            return (
              <li key={entry._id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-beige/60 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isIncome ? "bg-sage/15 text-sage" : "bg-burgundy/10 text-burgundy"
                    }`}
                    aria-hidden
                  >
                    {isIncome ? <HiOutlineArrowUpRight className="h-4 w-4" /> : <HiOutlineArrowDownRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">{entry.description}</p>
                    <p className="truncate text-xs text-charcoal/55">{meta}</p>
                    {entry.notes ? (
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs italic text-charcoal/45" title={entry.notes}>
                        {entry.notes}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`chip ${statusTone[kind]}`}>{ENTRY_STATUS_LABELS[kind]}</span>
                      {entry.installment ? (
                        <span className="chip bg-charcoal/[0.06] text-charcoal/60">
                          Parcela {entry.installment.number}/{entry.installment.total}
                        </span>
                      ) : null}
                      {showCashbox && entry.cashbox ? (
                        <span className="chip bg-gold/10 text-gold">{entry.cashbox}</span>
                      ) : null}
                      {entry.distributed ? (
                        <span className="chip bg-sage/10 text-sage">
                          <HiOutlineChartPie className="h-3 w-3" /> Distribuída
                        </span>
                      ) : null}
                      {entry.recurringId ? (
                        <span className="chip bg-tan/10 text-tan">
                          <HiOutlineArrowPath className="h-3 w-3" /> Recorrente
                        </span>
                      ) : null}
                      {showOwner && entry.ownerName ? (
                        <span className="chip bg-charcoal/[0.06] text-charcoal/60">{entry.ownerName}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
                  <span
                    className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
                      isIncome ? "text-charcoal" : "text-burgundy"
                    }`}
                  >
                    {isIncome ? "" : "- "}
                    {formatCurrencyBRL(entry.value)}
                  </span>
                  <div className="flex items-center gap-1">
                    {open ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-charcoal/10 px-2.5 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-surface disabled:opacity-50"
                        disabled={busyId === entry._id}
                        onClick={() => onSettle(entry)}
                      >
                        <HiOutlineCheck className="h-3.5 w-3.5" />
                        {isIncome ? "Marcar como recebido" : "Marcar como pago"}
                      </button>
                    ) : null}
                    {onDistribute && isIncome && kind === "received" && !entry.distributed ? (
                      <button
                        type="button"
                        className="btn-ghost h-8 w-8"
                        aria-label="Distribuir nas caixas"
                        title="Distribuir nas caixas"
                        onClick={() => onDistribute(entry)}
                      >
                        <HiOutlineChartPie className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button type="button" className="btn-ghost h-8 w-8" aria-label="Editar" title="Editar" onClick={() => onEdit(entry)}>
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-8 w-8 hover:text-burgundy"
                      aria-label="Excluir"
                      title="Excluir"
                      onClick={() => onDelete(entry)}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
