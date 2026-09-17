import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import MoneyInput from "@/components/ui/MoneyInput";
import { formatCurrencyBRL, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import type { Product } from "@/types";

const emptyForm = { name: "", operationalCost: "", profit: "" };

export default function ProductsPage() {
  const { data: products, isLoading, error, reload } = useAsyncData(() => resources.products.list());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products || [];
    return (products || []).filter((item) => item.name.toLowerCase().includes(term));
  }, [products, search]);

  const operationalCost = parseCurrencyBRL(form.operationalCost);
  const profit = parseCurrencyBRL(form.profit);
  const sellingPrice = operationalCost + profit;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      operationalCost: maskCurrencyBRL(product.operationalCost),
      profit: maskCurrencyBRL(product.profit),
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
        name: form.name,
        operationalCost,
        profit,
      };
      if (editing) await resources.products.update(editing._id, payload);
      else await resources.products.create(payload);
      setModalOpen(false);
      await reload();
    } catch {
      setSubmitError("Erro ao salvar produto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Excluir produto ${product.name}?`)) return;
    await resources.products.remove(product._id);
    await reload();
  }

  return (
    <>
      <Head><title>Produtos | Noma CRM</title></Head>
      <ListWorkspace
        title="Produtos"
        actionLabel="Inserir produto"
        onAction={openCreate}
        countLabel={`Existem ${filtered.length} produtos na sua base`}
        columns={["Produto", "Custo operacional", "Lucro", "Ações"]}
        emptyMessage="Não existem produtos salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.map((product) => (
          <tr key={product._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">{product.name}</td>
            <td className="px-4 py-3">{formatCurrencyBRL(product.operationalCost)}</td>
            <td className="px-4 py-3">{formatCurrencyBRL(product.profit)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button type="button" className="text-sm text-tan" onClick={() => openEdit(product)}>Editar</button>
                <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(product)}>Excluir</button>
              </div>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        description="Monte a oferta com custo, margem e o preço que entra no funil."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="product-form" className="btn-gold" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editing ? "Salvar alterações" : "Criar produto"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-1">
          <FormField label="Nome da oferta" hint="Como o produto aparece nas negociações.">
            <input
              className="input-search"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Vídeo de posicionamento"
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Custo operacional">
              <MoneyInput
                value={form.operationalCost}
                onChange={(operationalCost) => setForm({ ...form, operationalCost })}
                required
              />
            </FormField>
            <FormField label="Lucro">
              <MoneyInput
                value={form.profit}
                onChange={(profit) => setForm({ ...form, profit })}
                required
              />
            </FormField>
          </div>

          <div className="rounded-2xl border border-charcoal/10 bg-beige/50 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Preço de venda</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-charcoal">
                  {formatCurrencyBRL(sellingPrice)}
                </p>
              </div>
              <p className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sage">
                {margin.toFixed(0)}% margem
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-tan to-gold"
                style={{ width: `${Math.min(100, margin)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-charcoal/45">
              Custo {formatCurrencyBRL(operationalCost)} + lucro {formatCurrencyBRL(profit)}
            </p>
          </div>

          {submitError ? <p className="text-sm text-burgundy">{submitError}</p> : null}
        </form>
      </Modal>
    </>
  );
}
