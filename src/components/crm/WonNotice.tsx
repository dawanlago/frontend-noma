import { useEffect, useMemo, useState } from "react";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { splitInstallments } from "@/lib/finance/model";
import { resources } from "@/lib/resources";
import type { FinanceEntry, Lead } from "@/types";
import { formatCurrencyBRL, formatDateOnly, maskCurrencyBRL, parseCurrencyBRL, todayISO } from "@/utils/format";

interface WonNoticeProps {
  lead: Lead | null;
  onClose: () => void;
  /** "won" = acabou de virar venda; "launch" = aberto pelo botão da negociação. */
  mode?: "won" | "launch";
  onLaunched?: (entries: FinanceEntry[]) => void;
}

const COUNT_OPTIONS = Array.from({ length: 24 }, (_, index) => ({
  value: String(index + 1),
  label: index === 0 ? "À vista (1x)" : `${index + 1}x`,
}));

interface Parcel {
  value: string;
  date: string;
}

/**
 * Venda feita → lançamento no financeiro. A pessoa escolhe se lança agora (à vista ou parcelado),
 * em qual caixa e banco, ou se deixa para depois. Nada é lançado sem confirmação, para evitar duplicidade.
 */
export default function WonNotice({ lead, onClose, mode = "won", onLaunched }: WonNoticeProps) {
  const { can } = useAuth();
  const { optionsOf } = useWorkspace();
  const canLaunch = can("financeiro");
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("1");
  const [firstDate, setFirstDate] = useState(todayISO);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [payment, setPayment] = useState("");
  const [category, setCategory] = useState("");
  const [cashbox, setCashbox] = useState("");
  const [bank, setBank] = useState("");
  const [notes, setNotes] = useState("");
  const [firstReceived, setFirstReceived] = useState(false);
  const [existing, setExisting] = useState<FinanceEntry[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setTotal(lead.value ? maskCurrencyBRL(lead.value) : "");
    setCount("1");
    setFirstDate(todayISO());
    setPayment(optionsOf("paymentMethod")[0]?.value || "Pix");
    setCategory(optionsOf("incomeCategory")[0]?.value || "");
    setCashbox(optionsOf("financeCashbox")[0]?.value || "");
    setBank("");
    setNotes("");
    setFirstReceived(false);
    setError("");
    setExisting([]);
    if (canLaunch) void resources.finance.leadEntries(lead._id).then(setExisting).catch(() => undefined);
    // Só reinicia ao abrir para outra negociação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id]);

  // Regera as parcelas quando muda total, quantidade ou primeira data; depois cada uma pode ser ajustada.
  useEffect(() => {
    setParcels(
      splitInstallments(parseCurrencyBRL(total), Number(count), firstDate).map((item) => ({
        value: item.value ? maskCurrencyBRL(item.value) : "",
        date: item.date,
      })),
    );
  }, [total, count, firstDate]);

  const parcelSum = useMemo(() => parcels.reduce((sum, item) => sum + parseCurrencyBRL(item.value), 0), [parcels]);
  const existingTotal = existing.reduce((sum, entry) => sum + entry.value, 0);
  const mismatch = Math.abs(parcelSum - parseCurrencyBRL(total)) >= 0.01;

  function updateParcel(index: number, patch: Partial<Parcel>) {
    setParcels((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function launch() {
    if (!lead) return;
    if (parcels.some((item) => parseCurrencyBRL(item.value) <= 0 || !item.date)) {
      setError("Informe valor e data de cada parcela.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await resources.finance.createInstallments({
        description: lead.name,
        client: lead.company || lead.contactName || "",
        category,
        payment,
        cashbox,
        bank,
        notes,
        leadId: lead._id,
        contactId: lead.contactId || "",
        companyId: lead.companyId || "",
        firstReceived,
        installments: parcels.map((item) => ({ value: parseCurrencyBRL(item.value), date: item.date })),
      });
      onLaunched?.(saved);
      onClose();
    } catch (err) {
      setError(apiError(err, "Não foi possível lançar no financeiro."));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "won" ? "Venda registrada 🎉" : "Lançar no financeiro";

  if (!canLaunch) {
    return (
      <Modal
        open={Boolean(lead)}
        onClose={onClose}
        title={title}
        description={lead ? `${lead.name} · ${formatCurrencyBRL(lead.value || 0)}` : ""}
        footer={
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        }
      >
        <p className="text-sm text-charcoal/65">
          A negociação foi marcada como venda feita{lead?.contactName ? ` e fica no histórico de ${lead.contactName}` : ""}.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      variant="drawer"
      open={Boolean(lead)}
      onClose={onClose}
      size="lg"
      title={title}
      description={
        mode === "won"
          ? "Quer lançar esta venda no financeiro agora? Escolha à vista ou parcelado — cada parcela vira um recebimento."
          : "Cada parcela vira um recebimento no financeiro, vinculado a esta negociação."
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {mode === "won" ? "Não lançar agora" : "Cancelar"}
          </button>
          <button type="button" className="btn-primary" onClick={() => void launch()} disabled={saving || !parcels.length}>
            {saving ? "Lançando..." : `Lançar ${parcels.length > 1 ? `${parcels.length} parcelas` : "entrada"}`}
          </button>
        </>
      }
    >
      <div className="grid gap-5 pt-1">
        {existing.length ? (
          <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-charcoal">
            Esta venda já tem {existing.length} lançamento{existing.length > 1 ? "s" : ""} no financeiro (
            {formatCurrencyBRL(existingTotal)}). Lance de novo só se for um valor adicional.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor total">
            <MoneyInput value={total} onChange={setTotal} />
          </Field>
          <Field label="Parcelas">
            <Select value={count} onChange={setCount} options={COUNT_OPTIONS} />
          </Field>
          <Field label={Number(count) > 1 ? "1º vencimento" : "Data"}>
            <input type="date" className="input-search" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} />
          </Field>
        </div>

        {parcels.length > 1 ? (
          <div className="rounded-xl border border-charcoal/10">
            <div className="max-h-64 divide-y divide-charcoal/5 overflow-y-auto">
              {parcels.map((parcel, index) => (
                <div key={index} className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-4 py-2">
                  <span className="text-xs font-semibold text-charcoal/50">
                    {index + 1}/{parcels.length}
                  </span>
                  <MoneyInput value={parcel.value} onChange={(value) => updateParcel(index, { value })} />
                  <input
                    type="date"
                    className="input-search"
                    aria-label={`Vencimento da parcela ${index + 1}`}
                    value={parcel.date}
                    onChange={(event) => updateParcel(index, { date: event.target.value })}
                  />
                </div>
              ))}
            </div>
            <p className={`border-t border-charcoal/5 px-4 py-2 text-xs ${mismatch ? "font-semibold text-burgundy" : "text-charcoal/50"}`}>
              Soma das parcelas: {formatCurrencyBRL(parcelSum)}
              {mismatch ? ` (total informado: ${formatCurrencyBRL(parseCurrencyBRL(total))})` : ""}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Forma de pagamento">
            <OptionSelect list="paymentMethod" value={payment} onChange={setPayment} />
          </Field>
          <Field label="Tipo de receita">
            <OptionSelect list="incomeCategory" value={category} onChange={setCategory} />
          </Field>
          <Field label="Caixa">
            <OptionSelect list="financeCashbox" value={cashbox} onChange={setCashbox} />
          </Field>
          <Field label="Banco de entrada">
            <OptionSelect list="bankAccount" value={bank} onChange={setBank} emptyLabel="Não informado" />
          </Field>
          <Field label="Notas" full>
            <textarea
              className="input-search min-h-[64px] resize-y"
              value={notes}
              placeholder="Número da nota fiscal, condições combinadas..."
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-charcoal">
          <input type="checkbox" className="h-4 w-4" checked={firstReceived} onChange={(event) => setFirstReceived(event.target.checked)} />
          {parcels.length > 1
            ? `A 1ª parcela (${formatDateOnly(parcels[0]?.date || firstDate)}) já foi recebida`
            : "Este valor já foi recebido"}
        </label>

        {error ? <p className="text-sm font-medium text-burgundy">{error}</p> : null}
      </div>
    </Modal>
  );
}
