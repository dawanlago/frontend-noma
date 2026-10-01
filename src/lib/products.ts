import type { OptionItem, Product, ProductCost } from "@/types";

/** Lista de opções com as categorias de produto (Configurações → Listas de opções → Categorias de produto). */
export const PRODUCT_CATEGORY_LIST = "productCategory";

export const DEFAULT_COST_LABEL = "Custo operacional";

function cleanLines(input: unknown): ProductCost[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as Partial<ProductCost> | null)
    .map((item) => ({ label: String(item?.label || "").trim(), value: Math.max(0, Number(item?.value) || 0) }))
    .filter((item) => item.label || item.value > 0);
}

/** Modelo de linhas de custo da categoria, guardado no `meta.costs` da opção. */
export function categoryCosts(option?: Pick<OptionItem, "meta"> | null): ProductCost[] {
  return cleanLines(option?.meta?.costs);
}

/** Linhas de custo do produto; os de antes (só com o total) aparecem como uma linha única. */
export function productCosts(product: Pick<Product, "costs" | "operationalCost">): ProductCost[] {
  const lines = cleanLines(product.costs);
  if (lines.length) return lines;
  return product.operationalCost > 0 ? [{ label: DEFAULT_COST_LABEL, value: product.operationalCost }] : [];
}

export function costsTotal(lines: Pick<ProductCost, "value">[]) {
  return Math.round(lines.reduce((total, item) => total + (Number(item.value) || 0), 0) * 100) / 100;
}
