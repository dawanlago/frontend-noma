import { useMemo, useState } from "react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { formatDate } from "@/utils/format";

interface StartFromProposalProps {
  /** Clique numa proposta: cria a cópia e abre (quem chama trata erro e carregamento). */
  onPick: (id: string) => void;
  busyId?: string;
  emptyMessage?: string;
}

/** Lista das propostas salvas para usar uma como base ("Começar de uma proposta anterior"). */
export default function StartFromProposal({ onPick, busyId = "", emptyMessage = "Nenhuma proposta salva ainda." }: StartFromProposalProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAsyncData(() => resources.tools.proposals.list(), []);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || []).filter((doc) => !term || (doc.title || "").toLowerCase().includes(term)).slice(0, 30);
  }, [data, search]);

  if (isLoading) return <div className="skeleton h-32" />;
  if (!data?.length) return <p className="text-sm text-charcoal/55">{emptyMessage}</p>;

  return (
    <div className="space-y-3">
      {data.length > 6 ? (
        <input
          className="input-search"
          placeholder="Buscar pelo cliente…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar proposta"
        />
      ) : null}
      <ul className="max-h-[50vh] divide-y divide-charcoal/[0.08] overflow-y-auto rounded-xl border border-charcoal/[0.08]">
        {filtered.map((doc) => (
          <li key={doc._id}>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => onPick(doc._id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-beige disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-charcoal">{doc.title || "Sem título"}</span>
                <span className="block text-xs text-charcoal/50">
                  Atualizada em {formatDate(doc.updatedAt)}
                  {doc.ownerName ? ` · ${doc.ownerName}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-tan">{busyId === doc._id ? "Copiando…" : "Usar como base"}</span>
            </button>
          </li>
        ))}
        {!filtered.length ? <li className="px-4 py-3 text-sm text-charcoal/55">Nenhuma proposta encontrada.</li> : null}
      </ul>
      <p className="text-xs text-charcoal/50">
        A cópia mantém empresa, portfólio, investimento e visual; o cliente e a data começam de novo.
      </p>
    </div>
  );
}
