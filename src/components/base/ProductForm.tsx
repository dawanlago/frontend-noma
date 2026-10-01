import { useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import OptionSelect from "@/components/options/OptionSelect";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { categoryCosts, costsTotal, PRODUCT_CATEGORY_LIST, productCosts } from "@/lib/products";
import { resources } from "@/lib/resources";
import type { Product, ProductCost } from "@/types";
import { formatCurrencyBRL, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

interface ProductFormProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

/** Linha de custo no formulário (valor mascarado "1.234,56"). */
interface CostLine {
  label: string;
  value: string;
}

const toLines = (costs: ProductCost[]): CostLine[] => costs.map((item) => ({ label: item.label, value: item.value ? maskCurrencyBRL(item.value) : "" }));
const fromLines = (lines: CostLine[]): ProductCost[] =>
  lines.map((item) => ({ label: item.label.trim(), value: parseCurrencyBRL(item.value) })).filter((item) => item.label || item.value > 0);

/** Cadastro de produto (linhas de custo + lucro = preço de venda). */
export default function ProductForm({ open, product, onClose, onSaved }: ProductFormProps) {
  const { can } = useAuth();
  const { optionsOf, upsertOption } = useWorkspace();
  const [form, setForm] = useState({ name: "", description: "", category: "", profit: "" });
  const [lines, setLines] = useState<CostLine[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? { name: product.name, description: product.description || "", category: product.category || "", profit: maskCurrencyBRL(product.profit) }
        : { name: "", description: "", category: "", profit: "" },
    );
    setLines(product ? toLines(productCosts(product)) : []);
    setError("");
    setNotice("");
  }, [open, product]);

  const categoryOption = optionsOf(PRODUCT_CATEGORY_LIST).find((item) => item.value === form.category);
  const template = categoryCosts(categoryOption);
  const costs = fromLines(lines);
  const operationalCost = costsTotal(costs);
  const profit = parseCurrencyBRL(form.profit);
  const sellingPrice = operationalCost + profit;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const hasValues = costs.some((item) => item.value > 0);

  const applyTemplate = (source: ProductCost[]) => setLines(toLines(source));

  function pickCategory(category: string) {
    setForm((current) => ({ ...current, category }));
    setNotice("");
    // Sem valores digitados ainda: já entra com as linhas de custo da categoria.
    const next = categoryCosts(optionsOf(PRODUCT_CATEGORY_LIST).find((item) => item.value === category));
    if (!hasValues && next.length) applyTemplate(next);
  }

  const setLine = (index: number, changes: Partial<CostLine>) => setLines((current) => current.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  /** Guarda as linhas atuais (nomes e valores) como modelo da categoria. */
  async function saveTemplate() {
    if (!categoryOption) return;
    setError("");
    try {
      upsertOption(await resources.options.update(categoryOption._id, { meta: { ...(categoryOption.meta || {}), costs } }));
      setNotice(`Modelo de custos de "${categoryOption.label}" atualizado.`);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o modelo da categoria."));
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), category: form.category, costs, profit };
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
        <FormField label="Categoria" hint="Cada categoria traz o seu modelo de linhas de custo.">
          <OptionSelect list={PRODUCT_CATEGORY_LIST} value={form.category} emptyLabel="Sem categoria" onChange={pickCategory} />
        </FormField>
        <FormField label="Descrição" hint="O que está incluso, formato, prazo... Aparece ao escolher o produto na negociação.">
          <textarea
            className="input-search min-h-[80px] resize-y"
            value={form.description}
            placeholder="Ex.: 1 vídeo de até 90s, roteiro, 1 diária de gravação, 2 revisões"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>

        <div className="mb-4 rounded-xl border border-charcoal/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-charcoal">Custos</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
              {template.length ? (
                <button type="button" className="text-tan hover:underline" onClick={() => applyTemplate(template)}>
                  Usar modelo de {categoryOption?.label}
                </button>
              ) : null}
              {categoryOption && costs.length && can("configuracoes") ? (
                <button type="button" className="text-tan hover:underline" title="As linhas abaixo passam a ser sugeridas nos próximos produtos desta categoria" onClick={() => void saveTemplate()}>
                  Salvar como modelo
                </button>
              ) : null}
            </div>
          </div>
          {lines.length ? (
            <ul className="mt-3 space-y-2">
              {lines.map((line, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    className="input-search min-w-0 flex-1 !py-2"
                    value={line.label}
                    aria-label="Nome do custo"
                    placeholder="Ex.: Captação, edição, deslocamento"
                    onChange={(event) => setLine(index, { label: event.target.value })}
                  />
                  <div className="w-36 shrink-0">
                    <MoneyInput value={line.value} onChange={(value) => setLine(index, { value })} />
                  </div>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 shrink-0 hover:text-burgundy"
                    aria-label="Remover custo"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-charcoal/50">Nenhum custo lançado. Escolha uma categoria para trazer o modelo dela ou adicione as linhas.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-tan hover:underline" onClick={() => setLines((current) => [...current, { label: "", value: "" }])}>
              <HiOutlinePlus className="h-3.5 w-3.5" /> Adicionar custo
            </button>
            <p className="text-sm text-charcoal/60">
              Custo operacional <strong className="ml-1 tabular-nums text-charcoal">{formatCurrencyBRL(operationalCost)}</strong>
            </p>
          </div>
          {notice ? <p className="mt-2 text-xs font-medium text-sage">{notice}</p> : null}
        </div>

        <FormField label="Lucro">
          <MoneyInput value={form.profit} onChange={(value) => setForm({ ...form, profit: value })} />
        </FormField>
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
