import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { LEADS_BASE_TABS } from "@/lib/leadsTabs";
import { resources } from "@/lib/resources";
import { getInitials } from "@/utils/format";
import type { Company, Contact } from "@/types";

const emptyForm = { name: "", email: "", phone: "", companyId: "" };

export default function ContactsPage() {
  const { data: contacts, isLoading, error, reload } = useAsyncData(() => resources.contacts.list());
  const { data: companies } = useAsyncData(() => resources.companies.list());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companiesById = useMemo(
    () => new Map((companies || []).map((company) => [company._id, company.name])),
    [companies],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts || [];
    return (contacts || []).filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.includes(term),
    );
  }, [contacts, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      companyId: contact.companyId || "",
    });
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        companyId: form.companyId || undefined,
      };
      if (editing) {
        await resources.contacts.update(editing._id, payload);
      } else {
        await resources.contacts.create(payload);
      }
      setModalOpen(false);
      await reload();
    } catch (submitError) {
      setSubmitError(
        (submitError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Erro ao salvar contato.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!window.confirm(`Excluir contato ${contact.name}?`)) return;
    await resources.contacts.remove(contact._id);
    await reload();
  }

  return (
    <>
      <Head>
        <title>Contatos | Noma CRM</title>
      </Head>

      <ListWorkspace
        title="Base de leads"
        tabs={LEADS_BASE_TABS}
        actionLabel="Inserir contato"
        onAction={openCreate}
        countLabel={`Existem ${filtered.length} contatos na sua base`}
        columns={["Contato", "E-mail", "Telefone", "Empresa", "Ações"]}
        emptyMessage="Não existem contatos salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.map((contact) => (
          <tr key={contact._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium text-charcoal">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
                  {getInitials(contact.name)}
                </div>
                {contact.name}
              </div>
            </td>
            <td className="px-4 py-3 text-charcoal/70">{contact.email}</td>
            <td className="px-4 py-3 text-charcoal/70">{contact.phone}</td>
            <td className="px-4 py-3 text-charcoal/70">
              {contact.companyId ? companiesById.get(contact.companyId) || "—" : "—"}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="text-sm text-tan" onClick={() => openEdit(contact)}>
                  Editar
                </button>
                <button type="button" className="text-sm text-burgundy" onClick={() => handleDelete(contact)}>
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar contato" : "Novo contato"}
        onClose={() => setModalOpen(false)}
        footer={<button type="submit" form="contact-form" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</button>}
      >
        <form id="contact-form" onSubmit={handleSubmit}>
          <FormField label="Nome">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="E-mail">
            <input className="input-search" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label="Telefone">
            <input className="input-search" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </FormField>
          <FormField label="Empresa">
            <Select
              value={form.companyId}
              onChange={(companyId) => setForm({ ...form, companyId })}
              placeholder="Sem empresa"
              options={[
                { value: "", label: "Sem empresa" },
                ...(companies || []).map((company: Company) => ({ value: company._id, label: company.name })),
              ]}
            />
          </FormField>
          {submitError ? <p className="text-sm text-burgundy">{submitError}</p> : null}
        </form>
      </Modal>

    </>
  );
}
