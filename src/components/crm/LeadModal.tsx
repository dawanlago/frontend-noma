import { useEffect, useState } from "react";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import { LEAD_SERVICES, LEAD_STAGES } from "@/lib/constants";
import { emptyLeadForm, leadToForm, type LeadForm } from "@/lib/crm/model";
import type { Lead } from "@/types";

interface LeadModalProps {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSave: (form: LeadForm) => Promise<void>;
  onDelete: (lead: Lead) => Promise<void>;
}

export default function LeadModal({ open, lead, onClose, onSave, onDelete }: LeadModalProps) {
  const [form, setForm] = useState<LeadForm>(emptyLeadForm);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(lead ? leadToForm(lead) : emptyLeadForm());
    setConfirmDelete(false);
    setError("");
  }, [open, lead]);

  function update<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do contato.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível salvar o lead.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSaving(true);
    try {
      await onDelete(lead);
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível excluir o lead.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={lead ? "Editar lead" : "Novo lead"}
      description="Cadastre o essencial para acompanhar essa oportunidade."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            {lead ? (
              <button type="button" className={confirmDelete ? "btn-danger" : "btn-secondary text-burgundy"} onClick={handleDelete} disabled={isSaving}>
                {confirmDelete ? "Confirmar exclusão" : "Excluir lead"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar lead"}
            </button>
          </div>
        </div>
      }
    >
      <form
        className="grid gap-4 pt-1 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <Field label="Nome do contato *">
          <input
            className="input-search"
            value={form.name}
            autoFocus
            placeholder="Ex.: Mariana Souza"
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
        <Field label="Empresa">
          <input
            className="input-search"
            value={form.company}
            placeholder="Ex.: Studio Aurora"
            onChange={(event) => update("company", event.target.value)}
          />
        </Field>
        <Field label="Serviço de interesse">
          <Select
            value={form.service}
            onChange={(value) => update("service", value)}
            options={LEAD_SERVICES.map((service) => ({ value: service, label: service }))}
          />
        </Field>
        <Field label="Valor estimado">
          <MoneyInput value={form.value} onChange={(value) => update("value", value)} />
        </Field>
        <Field label="Etapa">
          <Select
            value={form.stage}
            onChange={(value) => update("stage", value as LeadForm["stage"])}
            options={LEAD_STAGES.map((stage) => ({ value: stage.value, label: stage.label }))}
          />
        </Field>
        <Field label="Próxima ação">
          <input
            type="date"
            className="input-search"
            value={form.nextActionDate}
            onChange={(event) => update("nextActionDate", event.target.value)}
          />
        </Field>
        <Field label="Origem / como chegou" full>
          <input
            className="input-search"
            value={form.source}
            placeholder="Instagram, indicação, evento, prospecção..."
            onChange={(event) => update("source", event.target.value)}
          />
        </Field>
        <Field label="Observações" full>
          <textarea
            className="input-search min-h-[96px] resize-y"
            value={form.notes}
            placeholder="O que foi conversado, próximos passos, detalhes do projeto..."
            onChange={(event) => update("notes", event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
