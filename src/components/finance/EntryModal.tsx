import { useEffect, useState } from "react";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import { EXPENSE_CATEGORIES, FINANCE_STATUS_OPTIONS, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import {
  emptyEntryForm,
  entryToForm,
  switchEntryType,
  validateEntryForm,
  type EntryForm,
} from "@/lib/finance/model";
import type { FinanceEntry, FinanceStatus, TransactionType } from "@/types";

interface EntryModalProps {
  open: boolean;
  month: string;
  initialType: TransactionType;
  entry: FinanceEntry | null;
  onClose: () => void;
  onSave: (form: EntryForm) => Promise<void>;
}

const TYPE_OPTIONS: { value: TransactionType; title: string; description: string }[] = [
  { value: "income", title: "Entrada", description: "Cliente, contrato, evento ou serviço recebido." },
  { value: "expense", title: "Despesa", description: "Software, equipe, transporte ou outro custo." },
];

export default function EntryModal({ open, month, initialType, entry, onClose, onSave }: EntryModalProps) {
  const [form, setForm] = useState<EntryForm>(() => emptyEntryForm(month, initialType));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(entry ? entryToForm(entry) : emptyEntryForm(month, initialType));
    setError("");
  }, [open, entry, month, initialType]);

  function update<K extends keyof EntryForm>(key: K, value: EntryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível salvar a movimentação.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isIncome = form.type === "income";
  const categories: readonly string[] = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryOptions: { value: string; label: string }[] = categories.map((item) => ({ value: item, label: item }));
  if (form.category && !categories.some((item) => item === form.category)) {
    categoryOptions.push({ value: form.category, label: form.category });
  }

  return (
    <Modal
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
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
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
        <OptionCards
          value={form.type}
          options={TYPE_OPTIONS}
          onChange={(type) => setForm((current) => switchEntryType(current, type))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Descrição *" full>
            <input
              className="input-search"
              value={form.description}
              placeholder="Ex.: Produção mensal de conteúdo"
              onChange={(event) => update("description", event.target.value)}
            />
          </Field>
          {isIncome ? (
            <Field label="Cliente">
              <input
                className="input-search"
                value={form.client}
                placeholder="Ex.: Empresa ABC"
                onChange={(event) => update("client", event.target.value)}
              />
            </Field>
          ) : null}
          <Field label={isIncome ? "Tipo de receita" : "Categoria"}>
            <Select value={form.category} onChange={(value) => update("category", value)} options={categoryOptions} />
          </Field>
          <Field label="Valor *">
            <MoneyInput value={form.value} onChange={(value) => update("value", value)} required />
          </Field>
          <Field label="Data *">
            <input
              type="date"
              className="input-search"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(value) => update("status", value as FinanceStatus)}
              options={FINANCE_STATUS_OPTIONS[form.type].map((item) => ({ value: item.value, label: item.label }))}
            />
          </Field>
          <Field label="Forma de pagamento">
            <Select
              value={form.payment}
              onChange={(value) => update("payment", value)}
              options={PAYMENT_METHODS.map((item) => ({ value: item, label: item }))}
            />
          </Field>
        </div>

        {!isIncome ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/10 p-4 transition hover:border-charcoal/25">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[hsl(210,98%,48%)]"
              checked={form.recurring}
              onChange={(event) => update("recurring", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-charcoal">Recorrência</span>
              <span className="mt-0.5 block text-[13px] text-charcoal/55">
                Esta despesa é recorrente e deve aparecer como prevista nos próximos meses.
              </span>
            </span>
          </label>
        ) : null}

        {error ? <p className="text-sm font-medium text-burgundy">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
