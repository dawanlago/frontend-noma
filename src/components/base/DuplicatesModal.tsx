import { useEffect, useState } from "react";
import Link from "next/link";
import { confirmDialog } from "@/components/ui/DialogHost";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { DuplicateGroup } from "@/types";
import { formatDate } from "@/utils/format";
import EntityAvatar from "./Avatar";

const FIELD_LABELS = { phone: "telefone", email: "e-mail" };

interface DuplicatesModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado depois de cada mesclagem (para recarregar a lista de trás). */
  onMerged?: () => void;
}

/** Possíveis duplicados: contatos com o mesmo telefone ou e-mail, com a ação de mesclar. */
export default function DuplicatesModal({ open, onClose, onMerged }: DuplicatesModalProps) {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [error, setError] = useState("");
  const [merging, setMerging] = useState("");

  function load() {
    resources.contacts
      .duplicates()
      .then(setGroups)
      .catch((err) => {
        setGroups([]);
        setError(apiError(err, "Não foi possível buscar os duplicados."));
      });
  }

  useEffect(() => {
    if (!open) return;
    setGroups(null);
    setError("");
    load();
  }, [open]);

  /** Mantém `keepId` e mescla nele os outros contatos do grupo. */
  async function merge(group: DuplicateGroup, keepId: string) {
    const keep = group.contacts.find((contact) => contact._id === keepId);
    const others = group.contacts.filter((contact) => contact._id !== keepId);
    if (!keep) return;
    const confirmed = await confirmDialog({
      title: `Mesclar em ${keep.name}?`,
      message: `${others.map((contact) => contact.name).join(", ")} ${others.length > 1 ? "serão excluídos" : "será excluído"}: negociações, financeiro, arquivos, NPS, formulários e relações passam para ${keep.name}, e os campos vazios são preenchidos. Não dá para desfazer.`,
      confirmLabel: "Mesclar",
      danger: true,
    });
    if (!confirmed) return;
    setMerging(group.key);
    setError("");
    try {
      for (const other of others) await resources.contacts.merge(keepId, other._id);
      onMerged?.();
    } catch (err) {
      setError(apiError(err, "Não foi possível mesclar os contatos."));
    } finally {
      setMerging("");
      load();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Possíveis duplicados"
      description="Contatos com o mesmo telefone ou e-mail. Escolha qual manter: os outros são mesclados nele."
    >
      {error ? <p className="mb-3 text-sm font-medium text-burgundy">{error}</p> : null}
      {groups === null ? (
        <div className="skeleton h-24" />
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-charcoal/50">Nenhum contato duplicado encontrado.</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.key} className="rounded-xl border border-charcoal/[0.08] bg-surface p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/45">
                Mesmo {group.fields.map((field) => FIELD_LABELS[field]).join(" e ") || "contato"}
              </p>
              <ul className="divide-y divide-charcoal/[0.06]">
                {group.contacts.map((contact) => (
                  <li key={contact._id} className="flex flex-wrap items-center gap-3 py-2">
                    <EntityAvatar name={contact.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/contatos/${contact._id}`} target="_blank" className="block truncate text-sm font-semibold text-charcoal hover:text-tan">
                        {contact.name}
                      </Link>
                      <p className="truncate text-xs text-charcoal/55">
                        {[contact.phone, contact.email].filter(Boolean).join(" · ") || "Sem telefone/e-mail"}
                      </p>
                      <p className="truncate text-xs text-charcoal/40">
                        Criado em {formatDate(contact.createdAt)} · {contact.leadsCount} negociaç{contact.leadsCount === 1 ? "ão" : "ões"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary !py-1.5 text-xs"
                      disabled={Boolean(merging)}
                      onClick={() => void merge(group, contact._id)}
                    >
                      {merging === group.key ? "Mesclando..." : "Manter este e mesclar"}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
