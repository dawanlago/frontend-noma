import { FormEvent, useMemo, useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import MoneyInput from "@/components/ui/MoneyInput";
import { resources } from "@/lib/resources";
import { parseCurrencyBRL } from "@/utils/format";
import type { Contact, Company, Funnel } from "@/types";

interface NewDealModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function NewDealModal({ open, onClose, onCreated }: NewDealModalProps) {
  const { data: contacts } = useAsyncData(() => resources.contacts.list(), [open]);
  const { data: companies } = useAsyncData(() => resources.companies.list(), [open]);
  const { data: funnels } = useAsyncData(() => resources.funnels.list(), [open]);
  const { data: users } = useAsyncData(() => resources.users.list(), [open]);
  const [form, setForm] = useState({
    title: "",
    contactId: "",
    companyId: "",
    funnelId: "",
    ownerUserId: "",
    value: "",
    temperature: "cold",
    source: "manual",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultFunnelId = useMemo(() => funnels?.[0]?._id || "", [funnels]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    if (!form.contactId) {
      setError("Selecione um contato.");
      setIsSubmitting(false);
      return;
    }
    try {
      await resources.deals.create({
        ...form,
        funnelId: form.funnelId || defaultFunnelId,
        ownerUserId: form.ownerUserId || undefined,
        value: parseCurrencyBRL(form.value),
        companyId: form.companyId || undefined,
      });
      onClose();
      onCreated?.();
      setForm({
        title: "",
        contactId: "",
        companyId: "",
        funnelId: "",
        ownerUserId: "",
        value: "",
        temperature: "cold",
        source: "manual",
      });
    } catch {
      setError("Não foi possível criar a negociação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Nova oportunidade"
      onClose={onClose}
      footer={<button type="submit" form="new-deal-form" className="btn-gold" disabled={isSubmitting}>{isSubmitting ? "Criando..." : "Criar negociação"}</button>}
    >
      <form id="new-deal-form" onSubmit={handleSubmit}>
        <FormField label="Título">
          <input className="input-search" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </FormField>
        <FormField label="Contato">
          <Select
            value={form.contactId}
            onChange={(contactId) => setForm({ ...form, contactId })}
            placeholder="Selecione o contato"
            options={(contacts || []).map((contact: Contact) => ({ value: contact._id, label: contact.name }))}
          />
        </FormField>
        <FormField label="Empresa">
          <Select
            value={form.companyId}
            onChange={(companyId) => setForm({ ...form, companyId })}
            placeholder="Opcional"
            options={[
              { value: "", label: "Sem empresa" },
              ...(companies || []).map((company: Company) => ({ value: company._id, label: company.name })),
            ]}
          />
        </FormField>
        <FormField label="Funil">
          <Select
            value={form.funnelId || defaultFunnelId}
            onChange={(funnelId) => setForm({ ...form, funnelId })}
            options={(funnels || []).map((funnel: Funnel) => ({ value: funnel._id, label: funnel.name }))}
          />
        </FormField>
        <FormField label="Responsável">
          <Select
            value={form.ownerUserId}
            onChange={(ownerUserId) => setForm({ ...form, ownerUserId })}
            placeholder="Você (padrão)"
            options={[
              { value: "", label: "Você (padrão)" },
              ...(users || []).map((user) => ({ value: user._id, label: user.name })),
            ]}
          />
        </FormField>
        <FormField label="Valor">
          <MoneyInput value={form.value} onChange={(value) => setForm({ ...form, value })} />
        </FormField>
        <FormField label="Temperatura">
          <Select
            value={form.temperature}
            onChange={(temperature) => setForm({ ...form, temperature })}
            options={[
              { value: "cold", label: "Frio" },
              { value: "warm", label: "Morno" },
              { value: "hot", label: "Quente" },
            ]}
          />
        </FormField>
        {error ? <p className="text-sm text-burgundy">{error}</p> : null}
      </form>
    </Modal>
  );
}
