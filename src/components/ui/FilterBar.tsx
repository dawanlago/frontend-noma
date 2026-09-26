import type { ReactNode } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterBarProps {
  /** Filtros (selects, pílulas...). */
  children?: ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  /** Resumo do resultado, ex.: "12 negociações". */
  count?: string;
  chips?: FilterChip[];
}

/** Barra de filtros padrão: busca + filtros em linha, e abaixo o contador com os filtros ativos removíveis. */
export default function FilterBar({ children, search, count, chips = [] }: FilterBarProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        {search ? (
          <label className="relative block min-w-[220px] flex-1">
            <span className="sr-only">{search.placeholder}</span>
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
            <input
              className="input-search pl-9"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
            />
          </label>
        ) : null}
        {children ? <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:[&>*]:!w-48">{children}</div> : null}
      </div>
      {count || chips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {count ? <span className="rounded-md bg-charcoal/[0.06] px-2 py-1 text-xs font-semibold text-charcoal/70">{count}</span> : null}
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-md border border-charcoal/10 bg-white py-0.5 pl-2 pr-1 text-xs font-medium text-charcoal/75"
            >
              {chip.label}
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-charcoal/45 transition hover:bg-charcoal/[0.06] hover:text-charcoal"
                aria-label={`Remover filtro ${chip.label}`}
                onClick={chip.onRemove}
              >
                <HiOutlineXMark className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {chips.length > 1 ? (
            <button
              type="button"
              className="ml-1 text-xs font-semibold text-tan hover:underline"
              onClick={() => chips.forEach((chip) => chip.onRemove())}
            >
              Limpar tudo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
