import { FormEvent, useState } from "react";
import Head from "next/head";
import RequireAdmin from "@/components/auth/RequireAdmin";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { FinancialCategory } from "@/types";

function FinanceCategoriesContent() {
  const { data, isLoading, error, reload } = useAsyncData(() => resources.finance.categories.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [form, setForm] = useState({ name: "", percentage: "0" });
  const [submitError, setSubmitError] = useState("");

  const categories = data?.data || [];
  const activeSum = data?.meta.activeSum ?? 0;

  function openCreate() {
    setEditing(null);
    setForm({ name: "", percentage: "0" });
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(category: FinancialCategory) {
    setEditing(category);
    setForm({ name: category.name, percentage: String(category.percentage) });
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError("");
    const payload = { name: form.name, percentage: Number(form.percentage), isActive: true };
    try {
      if (editing) await resources.finance.categories.update(editing._id, payload);
      else await resources.finance.categories.create(payload);
      setModalOpen(false);
      await reload();
    } catch (saveError) {
      setSubmitError(
        (saveError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível salvar a categoria.",
      );
    }
  }

  return (
    <>
      <Head><title>Categorias financeiras | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Configurações"
        title="Distribuição financeira"
        description="A soma dos percentuais ativos não pode passar de 100%. Para fechar vendas, precisa ser exatamente 100%."
        actions={<button type="button" className="btn-primary" onClick={openCreate}>Nova categoria</button>}
      />

      <div className={`mb-5 rounded-2xl px-4 py-3 text-sm ${activeSum === 100 ? "bg-sage/10 text-sage" : "bg-gold/10 text-charcoal"}`}>
        Soma atual: <strong>{activeSum}%</strong>
        {activeSum === 100 ? " · configuração válida para distribuição automática." : " · ajuste para 100% antes de fechar vendas."}
      </div>

      <ListWorkspace
        countLabel={`${categories.length} categorias`}
        columns={["Categoria", "Percentual", "Status", "Ações"]}
        emptyMessage="Cadastre as categorias de distribuição."
        isLoading={isLoading}
        error={error}
      >
        {categories.map((category) => (
          <tr key={category._id}>
            <td className="px-4 py-3 font-medium">{category.name}</td>
            <td className="px-4 py-3">{category.percentage}%</td>
            <td className="px-4 py-3">{category.isActive ? "Ativa" : "Inativa"}</td>
            <td className="px-4 py-3">
              <button type="button" className="text-sm font-medium text-tan" onClick={() => openEdit(category)}>
                Editar
              </button>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar categoria" : "Nova categoria"}
        onClose={() => setModalOpen(false)}
        footer={<button type="submit" form="category-form" className="btn-primary">Salvar</button>}
      >
        <form id="category-form" onSubmit={handleSubmit}>
          <FormField label="Nome">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Percentual">
            <input
              className="input-search"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.percentage}
              onChange={(e) => setForm({ ...form, percentage: e.target.value })}
              required
            />
          </FormField>
          {submitError ? <p className="text-sm text-burgundy">{submitError}</p> : null}
        </form>
      </Modal>
    </>
  );
}

export default function FinanceSettingsPage() {
  return (
    <RequireAdmin>
      <FinanceCategoriesContent />
    </RequireAdmin>
  );
}
