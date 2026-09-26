import { useMemo, useState } from "react";
import Head from "next/head";
import ProductForm from "@/components/base/ProductForm";
import ListWorkspace from "@/components/ui/ListWorkspace";
import { useAsyncData } from "@/hooks/useAsyncData";
import { productPrice } from "@/lib/crm/model";
import { resources } from "@/lib/resources";
import { formatCurrencyBRL } from "@/utils/format";
import type { Product } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

export default function ProductsPage() {
  const { data: products, isLoading, error, reload } = useAsyncData(() => resources.products.list());
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products || [];
    return (products || []).filter((item) => item.name.toLowerCase().includes(term));
  }, [products, search]);

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
        columns={["Produto", "Custo operacional", "Lucro", "Preço de venda", "Ações"]}
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
                <td className="px-4 py-3">{formatCurrencyBRL(product.operationalCost)}</td>
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
