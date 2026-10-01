import { useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import MoneyInput from "@/components/ui/MoneyInput";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { categoryCosts } from "@/lib/products";
import { resources } from "@/lib/resources";
import type { OptionItem } from "@/types";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

interface Line {
  label: string;
  value: string;
}

/**
 * Modelo de linhas de custo de uma categoria de produto (extra da lista "Categorias de produto").
 * Fica no `meta.costs` da opção e é sugerido ao escolher a categoria no cadastro do produto.
 */
export default function ProductCategoryCosts({ item, editable }: { item: OptionItem; editable: boolean }) {
  const { upsertOption } = useWorkspace();
  const saved = categoryCosts(item);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const summary = saved.length ? `${saved.length} custo${saved.length === 1 ? "" : "s"}` : "sem modelo";

  if (!editable) return <span className="shrink-0 text-xs text-charcoal/50">{summary}</span>;

  function open() {
    setError("");
    setLines(saved.length ? saved.map((line) => ({ label: line.label, value: line.value ? maskCurrencyBRL(line.value) : "" })) : [{ label: "", value: "" }]);
  }

  async function save() {
    if (!lines) return;
    const costs = lines.map((line) => ({ label: line.label.trim(), value: parseCurrencyBRL(line.value) })).filter((line) => line.label);
    setBusy(true);
    setError("");
    try {
      upsertOption(await resources.options.update(item._id, { meta: { ...(item.meta || {}), costs } }));
      setLines(null);
    } catch {
      setError("Não foi possível salvar o modelo.");
    } finally {
      setBusy(false);
    }
  }

  const setLine = (index: number, changes: Partial<Line>) => setLines((current) => (current || []).map((line, i) => (i === index ? { ...line, ...changes } : line)));

  return (
    <>
      <button type="button" className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs" aria-expanded={Boolean(lines)} onClick={() => (lines ? setLines(null) : open())}>
        Modelo de custos · {summary}
      </button>
      {lines ? (
        // Ocupa a linha inteira, abaixo do nome e das ações do item.
        <div className="order-last basis-full rounded-lg bg-beige/50 p-3">
          <p className="mb-2 text-xs text-charcoal/60">Linhas sugeridas ao cadastrar um produto de “{item.label}”. O valor é opcional (padrão da linha).</p>
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  className="input-search min-w-0 flex-1 !py-2"
                  value={line.label}
                  autoFocus={index === lines.length - 1 && !line.label}
                  aria-label="Nome do custo"
                  placeholder="Ex.: Captação"
                  onChange={(event) => setLine(index, { label: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void save();
                    }
                  }}
                />
                <div className="w-36 shrink-0">
                  <MoneyInput value={line.value} onChange={(value) => setLine(index, { value })} />
                </div>
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 shrink-0 hover:text-burgundy"
                  aria-label="Remover linha"
                  onClick={() => setLines((current) => (current || []).filter((_, i) => i !== index))}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-tan hover:underline" onClick={() => setLines((current) => [...(current || []), { label: "", value: "" }])}>
              <HiOutlinePlus className="h-3.5 w-3.5" /> Adicionar linha
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setLines(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => void save()} disabled={busy}>
                {busy ? "Salvando..." : "Salvar modelo"}
              </button>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs font-medium text-burgundy">{error}</p> : null}
        </div>
      ) : null}
    </>
  );
}
