import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/utils/format";
import type { ToolDocument } from "@/types";

interface SavedDocumentsProps {
  title?: string;
  documents: Omit<ToolDocument, "data">[] | null;
  isLoading?: boolean;
  emptyMessage: string;
  subtitle?: (doc: Omit<ToolDocument, "data">) => string;
  /** Selo ao lado do título (ex.: "Visto há 2h" nas propostas). */
  badge?: (doc: Omit<ToolDocument, "data">) => ReactNode;
  onOpen: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Lista de documentos salvos de uma ferramenta, com o dono visível para o admin. */
export default function SavedDocuments({
  title = "Salvos",
  documents,
  isLoading,
  emptyMessage,
  subtitle,
  badge,
  onOpen,
  onDuplicate,
  onDelete,
}: SavedDocumentsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-charcoal">{title}</h2>
      {isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : !documents?.length ? (
        <p className="text-sm text-charcoal/55">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-charcoal/[0.08]">
          {documents.map((doc) => (
            <li key={doc._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-charcoal">{doc.title || "Sem título"}</p>
                  {badge?.(doc)}
                </div>
                <p className="text-xs text-charcoal/50">
                  {subtitle ? `${subtitle(doc)} • ` : ""}atualizado {formatDateTime(doc.updatedAt)}
                  {isAdmin && doc.ownerName ? ` • ${doc.ownerName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary !py-1.5" onClick={() => onOpen(doc._id)}>
                  Continuar editando
                </button>
                {onDuplicate ? (
                  <button type="button" className="text-sm text-tan" onClick={() => onDuplicate(doc._id)}>
                    Duplicar
                  </button>
                ) : null}
                <button type="button" className="text-sm text-burgundy" onClick={() => onDelete(doc._id)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
