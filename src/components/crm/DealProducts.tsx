import { useRef, useState, type KeyboardEvent } from "react";
import { HiOutlineChevronDown, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import EntityPicker from "@/components/base/EntityPicker";
import MoneyInput from "@/components/ui/MoneyInput";
import { productPrice } from "@/lib/crm/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { LeadProduct, Product } from "@/types";
import { formatCurrencyBRL, maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

interface DealProductsProps {
  /** Produtos da negociação. */
  value: LeadProduct[];
  onChange: (value: LeadProduct[]) => void;
  /** Produtos cadastrados (catálogo). */
  catalog: Product[];
  /** Produto novo salvo no catálogo a partir daqui. */
  onCatalogAdd: (product: Product) => void;
  /** Versão estreita (assistente de nova negociação). */
  compact?: boolean;
}

const EMPTY_DRAFT = { name: "", price: "", save: true };

/**
 * Produtos da negociação, tudo no próprio formulário: cada linha abre no lugar para ajustar
 * nome, descrição e preço só desta negociação, e o produto novo é um formulário curto na lista
 * (sem abrir outro painel por cima).
 */
export default function DealProducts({ value, onChange, catalog, onCatalogAdd, compact }: DealProductsProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY_DRAFT | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const newButton = useRef<HTMLButtonElement>(null);

  const patch = (index: number, changes: Partial<LeadProduct>) => onChange(value.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  function addFromCatalog(productId: string) {
    const product = catalog.find((item) => item._id === productId);
    if (!product) return;
    onChange([...value, { productId: product._id, name: product.name, description: product.description || "", price: productPrice(product) }]);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setExpanded((current) => (current === null || current === index ? null : current > index ? current - 1 : current));
  }

  function closeDraft() {
    setDraft(null);
    setError("");
    window.setTimeout(() => newButton.current?.focus(), 0);
  }

  async function addDraft() {
    if (!draft || busy) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Dê um nome ao produto.");
      return;
    }
    const price = parseCurrencyBRL(draft.price);
    setBusy(true);
    setError("");
    try {
      let productId: string | undefined;
      if (draft.save) {
        // Entra no catálogo só com o preço; custo e margem são detalhados depois, em Produtos.
        const product = await resources.products.create({ name, costs: [], profit: price });
        onCatalogAdd(product);
        productId = product._id;
      }
      onChange([...value, { productId, name, description: "", price }]);
      closeDraft();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o produto no catálogo."));
    } finally {
      setBusy(false);
    }
  }

  // Dentro do formulário da negociação: Enter adiciona o produto (não envia a negociação); Esc cancela.
  function draftKeys(event: KeyboardEvent) {
    if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      event.stopPropagation();
      void addDraft();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDraft();
    }
  }

  const priceWidth = compact ? "w-32" : "w-40";

  return (
    <div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <EntityPicker
            items={catalog.map((product) => ({
              id: product._id,
              label: product.name,
              sublabel: [formatCurrencyBRL(productPrice(product)), product.description].filter(Boolean).join(" · "),
            }))}
            value=""
            onChange={addFromCatalog}
            placeholder="Adicionar produto do catálogo"
            showAvatar={false}
          />
        </div>
        <button
          ref={newButton}
          type="button"
          className="btn-secondary shrink-0 !px-3 !py-2 text-xs"
          aria-expanded={Boolean(draft)}
          onClick={() => (draft ? closeDraft() : setDraft(EMPTY_DRAFT))}
        >
          <HiOutlinePlus className="h-3.5 w-3.5" /> Novo{compact ? "" : " produto"}
        </button>
      </div>

      {value.length || draft ? (
        <ul className="mt-3 divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
          {value.map((item, index) => {
            const open = expanded === index;
            const source = catalog.find((product) => product._id === item.productId);
            const listPrice = source ? productPrice(source) : null;
            return (
              <li key={`${item.productId || "avulso"}-${index}`}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-tan/30"
                    aria-expanded={open}
                    title={open ? "Fechar detalhes" : "Ver e ajustar nome e descrição"}
                    onClick={() => setExpanded(open ? null : index)}
                  >
                    <HiOutlineChevronDown className={`h-3.5 w-3.5 shrink-0 text-charcoal/40 transition ${open ? "rotate-180" : ""}`} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-charcoal">{item.name}</span>
                      {!open && item.description ? <span className="block truncate text-xs text-charcoal/50">{item.description}</span> : null}
                    </span>
                  </button>
                  <div className={`${priceWidth} shrink-0`}>
                    <MoneyInput value={item.price ? maskCurrencyBRL(item.price) : ""} onChange={(price) => patch(index, { price: parseCurrencyBRL(price) })} />
                  </div>
                  <button type="button" className="btn-ghost h-8 w-8 shrink-0 hover:text-burgundy" aria-label={`Remover ${item.name}`} onClick={() => remove(index)}>
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-2 bg-beige/50 px-3 pb-3 pt-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-charcoal/70">Nome nesta negociação</span>
                      <input
                        className="input-search !py-2"
                        value={item.name}
                        autoFocus
                        onChange={(event) => patch(index, { name: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.preventDefault();
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-charcoal/70">Descrição</span>
                      <textarea
                        className="input-search min-h-[64px] resize-y !py-2"
                        value={item.description || ""}
                        placeholder="O que está incluso para este cliente"
                        onChange={(event) => patch(index, { description: event.target.value })}
                      />
                    </label>
                    <p className="text-xs text-charcoal/50">
                      {source ? (
                        <>
                          Catálogo: {source.name} · <span data-money>{formatCurrencyBRL(listPrice || 0)}</span>
                          {listPrice !== item.price || source.name !== item.name || (source.description || "") !== (item.description || "") ? (
                            <>
                              {" · "}
                              <button
                                type="button"
                                className="font-semibold text-tan hover:underline"
                                onClick={() => patch(index, { name: source.name, description: source.description || "", price: listPrice || 0 })}
                              >
                                Voltar ao do catálogo
                              </button>
                            </>
                          ) : null}
                        </>
                      ) : (
                        "Item avulso: vale só para esta negociação. As alterações aqui não mudam o catálogo."
                      )}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}

          {draft ? (
            <li className="bg-tan/[0.04] px-3 py-3" onKeyDown={draftKeys}>
              <div className="flex items-center gap-2">
                <input
                  className="input-search min-w-0 flex-1 !py-2"
                  value={draft.name}
                  autoFocus
                  aria-label="Nome do novo produto"
                  placeholder="Nome do novo produto"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
                <div className={`${priceWidth} shrink-0`}>
                  <MoneyInput value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-charcoal/70" title="Fica disponível para as próximas negociações. Custo e margem você detalha depois, em Produtos.">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-charcoal/30 accent-[hsl(var(--c-tan))]"
                    checked={draft.save}
                    onChange={(event) => setDraft({ ...draft, save: event.target.checked })}
                  />
                  Salvar no catálogo
                </label>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={closeDraft} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => void addDraft()} disabled={busy || !draft.name.trim()}>
                    {busy ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
              {error ? <p className="mt-2 text-xs font-medium text-burgundy">{error}</p> : null}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
