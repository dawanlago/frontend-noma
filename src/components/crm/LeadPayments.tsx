import { useState } from "react";
import Link from "next/link";
import { HiOutlineDocumentText, HiOutlinePaperClip } from "react-icons/hi2";
import CopyButton from "@/components/tools/CopyButton";
import { entryTotal } from "@/lib/finance/lateCharge";
import { resources } from "@/lib/resources";
import { uploadToCloudinary } from "@/lib/upload";
import type { FinanceEntry } from "@/types";
import { formatCurrencyBRL, formatDateOnly, todayISO } from "@/utils/format";

interface LeadPaymentsProps {
  entries: FinanceEntry[];
  onChange: (entries: FinanceEntry[]) => void;
  onLaunch: () => void;
}

/** Linha digitável e PDF do boleto de uma parcela. */
function BoletoEditor({ entry, onSaved, onClose }: { entry: FinanceEntry; onSaved: (entry: FinanceEntry) => void; onClose: () => void }) {
  const [code, setCode] = useState(entry.boletoCode || "");
  const [url, setUrl] = useState(entry.boletoUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function attach(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setUrl((await uploadToCloudinary(file, "arquivos", { fileName: file.name })).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const boletoCode = code.replace(/\s+/g, " ").trim();
      await resources.finance.updateEntry(entry._id, { boletoCode, boletoUrl: url });
      onSaved({ ...entry, boletoCode, boletoUrl: url });
      onClose();
    } catch {
      setError("Não foi possível salvar o boleto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-2 grid gap-2 rounded-lg bg-beige/60 p-3">
      <input className="input-search !py-1.5 text-xs" value={code} placeholder="Linha digitável do boleto" onChange={(e) => setCode(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="btn-secondary cursor-pointer !py-1.5">
          <HiOutlinePaperClip className="h-3.5 w-3.5" /> {url ? "Trocar PDF" : "Anexar PDF"}
          <input type="file" accept="application/pdf,image/*" className="hidden" disabled={busy} onChange={(e) => void attach(e.target.files?.[0])} />
        </label>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-tan hover:underline">
            Ver arquivo
          </a>
        ) : null}
        <span className="flex-1" />
        <button type="button" className="btn-ghost !py-1.5" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary !py-1.5" disabled={busy} onClick={() => void save()}>
          Salvar
        </button>
      </div>
      {error ? <p className="text-xs text-burgundy">{error}</p> : null}
    </div>
  );
}

/** Checklist de pagamento da venda: cada parcela lançada no financeiro, marcando o que já foi recebido. */
export default function LeadPayments({ entries, onChange, onLaunch }: LeadPaymentsProps) {
  const [busyId, setBusyId] = useState("");
  const [boletoId, setBoletoId] = useState("");
  const [error, setError] = useState("");
  const today = todayISO();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  // Recebido inclui juros/multa cobrados por atraso.
  const received = entries.filter((entry) => entry.status === "received").reduce((sum, entry) => sum + entryTotal(entry), 0);
  const percent = total ? Math.min(100, Math.round((received / total) * 100)) : 0;

  async function toggle(entry: FinanceEntry) {
    const status = entry.status === "received" ? "pending" : "received";
    setBusyId(entry._id);
    setError("");
    onChange(entries.map((item) => (item._id === entry._id ? { ...item, status } : item)));
    try {
      // O servidor calcula juros/multa ao receber: usa a versão salva.
      const saved = await resources.finance.updateEntry(entry._id, { status });
      onChange(entries.map((item) => (item._id === entry._id ? { ...item, ...saved } : item)));
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
        <span data-money className="font-semibold text-charcoal">{formatCurrencyBRL(received)} recebido</span>
        <span data-money className="text-xs text-charcoal/50">de {formatCurrencyBRL(total)}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.06]">
        <div className="h-full rounded-full bg-sage transition-[width] duration-500 ease-out-expo" style={{ width: `${percent}%` }} />
      </div>
      <ul className="divide-y divide-charcoal/5">
        {sorted.map((entry) => {
          const done = entry.status === "received";
          const overdue = !done && entry.date < today;
          // Recebida com atraso: juros cobrados; vencida em aberto: quanto daria hoje.
          const charge = done ? entry.lateCharge : entry.projectedLateCharge;
          return (
            <li key={entry._id}>
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[hsl(152,35%,40%)]"
                  checked={done}
                  disabled={busyId === entry._id}
                  aria-label={done ? "Marcar como pendente" : "Marcar como recebida"}
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
                  {entry.boletoCode || entry.boletoUrl ? (
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      {entry.boletoCode ? <CopyButton text={entry.boletoCode} label="Copiar código" className="font-semibold text-tan hover:underline" /> : null}
                      {entry.boletoUrl ? (
                        <a href={entry.boletoUrl} target="_blank" rel="noreferrer" className="font-semibold text-tan hover:underline">
                          Abrir boleto
                        </a>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span className="text-right">
                  <span data-money className="block text-sm tabular-nums text-charcoal">{formatCurrencyBRL(entry.value)}</span>
                  {charge ? (
                    <span data-money className="block text-[11px] tabular-nums text-burgundy" title={`${charge.days} dias de atraso`}>
                      {done ? "+" : "hoje +"} {formatCurrencyBRL(charge.total)} juros/multa
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="btn-ghost h-8 w-8"
                  aria-label="Boleto da parcela"
                  title="Boleto (código e PDF)"
                  onClick={() => setBoletoId(boletoId === entry._id ? "" : entry._id)}
                >
                  <HiOutlineDocumentText className="h-4 w-4" />
                </button>
              </div>
              {boletoId === entry._id ? (
                <BoletoEditor
                  entry={entry}
                  onClose={() => setBoletoId("")}
                  onSaved={(saved) => onChange(entries.map((item) => (item._id === saved._id ? saved : item)))}
                />
              ) : null}
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
