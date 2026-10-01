import { useMemo, useState } from "react";
import Head from "next/head";
import ProductForm from "@/components/base/ProductForm";
import OptionSelect from "@/components/options/OptionSelect";
import ListWorkspace from "@/components/ui/ListWorkspace";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { productPrice } from "@/lib/crm/model";
import { PRODUCT_CATEGORY_LIST, productCosts } from "@/lib/products";
import { resources } from "@/lib/resources";
import { formatCurrencyBRL } from "@/utils/format";
import type { Product } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

export default function ProductsPage() {
  const { data: products, isLoading, error, reload } = useAsyncData(() => resources.products.list());
  const { labelOf } = useWorkspace();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products || []).filter(
      (item) => (!category || item.category === category) && (!term || item.name.toLowerCase().includes(term)),
    );
  }, [products, search, category]);

  async function handleDelete(product: Product) {
    if (!(await confirmDialog({ title: `Excluir o produto ${product.name}?`, message: "Negociações que já usam o produto mantêm o nome e o valor salvos.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.products.remove(product._id);
    await reload();
  }

  return (
    <>
      <Head>
        <title>Produtos | Noma</title>
      </Head>
      <ListWorkspace
        title="Produtos"
        actionLabel="Inserir produto"
        onAction={() => setModal({ open: true, product: null })}
        countLabel={`Existem ${filtered.length} produtos na sua base`}
        columns={["Produto", "Categoria", "Custo operacional", "Lucro", "Preço de venda", "Ações"]}
        filters={
          <div className="w-48 shrink-0">
            <OptionSelect list={PRODUCT_CATEGORY_LIST} noAdd value={category} emptyLabel="Todas as categorias" onChange={setCategory} />
          </div>
        }
        emptyMessage="Não existem produtos salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.length
          ? filtered.map((product) => (
              <tr key={product._id} className="border-t border-charcoal/5">
                <td className="max-w-[360px] px-4 py-3">
                  <span className="font-medium">{product.name}</span>
                  {product.description ? <span className="block truncate text-xs text-charcoal/50">{product.description}</span> : null}
                </td>
                <td className="px-4 py-3">
                  {product.category ? (
                    <span className="chip bg-tan/10 text-tan">{labelOf(PRODUCT_CATEGORY_LIST, product.category)}</span>
                  ) : (
                    <span className="text-charcoal/35">—</span>
                  )}
                </td>
                <td
                  className="px-4 py-3"
                  title={productCosts(product)
                    .map((line) => `${line.label}: ${formatCurrencyBRL(line.value)}`)
                    .join("\n")}
                >
                  {formatCurrencyBRL(product.operationalCost)}
                  {productCosts(product).length > 1 ? <span className="block text-xs text-charcoal/50">{productCosts(product).length} linhas de custo</span> : null}
                </td>
                <td className="px-4 py-3">{formatCurrencyBRL(product.profit)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrencyBRL(productPrice(product))}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="text-sm text-tan" onClick={() => setModal({ open: true, product })}>
                      Editar
                    </button>
                    <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(product)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))
          : null}
      </ListWorkspace>

      <ProductForm
        open={modal.open}
        product={modal.product}
        onClose={() => setModal({ open: false, product: null })}
        onSaved={() => {
          setModal({ open: false, product: null });
          void reload();
        }}
      />
    </>
  );
}
