import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { LEADS_BASE_TABS } from "@/lib/leadsTabs";
import { resources } from "@/lib/resources";
import type { Company } from "@/types";

const emptyForm = { name: "", taxId: "" };

export default function CompaniesPage() {
  const { data: companies, isLoading, error, reload } = useAsyncData(() => resources.companies.list());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies || [];
    return (companies || []).filter(
      (item) => item.name.toLowerCase().includes(term) || item.taxId.includes(term),
    );
  }, [companies, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    setForm({ name: company.name, taxId: company.taxId });
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (editing) {
        await resources.companies.update(editing._id, form);
      } else {
        await resources.companies.create(form);
      }
      setModalOpen(false);
      await reload();
    } catch (submitError) {
      setSubmitError(
        (submitError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Erro ao salvar empresa.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(company: Company) {
    if (!window.confirm(`Excluir empresa ${company.name}?`)) return;
    await resources.companies.remove(company._id);
    await reload();
  }

  return (
    <>
      <Head>
        <title>Empresas | Noma CRM</title>
      </Head>

      <ListWorkspace
        title="Base de leads"
        tabs={LEADS_BASE_TABS}
        actionLabel="Inserir empresa"
        onAction={openCreate}
        countLabel={`Existem ${filtered.length} empresas na sua base`}
        columns={["Empresa", "CNPJ/CPF", "Status", "Ações"]}
        emptyMessage="Não existem empresas salvas na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.map((company) => (
          <tr key={company._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium text-charcoal">{company.name}</td>
            <td className="px-4 py-3 text-charcoal/70">{company.taxId}</td>
            <td className="px-4 py-3">
              <span className={`chip ${company.isActive ? "bg-sage/10 text-sage" : "bg-charcoal/5 text-charcoal/50"}`}>
                {company.isActive ? "Ativa" : "Inativa"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button type="button" className="text-sm text-tan" onClick={() => openEdit(company)}>Editar</button>
                <button type="button" className="text-sm text-burgundy" onClick={() => handleDelete(company)}>Excluir</button>
              </div>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar empresa" : "Nova empresa"}
        onClose={() => setModalOpen(false)}
        footer={<button type="submit" form="company-form" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</button>}
      >
        <form id="company-form" onSubmit={handleSubmit}>
          <FormField label="Nome">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="CNPJ/CPF">
            <input className="input-search" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} required />
          </FormField>
          {submitError ? <p className="text-sm text-burgundy">{submitError}</p> : null}
        </form>
      </Modal>
    </>
  );
}
