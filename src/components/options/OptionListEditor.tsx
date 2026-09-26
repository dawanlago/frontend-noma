import { useState } from "react";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineCheck,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { OptionItem } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

interface OptionListEditorProps {
  list: string;
  /** Chamado depois de cadastrar uma opção nova (o atalho usa para selecioná-la). */
  onCreated?: (item: OptionItem) => void;
  autoFocus?: boolean;
  /** Ações extras por item (ex.: "Editar mensagens"). */
  renderExtra?: (item: OptionItem) => React.ReactNode;
}

/** Cadastro de uma lista de opções: usado em Configurações e no atalho dos formulários. */
export default function OptionListEditor({ list, onCreated, autoFocus, renderExtra }: OptionListEditorProps) {
  const { can } = useAuth();
  const { optionsOf, upsertOption, dropOption, reload } = useWorkspace();
  const canManage = can("configuracoes");
  const items = optionsOf(list);
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a opção."));
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    const text = label.trim();
    if (!text) return;
    void run(async () => {
      const item = await resources.options.create({ list, label: text });
      upsertOption(item);
      setLabel("");
      onCreated?.(item);
    });
  }

  function handleRename() {
    if (!editing || !editing.label.trim()) return;
    void run(async () => {
      upsertOption(await resources.options.update(editing.id, { label: editing.label.trim() }));
      setEditing(null);
    });
  }

  async function handleDelete(item: OptionItem) {
    if (!(await confirmDialog({ title: `Excluir a opção "${item.label}"?`, message: "Registros que já usam essa opção continuam com o texto salvo.", confirmLabel: "Excluir", danger: true }))) return;
    void run(async () => {
      await resources.options.remove(item._id);
      dropOption(item._id);
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((item) => item._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(async () => {
      await resources.options.reorder(list, ids);
      await reload("options");
    });
  }

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <input
          className="input-search"
          value={label}
          autoFocus={autoFocus}
          placeholder="Nova opção"
          onChange={(event) => setLabel(event.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy || !label.trim()}>
          Adicionar
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}

      <ul className="mt-4 divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/[0.08]">
        {items.length === 0 ? <li className="px-3 py-4 text-sm text-charcoal/50">Nenhuma opção cadastrada.</li> : null}
        {items.map((item, index) => (
          <li key={item._id} className="flex items-center gap-2 px-3 py-2">
            {editing?.id === item._id ? (
              <>
                <input
                  className="input-search !py-1.5"
                  value={editing.label}
                  autoFocus
                  onChange={(event) => setEditing({ id: item._id, label: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleRename();
                    }
                    if (event.key === "Escape") setEditing(null);
                  }}
                />
                <button type="button" className="btn-ghost h-8 w-8" aria-label="Salvar" onClick={handleRename}>
                  <HiOutlineCheck className="h-4 w-4" />
                </button>
                <button type="button" className="btn-ghost h-8 w-8" aria-label="Cancelar" onClick={() => setEditing(null)}>
                  <HiOutlineXMark className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-charcoal">{item.label}</span>
                {renderExtra?.(item)}
                {canManage ? (
                  <div className="flex shrink-0 items-center">
                    <button type="button" className="btn-ghost h-8 w-8" aria-label="Subir" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                      <HiOutlineArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-8 w-8"
                      aria-label="Descer"
                      disabled={busy || index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <HiOutlineArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-8 w-8"
                      aria-label="Renomear"
                      onClick={() => setEditing({ id: item._id, label: item.label })}
                    >
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir" onClick={() => handleDelete(item)}>
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
