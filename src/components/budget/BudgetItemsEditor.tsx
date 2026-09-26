import { useState } from "react";
import Link from "next/link";
import Menu from "@mui/material/Menu";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineBookmark,
  HiOutlineCog6Tooth,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi2";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { itemTotal } from "@/lib/budget/calc";
import { BUDGET_ITEM_LIST, catalogDefaults, itemFromCatalog } from "@/lib/budget/catalog";
import { BUDGET_UNITS, newItem, type BudgetItem } from "@/lib/budget/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import { formatCurrencyBRL } from "@/utils/format";
import { CurrencyInput, NumberInput } from "./NumberInput";

interface BudgetItemsEditorProps {
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
}

function unitOptions(current: string) {
  const units: string[] = [...BUDGET_UNITS];
  if (current && !units.includes(current)) units.push(current);
  return units.map((unit) => ({ value: unit, label: unit }));
}

/** Lista editável de profissionais e custos (assistente, fotógrafa, deslocamento...). */
export default function BudgetItemsEditor({ items, onChange }: BudgetItemsEditorProps) {
  const { can } = useAuth();
  const { optionsOf, upsertOption } = useWorkspace();
  const canManage = can("configuracoes");
  const catalog = optionsOf(BUDGET_ITEM_LIST);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const total = items.reduce((sum, item) => sum + itemTotal(item), 0);

  function patch(id: string, changes: Partial<BudgetItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add(item: BudgetItem) {
    onChange([...items, item]);
    setAnchor(null);
  }

  const inCatalog = (name: string) => catalog.some((option) => option.label.toLowerCase() === name.trim().toLowerCase());

  async function saveToCatalog(item: BudgetItem) {
    setMessage("");
    try {
      const option = await resources.options.create({
        list: BUDGET_ITEM_LIST,
        label: item.name.trim(),
        meta: { unit: item.unit, value: item.unitValue },
      });
      upsertOption(option);
      setMessage(`“${option.label}” salvo no catálogo.`);
    } catch (err) {
      setMessage(apiError(err, "Não foi possível salvar no catálogo."));
    }
  }

  return (
    <div className="space-y-3">
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border border-charcoal/[0.08] bg-surface p-3">
              <div className="flex items-center gap-1.5">
                <input
                  className="input-search"
                  value={item.name}
                  placeholder="Ex.: Assistente, Fotógrafa, Storymaker"
                  aria-label="Nome do item"
                  onChange={(event) => patch(item.id, { name: event.target.value })}
                />
                {canManage && item.name.trim() && !inCatalog(item.name) ? (
                  <button
                    type="button"
                    className="btn-ghost h-9 w-9 shrink-0"
                    title="Salvar no catálogo de itens"
                    aria-label={`Salvar ${item.name} no catálogo`}
                    onClick={() => void saveToCatalog(item)}
                  >
                    <HiOutlineBookmark className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 shrink-0"
                  aria-label="Subir"
                  title="Subir"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <HiOutlineArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 shrink-0"
                  aria-label="Descer"
                  title="Descer"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <HiOutlineArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 shrink-0 hover:text-burgundy"
                  aria-label={`Remover ${item.name || "item"}`}
                  title="Remover"
                  onClick={() => onChange(items.filter((current) => current.id !== item.id))}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-[100px_140px_minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <span className="mb-1 block text-xs font-medium text-charcoal/55">Quantidade</span>
                  <NumberInput value={item.quantity} onChange={(quantity) => patch(item.id, { quantity })} />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-charcoal/55">Unidade</span>
                  <Select value={item.unit} onChange={(unit) => patch(item.id, { unit })} options={unitOptions(item.unit)} />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-charcoal/55">Valor por {item.unit || "unidade"}</span>
                  <CurrencyInput value={item.unitValue} onChange={(unitValue) => patch(item.id, { unitValue })} />
                </div>
                <div className="text-right">
                  <span className="mb-1 block text-xs font-medium text-charcoal/55">Total</span>
                  <p className="py-2 text-sm font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(itemTotal(item))}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-muted px-4 py-3 text-sm text-charcoal/55">Nenhum profissional ou custo neste projeto.</p>
      )}

      {message ? <p className="text-xs font-medium text-charcoal/60">{message}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/[0.08] pt-3">
        <button
          type="button"
          className="btn-secondary !py-2"
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          + Adicionar item
        </button>
        <p className="text-sm text-charcoal/55">
          Total: <span className="font-semibold text-charcoal">{formatCurrencyBRL(total)}</span>
        </p>
      </div>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 320, maxHeight: 440, mt: 0.75 } }, list: { sx: { py: 0 } } }}
        autoFocus={false}
      >
        <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/40">Do catálogo</p>
        <ul className="pb-1">
          {catalog.map((option) => {
            const defaults = catalogDefaults(option);
            return (
              <li key={option._id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-beige"
                  onClick={() => add(itemFromCatalog(option))}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-charcoal">{option.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-charcoal/50">
                    {formatCurrencyBRL(defaults.value)}/{defaults.unit}
                  </span>
                </button>
              </li>
            );
          })}
          {!catalog.length ? <li className="px-4 py-2 text-sm text-charcoal/50">Nenhum item no catálogo ainda.</li> : null}
        </ul>
        <div className="border-t border-charcoal/[0.06] p-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-charcoal/80 hover:bg-beige"
            onClick={() => add(newItem())}
          >
            <HiOutlinePencil className="h-4 w-4" /> Item livre (digitar)
          </button>
          {canManage ? (
            <Link
              href={`/configuracoes/opcoes?lista=${BUDGET_ITEM_LIST}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-charcoal/70 hover:bg-beige hover:text-charcoal"
              onClick={() => setAnchor(null)}
            >
              <HiOutlineCog6Tooth className="h-4 w-4" /> Gerenciar catálogo
            </Link>
          ) : null}
        </div>
      </Menu>
    </div>
  );
}
