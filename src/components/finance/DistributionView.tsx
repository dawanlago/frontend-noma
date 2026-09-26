import { useMemo, useState } from "react";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import MoneyInput from "@/components/ui/MoneyInput";
import Modal from "@/components/ui/Modal";
import { confirmDialog } from "@/components/ui/DialogHost";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { BucketMovement, DistributionBucket, FinanceEntry } from "@/types";
import { formatCurrencyBRL, formatDateOnly, maskCurrencyBRL, parseCurrencyBRL, todayISO } from "@/utils/format";

const COLORS = ["#3B82F6", "#F59E0B", "#22C55E", "#A855F7", "#EF4444", "#14B8A6", "#EC4899", "#64748B"];

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Divide o total pelas porcentagens; a última caixa fica com a sobra dos centavos. */
export function splitByPercent(total: number, buckets: DistributionBucket[]) {
  let allocated = 0;
  return buckets.map((bucket, index) => {
    const value = index === buckets.length - 1 ? round(total - allocated) : round((total * bucket.percentage) / 100);
    allocated = round(allocated + value);
    return value;
  });
}

interface DistributionViewProps {
  year: string;
  ownerId: string;
  cashbox: string;
  /** Distribuição aberta a partir de uma entrada da lista do mês. */
  pending: FinanceEntry | null;
  onPendingDone: () => void;
}

/** Aba "Distribuição": caixas com porcentagem e saldo, lançamento manual e retiradas. */
export default function DistributionView({ year, ownerId, cashbox, pending, onPendingDone }: DistributionViewProps) {
  const { data, isLoading, error, reload } = useAsyncData(
    () => resources.finance.distribution({ year, ownerId, cashbox }),
    [year, ownerId, cashbox],
  );
  const [configOpen, setConfigOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [withdrawFrom, setWithdrawFrom] = useState<DistributionBucket | null>(null);
  const buckets = useMemo(() => data?.buckets || [], [data]);
  const totalBalance = buckets.reduce((sum, bucket) => sum + (bucket.balance || 0), 0);

  // Movimentos agrupados: cada distribuição vira uma linha com as partes de cada caixa.
  const rows = useMemo(() => {
    const groups = new Map<string, BucketMovement[]>();
    for (const movement of data?.movements || []) {
      const key = movement.groupId || movement._id;
      groups.set(key, [...(groups.get(key) || []), movement]);
    }
    return [...groups.values()];
  }, [data]);

  async function removeRow(items: BucketMovement[]) {
    const first = items[0];
    const isDistribution = first.kind === "in";
    const ok = await confirmDialog({
      title: isDistribution ? "Excluir esta distribuição?" : "Excluir esta retirada?",
      message: isDistribution ? "O valor sai do saldo de todas as caixas desta distribuição." : "O valor volta para o saldo da caixa.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    await resources.finance.removeMovement(first._id);
    await reload();
  }

  const showDistribute = distributeOpen || Boolean(pending);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Caixas de distribuição</h2>
          <p className="text-sm text-charcoal/55">
            Separe cada valor recebido pelas porcentagens de cada caixa. Saldo total:{" "}
            <strong data-money className="text-charcoal">
              {formatCurrencyBRL(totalBalance)}
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setConfigOpen(true)}>
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" /> Configurar caixas e %
          </button>
          <button type="button" className="btn-primary" onClick={() => setDistributeOpen(true)} disabled={!buckets.length}>
            <HiOutlinePlus className="h-4 w-4" /> Distribuir valor
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p> : null}

      <section className="noma-stagger mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && !data
          ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-36" />)
          : buckets.map((bucket) => (
              <article key={bucket._id} className="card flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-charcoal">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color || COLORS[0] }} />
                    <span className="truncate">{bucket.name}</span>
                  </span>
                  <span className="chip bg-charcoal/[0.06] text-charcoal/65">{bucket.percentage}%</span>
                </div>
                <p data-money className="mt-3 text-2xl font-semibold tabular-nums text-charcoal">
                  {formatCurrencyBRL(bucket.balance || 0)}
                </p>
                <p className="mt-1 text-xs text-charcoal/50">
                  <span data-money>{formatCurrencyBRL(bucket.received || 0)}</span> distribuído ·{" "}
                  <span data-money>{formatCurrencyBRL(bucket.withdrawn || 0)}</span> retirado
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-tan hover:underline"
                  onClick={() => setWithdrawFrom(bucket)}
                >
                  <HiOutlineArrowUpTray className="h-3.5 w-3.5" /> Registrar retirada
                </button>
              </article>
            ))}
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-charcoal/[0.06] px-5 py-4">
          <h3 className="text-base font-semibold text-charcoal">Histórico de {year}</h3>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-charcoal/50">Nenhuma distribuição ou retirada neste ano.</p>
        ) : (
          <ul className="divide-y divide-charcoal/[0.06]">
            {rows.map((items) => {
              const first = items[0];
              const total = items.reduce((sum, item) => sum + item.value, 0);
              const isIn = first.kind === "in";
              return (
                <li key={first.groupId || first._id} className="group flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isIn ? "bg-sage/10 text-sage" : "bg-burgundy/10 text-burgundy"}`}
                  >
                    {isIn ? <HiOutlineArrowDownTray className="h-4 w-4" /> : <HiOutlineArrowUpTray className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">
                      {first.description || (isIn ? "Distribuição" : `Retirada · ${first.bucketName}`)}
                    </p>
                    <p className="flex flex-wrap gap-x-3 text-xs text-charcoal/50">
                      <span>{formatDateOnly(first.date)}</span>
                      {first.cashbox ? <span>Caixa {first.cashbox}</span> : null}
                      {isIn
                        ? items.map((item) => (
                            <span key={item._id}>
                              {item.bucketName}: <span data-money>{formatCurrencyBRL(item.value)}</span>
                            </span>
                          ))
                        : <span>{first.bucketName}</span>}
                    </p>
                  </div>
                  <span data-money className={`text-sm font-semibold tabular-nums ${isIn ? "text-charcoal" : "text-burgundy"}`}>
                    {isIn ? "" : "- "}
                    {formatCurrencyBRL(total)}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 opacity-0 transition hover:text-burgundy group-hover:opacity-100 focus:opacity-100"
                    aria-label="Excluir"
                    onClick={() => void removeRow(items)}
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BucketsModal
        open={configOpen}
        buckets={buckets}
        onClose={() => setConfigOpen(false)}
        onSaved={() => {
          setConfigOpen(false);
          void reload();
        }}
      />
      <DistributeModal
        open={showDistribute}
        buckets={buckets}
        cashbox={pending?.cashbox ?? cashbox}
        entry={pending}
        onClose={() => {
          setDistributeOpen(false);
          onPendingDone();
        }}
        onSaved={() => {
          setDistributeOpen(false);
          onPendingDone();
          void reload();
        }}
      />
      <WithdrawModal
        bucket={withdrawFrom}
        cashbox={cashbox}
        onClose={() => setWithdrawFrom(null)}
        onSaved={() => {
          setWithdrawFrom(null);
          void reload();
        }}
      />
    </div>
  );
}

interface BucketDraft {
  _id?: string;
  name: string;
  percentage: string;
  color: string;
}

function BucketsModal({
  open,
  buckets,
  onClose,
  onSaved,
}: {
  open: boolean;
  buckets: DistributionBucket[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<BucketDraft[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  // Recarrega o rascunho sempre que o modal abre.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDrafts(buckets.map((bucket) => ({ _id: bucket._id, name: bucket.name, percentage: String(bucket.percentage), color: bucket.color })));
      setError("");
    }
  }
  const total = round(drafts.reduce((sum, item) => sum + (Number(item.percentage.replace(",", ".")) || 0), 0));

  function patch(index: number, change: Partial<BucketDraft>) {
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await resources.finance.saveBuckets(
        drafts.map((item) => ({ _id: item._id, name: item.name, percentage: Number(item.percentage.replace(",", ".")) || 0, color: item.color })),
      );
      onSaved();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar as caixas."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Caixas de distribuição"
      description="Defina as caixas e a porcentagem de cada uma. A soma precisa dar 100%."
      onClose={onClose}
      footer={
        <>
          <span className={`mr-auto text-sm font-semibold ${total === 100 ? "text-sage" : "text-burgundy"}`}>Soma: {total}%</span>
          <button type="button" className="btn-primary" disabled={busy || total !== 100} onClick={() => void save()}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <ul className="grid gap-2">
        {drafts.map((item, index) => (
          <li key={item._id || index} className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Cor"
              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-charcoal/10 bg-surface p-1"
              value={item.color || COLORS[index % COLORS.length]}
              onChange={(event) => patch(index, { color: event.target.value })}
            />
            <input
              className="input-search flex-1"
              value={item.name}
              placeholder="Nome da caixa"
              onChange={(event) => patch(index, { name: event.target.value })}
            />
            <label className="relative w-24 shrink-0">
              <input
                className="input-search pr-7 text-right"
                inputMode="decimal"
                value={item.percentage}
                aria-label={`Porcentagem de ${item.name || "caixa"}`}
                onChange={(event) => patch(index, { percentage: event.target.value.replace(/[^\d.,]/g, "") })}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/45">%</span>
            </label>
            <button
              type="button"
              className="btn-ghost h-9 w-9 shrink-0 hover:text-burgundy"
              aria-label="Remover caixa"
              onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
            >
              <HiOutlineTrash className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-tan hover:underline"
        onClick={() => setDrafts((current) => [...current, { name: "", percentage: "0", color: COLORS[current.length % COLORS.length] }])}
      >
        <HiOutlinePlus className="h-4 w-4" /> Adicionar caixa
      </button>
      <p className="mt-3 text-xs text-charcoal/50">Remover uma caixa não apaga o histórico dela; o saldo só deixa de aparecer.</p>
      {error ? <p className="mt-3 text-sm text-burgundy">{error}</p> : null}
    </Modal>
  );
}

function DistributeModal({
  open,
  buckets,
  cashbox,
  entry,
  onClose,
  onSaved,
}: {
  open: boolean;
  buckets: DistributionBucket[];
  cashbox: string;
  entry: FinanceEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState("");

  function fill(amount: number) {
    setValues(splitByPercent(amount, buckets).map((value) => maskCurrencyBRL(value)));
  }

  // Ao abrir (ou trocar a entrada de origem), recomeça o formulário.
  const key = open ? `${entry?._id || "manual"}` : "";
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      const amount = entry?.value || 0;
      setTotal(amount ? maskCurrencyBRL(amount) : "");
      setDate(entry?.date || todayISO());
      setDescription(entry ? `${entry.description}${entry.client ? ` · ${entry.client}` : ""}` : "");
      fill(amount);
      setError("");
    }
  }

  const totalValue = parseCurrencyBRL(total);
  const sum = round(values.reduce((acc, value) => acc + parseCurrencyBRL(value), 0));
  const mismatch = totalValue > 0 && sum !== round(totalValue);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await resources.finance.distribute({
        date,
        description: description.trim(),
        cashbox,
        entryId: entry?._id,
        items: buckets.map((bucket, index) => ({
          bucketId: bucket._id,
          value: parseCurrencyBRL(values[index] || ""),
          percentage: bucket.percentage,
        })),
      });
      onSaved();
    } catch (err) {
      setError(apiError(err, "Não foi possível distribuir o valor."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Distribuir valor"
      description="Os valores de cada caixa são sugeridos pelas porcentagens; ajuste à mão se precisar."
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary" disabled={busy || sum <= 0} onClick={() => void save()}>
          {busy ? "Distribuindo..." : "Distribuir"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-charcoal">
          Valor a distribuir
          <MoneyInput
            value={total}
            onChange={(next) => {
              setTotal(next);
              fill(parseCurrencyBRL(next));
            }}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-charcoal">
          Data
          <input className="input-search" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-charcoal sm:col-span-2">
          Descrição
          <input
            className="input-search"
            value={description}
            placeholder="Ex.: Pagamento Casamento Carlos"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>
      <ul className="mt-5 divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
        {buckets.map((bucket, index) => (
          <li key={bucket._id} className="flex items-center gap-3 px-3 py-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color || COLORS[0] }} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal">{bucket.name}</span>
            <span className="text-xs text-charcoal/45">{bucket.percentage}%</span>
            <div className="w-40">
              <MoneyInput
                value={values[index] || ""}
                onChange={(next) => setValues((current) => current.map((value, i) => (i === index ? next : value)))}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className={`mt-2 text-right text-sm ${mismatch ? "font-semibold text-burgundy" : "text-charcoal/55"}`}>
        Soma das caixas: {formatCurrencyBRL(sum)}
        {mismatch ? ` (valor informado: ${formatCurrencyBRL(totalValue)})` : ""}
      </p>
      {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}
    </Modal>
  );
}

function WithdrawModal({
  bucket,
  cashbox,
  onClose,
  onSaved,
}: {
  bucket: DistributionBucket | null;
  cashbox: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!bucket) return;
    setBusy(true);
    setError("");
    try {
      await resources.finance.withdraw({ bucketId: bucket._id, value: parseCurrencyBRL(value), date, description: description.trim(), cashbox });
      setValue("");
      setDescription("");
      onSaved();
    } catch (err) {
      setError(apiError(err, "Não foi possível registrar a retirada."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(bucket)}
      title={`Retirada · ${bucket?.name || ""}`}
      description={bucket ? `Saldo atual: ${formatCurrencyBRL(bucket.balance || 0)}` : undefined}
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary" disabled={busy || parseCurrencyBRL(value) <= 0} onClick={() => void save()}>
          {busy ? "Salvando..." : "Registrar retirada"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-charcoal">
          Valor
          <MoneyInput value={value} onChange={setValue} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-charcoal">
          Data
          <input className="input-search" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-charcoal sm:col-span-2">
          Para quê?
          <input
            className="input-search"
            value={description}
            placeholder="Ex.: Pagamento do DAS, compra de lente..."
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-burgundy">{error}</p> : null}
    </Modal>
  );
}
