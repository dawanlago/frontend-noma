import { useState } from "react";
import Link from "next/link";
import { resources } from "@/lib/resources";
import type { FinanceEntry } from "@/types";
import { formatCurrencyBRL, formatDateOnly, todayISO } from "@/utils/format";

interface LeadPaymentsProps {
  entries: FinanceEntry[];
  onChange: (entries: FinanceEntry[]) => void;
  onLaunch: () => void;
}

/** Checklist de pagamento da venda: cada parcela lançada no financeiro, marcando o que já foi recebido. */
export default function LeadPayments({ entries, onChange, onLaunch }: LeadPaymentsProps) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const today = todayISO();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const received = entries.filter((entry) => entry.status === "received").reduce((sum, entry) => sum + entry.value, 0);
  const percent = total ? Math.round((received / total) * 100) : 0;

  async function toggle(entry: FinanceEntry) {
    const status = entry.status === "received" ? "pending" : "received";
    setBusyId(entry._id);
    setError("");
    onChange(entries.map((item) => (item._id === entry._id ? { ...item, status } : item)));
    try {
      await resources.finance.updateEntry(entry._id, { status });
    } catch {
      onChange(entries);
      setError("Não foi possível atualizar o pagamento.");
    } finally {
      setBusyId("");
    }
  }

  if (!entries.length) {
    return (
      <div>
        <p className="text-sm text-charcoal/55">Nada lançado no financeiro para esta venda ainda.</p>
        <button type="button" className="btn-secondary mt-3 !py-1.5" onClick={onLaunch}>
          Lançar no financeiro
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-charcoal">{formatCurrencyBRL(received)} recebido</span>
        <span className="text-xs text-charcoal/50">de {formatCurrencyBRL(total)}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.06]">
        <div className="h-full rounded-full bg-sage transition-[width] duration-500 ease-out-expo" style={{ width: `${percent}%` }} />
      </div>
      <ul className="divide-y divide-charcoal/5">
        {sorted.map((entry) => {
          const done = entry.status === "received";
          const overdue = !done && entry.date < today;
          return (
            <li key={entry._id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(152,35%,40%)]"
                  checked={done}
                  disabled={busyId === entry._id}
                  onChange={() => void toggle(entry)}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${done ? "text-charcoal/45 line-through" : "text-charcoal"}`}>
                    {entry.installment ? `Parcela ${entry.installment.number}/${entry.installment.total}` : entry.description}
                  </span>
                  <span className={`block text-xs ${overdue ? "font-semibold text-burgundy" : "text-charcoal/50"}`}>
                    {overdue ? "Venceu em " : ""}
                    {formatDateOnly(entry.date)}
                    {entry.payment ? ` · ${entry.payment}` : ""}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-charcoal">{formatCurrencyBRL(entry.value)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-2 text-xs text-burgundy">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
        <button type="button" className="text-tan hover:underline" onClick={onLaunch}>
          + Lançar valor adicional
        </button>
        <Link href="/financeiro" className="text-charcoal/50 hover:underline">
          Abrir financeiro
        </Link>
      </div>
    </div>
  );
}
