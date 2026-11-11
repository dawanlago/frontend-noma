import { useEffect, useMemo, useState } from "react";
import ContactForm from "@/components/base/ContactForm";
import EntityPicker from "@/components/base/EntityPicker";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FINANCE_STATUS_OPTIONS } from "@/lib/constants";
import { apiError } from "@/lib/errors";
import { computeLateCharge, hasLateRules, lateDaysLabel } from "@/lib/finance/lateCharge";
import {
  addMonths,
  emptyEntryForm,
  entryToForm,
  formInterest,
  installmentCount,
  isSettledStatus,
  switchEntryType,
  validateEntryForm,
  type CategoryDefaults,
  type EntryForm,
} from "@/lib/finance/model";
import { resources } from "@/lib/resources";
import type { Company, Contact, FinanceEntry, FinanceStatus, Lead, TransactionType } from "@/types";
import { formatCurrencyBRL, formatDateOnly, maskCurrencyBRL, parseCurrencyBRL, todayISO } from "@/utils/format";

interface EntryModalProps {
  open: boolean;
  month: string;
  initialType: TransactionType;
  entry: FinanceEntry | null;
  /** Formulário já preenchido (ex.: vindo de uma venda feita no CRM). */
  preset?: EntryForm | null;
  /** Caixa padrão das movimentações novas (a aba aberta no financeiro). */
  cashbox?: string;
  onClose: () => void;
  onSave: (form: EntryForm) => Promise<void>;
}

const TYPE_OPTIONS: { value: TransactionType; title: string; description: string }[] = [
  { value: "income", title: "Entrada", description: "Cliente, contrato, evento ou serviço recebido." },
  { value: "expense", title: "Despesa", description: "Software, equipe, transporte ou outro custo." },
];

export function useCategoryDefaults(): CategoryDefaults {
  const { optionsOf } = useWorkspace();
  return {
    income: optionsOf("incomeCategory")[0]?.value,
    expense: optionsOf("expenseCategory")[0]?.value,
    payment: optionsOf("paymentMethod")[0]?.value,
    cashbox: optionsOf("financeCashbox")[0]?.value,
  };
}

export default function EntryModal({ open, month, initialType, entry, preset, cashbox, onClose, onSave }: EntryModalProps) {
  const { can } = useAuth();
  const lateRules = useWorkspace().settings?.finance;
  const baseDefaults = useCategoryDefaults();
  const defaults = { ...baseDefaults, cashbox: cashbox || baseDefaults.cashbox };
  const [form, setForm] = useState<EntryForm>(() => emptyEntryForm(month, initialType));
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(entry ? entryToForm(entry) : preset || emptyEntryForm(month, initialType, defaults));
    setError("");
    void Promise.all([
      can("crm", "base") ? resources.leads.list() : Promise.resolve([]),
      resources.contacts.list(),
      resources.companies.list(),
    ])
      .then(([leadList, contactList, companyList]) => {
        setLeads(leadList);
        setContacts(contactList);
        setCompanies(companyList);
      })
      .catch(() => undefined);
    // Os padrões só importam na abertura do formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, preset, month, initialType]);

  // Aberto logo ao carregar a página (ex.: menu "Criar"): as opções podem chegar depois.
  useEffect(() => {
    if (!open || entry || !defaults.cashbox) return;
    setForm((current) => (current.cashbox ? current : { ...current, cashbox: defaults.cashbox || "" }));
  }, [open, entry, defaults.cashbox]);

  const clientItems = useMemo(
    () => [
      ...companies.map((company) => ({ id: `company:${company._id}`, label: company.name, sublabel: "Empresa", image: company.logo })),
      ...contacts.map((contact) => ({ id: `contact:${contact._id}`, label: contact.name, sublabel: "Contato", image: contact.photo })),
    ],
    [companies, contacts],
  );

  function update<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function pickClient(clientRef: string) {
    const item = clientItems.find((option) => option.id === clientRef);
    setForm((current) => ({ ...current, clientRef, client: item?.label || current.client }));
  }

  function pickLead(leadId: string) {
    const lead = leads.find((item) => item._id === leadId);
    setForm((current) => {
      if (!lead) return { ...current, leadId };
      const clientRef = current.clientRef || (lead.companyId ? `company:${lead.companyId}` : lead.contactId ? `contact:${lead.contactId}` : "");
      return {
        ...current,
        leadId,
        clientRef,
        client: current.client || lead.company || lead.contactName,
        description: current.description || lead.name,
        value: current.value || (lead.value ? maskCurrencyBRL(lead.value) : ""),
      };
    });
  }

  async function handleSave() {
    const message = validateEntryForm(form);
    if (message) {
      setError(message);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a movimentação."));
    } finally {
      setIsSaving(false);
    }
  }

  const isIncome = form.type === "income";
  const settled = isSettledStatus(form.status);

  /*
   * Juros/multa: sem mudar valor, vencimento, recebimento ou perdão, vale o que foi gravado
   * (mudar as taxas depois não muda o que já foi recebido); senão, prévia com as taxas atuais.
   */
  const lateCharge = useMemo(() => {
    if (!isIncome) return null;
    const value = parseCurrencyBRL(form.value);
    const paidAt = settled ? form.paidAt || todayISO() : todayISO();
    const unchanged =
      entry &&
      entry.status === form.status &&
      entry.value === value &&
      entry.date === form.date &&
      (entry.paidAt || "") === form.paidAt &&
      Boolean(entry.lateChargeWaived) === form.lateChargeWaived;
    if (unchanged && settled && !form.lateChargeWaived) return entry.lateCharge || null;
    return computeLateCharge(value, form.date, paidAt, lateRules);
  }, [isIncome, settled, form.value, form.date, form.paidAt, form.status, form.lateChargeWaived, entry, lateRules]);
  const lateValue = parseCurrencyBRL(form.value);

  // Parcelamento: só na criação (cada parcela vira uma movimentação no seu mês).
  const count = entry ? 1 : installmentCount(form);
  const interestTotal = formInterest(form);
  const principal = parseCurrencyBRL(form.value);
  const perInstallment = count > 0 ? (principal + interestTotal) / count : 0;
  const lastDate = count > 1 && /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? addMonths(form.date, count - 1) : "";
  const isCard = /cart/i.test(form.payment);

  function changeStatus(status: FinanceStatus) {
    // Ao marcar como recebida/paga, a data do recebimento começa em hoje.
    setForm((current) => ({ ...current, status, paidAt: isSettledStatus(status) ? current.paidAt || todayISO() : "" }));
  }

  return (
    <>
      <Modal
        variant="drawer"
        open={open}
        onClose={onClose}
        size="lg"
        title={entry ? "Editar movimentação" : "Nova movimentação"}
        description="Registre o valor, a data e a situação do pagamento."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar movimentação"}
            </button>
          </>
        }
      >
        <form
          className="grid gap-5 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <OptionCards value={form.type} options={TYPE_OPTIONS} onChange={(type) => setForm((current) => switchEntryType(current, type, defaults))} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Descrição *" full>
              <input
                className="input-search"
                value={form.description}
                placeholder="Ex.: Produção mensal de conteúdo"
                onChange={(event) => update("description", event.target.value)}
              />
            </Field>
            {isIncome && leads.length ? (
              <Field label="Negociação do CRM" group hint="Opcional. Vincula a entrada à venda.">
                <EntityPicker
                  items={leads.map((lead) => ({
                    id: lead._id,
                    label: lead.name,
                    sublabel: `${formatCurrencyBRL(lead.value || 0)}${lead.status === "won" ? " · venda feita" : ""}`,
                  }))}
                  value={form.leadId}
                  onChange={pickLead}
                  placeholder="Sem vínculo"
                  showAvatar={false}
                />
              </Field>
            ) : null}
            <Field label={isIncome ? "Cliente da base" : "Fornecedor da base"} group hint="Opcional. Aparece no histórico do cliente.">
              <EntityPicker
                items={clientItems}
                value={form.clientRef}
                onChange={pickClient}
                placeholder="Sem vínculo"
                addLabel="+ Novo"
                onAdd={() => setContactOpen(true)}
              />
            </Field>
            {isIncome ? (
              <Field label="Nome do cliente (texto)" hint="Usado quando o cliente não está na base.">
                <input className="input-search" value={form.client} placeholder="Ex.: Empresa ABC" onChange={(event) => update("client", event.target.value)} />
              </Field>
            ) : null}
            <Field label={isIncome ? "Tipo de receita" : "Categoria"}>
              <OptionSelect
                list={isIncome ? "incomeCategory" : "expenseCategory"}
                value={form.category}
                onChange={(value) => update("category", value)}
              />
            </Field>
            <Field label={count > 1 ? "Valor total (sem juros) *" : "Valor *"}>
              <MoneyInput value={form.value} onChange={(value) => update("value", value)} required />
            </Field>
            <Field label={count > 1 ? (isIncome ? "Vencimento da 1ª parcela *" : "Data da 1ª parcela *") : isIncome ? "Vencimento *" : "Data *"}>
              <input type="date" className="input-search" value={form.date} onChange={(event) => update("date", event.target.value)} />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(value) => changeStatus(value as FinanceStatus)}
                options={FINANCE_STATUS_OPTIONS[form.type].map((item) => ({ value: item.value, label: item.label }))}
              />
            </Field>
            {settled ? (
              <Field label={isIncome ? "Recebido em" : "Pago em"} hint={isIncome ? "Depois do vencimento, entram juros e multa por atraso." : undefined}>
                <input type="date" className="input-search" value={form.paidAt} onChange={(event) => update("paidAt", event.target.value)} />
              </Field>
            ) : null}
            <Field label="Forma de pagamento">
              <OptionSelect list="paymentMethod" value={form.payment} onChange={(value) => update("payment", value)} />
            </Field>
            <Field label="Caixa" hint="Em qual caixa este valor entra (ou sai).">
              <OptionSelect list="financeCashbox" value={form.cashbox} onChange={(value) => update("cashbox", value)} />
            </Field>
            <Field label={isIncome ? "Banco de entrada" : "Banco de saída"} hint="Conta onde o dinheiro entrou ou de onde saiu.">
              <OptionSelect list="bankAccount" value={form.bank} onChange={(value) => update("bank", value)} emptyLabel="Não informado" />
            </Field>
            <Field label="Notas" full>
              <textarea
                className="input-search min-h-[72px] resize-y"
                value={form.notes}
                placeholder="Número da nota fiscal, observações do pagamento..."
                onChange={(event) => update("notes", event.target.value)}
              />
            </Field>
          </div>

          <section className="rounded-xl border border-charcoal/10 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-charcoal">{entry ? "Juros" : "Parcelas e juros"}</h3>
              {!entry && isCard && count === 1 ? (
                <span className="text-[13px] text-charcoal/55">Compra no cartão parcelada? Informe as parcelas.</span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {!entry ? (
                <Field label="Parcelas" hint="1 = à vista. Cada parcela vai para o mês seguinte.">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    inputMode="numeric"
                    className="input-search"
                    value={form.installments}
                    onChange={(event) => update("installments", event.target.value.replace(/\D/g, "").slice(0, 2))}
                  />
                </Field>
              ) : null}
              <Field label={entry ? "Juros desta movimentação" : "Juros"} hint={entry ? "Somam no total do mês." : "Total de juros da compra/venda, ou a taxa ao mês."}>
                <div className="flex gap-2">
                  {!entry ? (
                    <div className="w-28 shrink-0">
                      <Select
                        value={form.interestMode}
                        onChange={(value) => update("interestMode", value as EntryForm["interestMode"])}
                        options={[
                          { value: "amount", label: "R$" },
                          { value: "rate", label: "% a.m." },
                        ]}
                      />
                    </div>
                  ) : null}
                  {form.interestMode === "rate" && !entry ? (
                    <label className="relative flex-1">
                      <input
                        className="input-search pr-[4.5rem] text-right"
                        inputMode="decimal"
                        placeholder="0"
                        value={form.interestRate}
                        aria-label="Taxa de juros ao mês"
                        onChange={(event) => update("interestRate", event.target.value.replace(/[^\d.,]/g, ""))}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal/45">% a.m.</span>
                    </label>
                  ) : (
                    <div className="flex-1">
                      <MoneyInput value={form.interest} onChange={(value) => update("interest", value)} />
                    </div>
                  )}
                </div>
              </Field>
            </div>
            {principal > 0 && (count > 1 || interestTotal > 0) ? (
              <p className="mt-3 rounded-lg bg-beige/70 px-3 py-2 text-[13px] text-charcoal/70">
                {count > 1 ? (
                  <>
                    <strong className="text-charcoal">
                      {count}x de <span data-money>{formatCurrencyBRL(perInstallment)}</span>
                    </strong>{" "}
                    · de {formatDateOnly(form.date)} a {formatDateOnly(lastDate)} ·{" "}
                  </>
                ) : null}
                total <strong data-money className="text-charcoal">{formatCurrencyBRL(principal + interestTotal)}</strong>
                {interestTotal > 0 ? (
                  <>
                    {" "}
                    (<span data-money>{formatCurrencyBRL(interestTotal)}</span> de juros)
                  </>
                ) : null}
                {count > 1 ? ". A 1ª parcela fica com a situação escolhida; as próximas entram como " + (isIncome ? "a receber." : "previstas.") : "."}
              </p>
            ) : null}
          </section>

          {isIncome && lateCharge ? (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
              {settled && form.lateChargeWaived ? (
                <p className="text-charcoal/70">
                  {lateDaysLabel(lateCharge.days)} — juros/multa de <span data-money>{formatCurrencyBRL(lateCharge.total)}</span> perdoados.
                </p>
              ) : (
                <>
                  <p className="font-semibold text-charcoal">
                    {settled ? "" : "Se receber hoje: "}
                    <span data-money>+ {formatCurrencyBRL(lateCharge.total)}</span> de juros/multa · {lateDaysLabel(lateCharge.days)}
                  </p>
                  <p className="mt-1 text-[13px] text-charcoal/60">
                    Valor <span data-money>{formatCurrencyBRL(lateValue)}</span> · multa <span data-money>{formatCurrencyBRL(lateCharge.fee)}</span> · juros{" "}
                    <span data-money>{formatCurrencyBRL(lateCharge.interest)}</span> · total{" "}
                    <strong data-money className="text-charcoal">
                      {formatCurrencyBRL(lateValue + lateCharge.total)}
                    </strong>
                  </p>
                </>
              )}
              {settled ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-charcoal/70">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(210,98%,48%)]"
                    checked={form.lateChargeWaived}
                    onChange={(event) => update("lateChargeWaived", event.target.checked)}
                  />
                  Não cobrar juros/multa deste atraso
                </label>
              ) : null}
            </div>
          ) : null}
          {isIncome && !hasLateRules(lateRules) && settled && form.paidAt > form.date ? (
            <p className="text-[13px] text-charcoal/50">
              Recebida com atraso. Para cobrar juros e multa, configure as taxas em Configurações → Geral.
            </p>
          ) : null}

          {!isIncome && count === 1 ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/10 p-4 transition hover:border-charcoal/25">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[hsl(210,98%,48%)]"
                checked={form.recurring}
                onChange={(event) => update("recurring", event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-charcoal">Recorrência</span>
                <span className="mt-0.5 block text-[13px] text-charcoal/55">Esta despesa é recorrente e deve aparecer como prevista nos próximos meses.</span>
              </span>
            </label>
          ) : null}

          {error ? <p className="text-sm font-medium text-burgundy">{error}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>

      <ContactForm
        open={contactOpen}
        contact={null}
        initial={{ kinds: isIncome ? ["client"] : ["supplier"] }}
        onClose={() => setContactOpen(false)}
        onSaved={(contact) => {
          setContacts((current) => [...current, contact]);
          setForm((current) => ({ ...current, clientRef: `contact:${contact._id}`, client: current.client || contact.name }));
          setContactOpen(false);
        }}
      />
    </>
  );
}
