import { useEffect, useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Product } from "@/types";
import { formatCurrencyBRL, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

interface ProductFormProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

/** Cadastro de produto (custo + lucro = preço de venda). */
export default function ProductForm({ open, product, onClose, onSaved }: ProductFormProps) {
  const [form, setForm] = useState({ name: "", description: "", operationalCost: "", profit: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name,
            description: product.description || "",
            operationalCost: maskCurrencyBRL(product.operationalCost),
            profit: maskCurrencyBRL(product.profit),
          }
        : { name: "", description: "", operationalCost: "", profit: "" },
    );
    setError("");
  }, [open, product]);

  const operationalCost = parseCurrencyBRL(form.operationalCost);
  const profit = parseCurrencyBRL(form.profit);
  const sellingPrice = operationalCost + profit;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), operationalCost, profit };
      onSaved(product ? await resources.products.update(product._id, payload) : await resources.products.create(payload));
    } catch (err) {
      setError(apiError(err, "Erro ao salvar produto."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
        variant="drawer"
      open={open}
      title={product ? "Editar produto" : "Novo produto"}
      description="Monte a oferta com custo, margem e o preço que entra nas negociações."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-gold" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Salvando..." : product ? "Salvar alterações" : "Criar produto"}
          </button>
        </>
      }
    >
      <form
        className="space-y-1"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <FormField label="Nome da oferta" hint="Como o produto aparece nas negociações.">
          <input
            className="input-search"
            value={form.name}
            autoFocus
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Vídeo de posicionamento"
          />
        </FormField>
        <FormField label="Descrição" hint="O que está incluso, formato, prazo... Aparece ao escolher o produto na negociação.">
          <textarea
            className="input-search min-h-[80px] resize-y"
            value={form.description}
            placeholder="Ex.: 1 vídeo de até 90s, roteiro, 1 diária de gravação, 2 revisões"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Custo operacional">
            <MoneyInput value={form.operationalCost} onChange={(value) => setForm({ ...form, operationalCost: value })} />
          </FormField>
          <FormField label="Lucro">
            <MoneyInput value={form.profit} onChange={(value) => setForm({ ...form, profit: value })} />
          </FormField>
        </div>
        <div className="rounded-2xl border border-charcoal/10 bg-beige/50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Preço de venda</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-charcoal">{formatCurrencyBRL(sellingPrice)}</p>
            </div>
            <p className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-sage">{margin.toFixed(0)}% margem</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-gradient-to-r from-tan to-gold" style={{ width: `${Math.min(100, margin)}%` }} />
          </div>
        </div>
        {error ? <p className="text-sm text-burgundy">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
