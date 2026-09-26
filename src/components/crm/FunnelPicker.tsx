import { useMemo, useState } from "react";
import Link from "next/link";
import Menu from "@mui/material/Menu";
import { HiCheck, HiChevronDown, HiOutlineCog6Tooth, HiOutlineFunnel, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import type { Funnel } from "@/types";

interface FunnelPickerProps {
  funnels: Funnel[];
  value: string;
  /** Negociações em aberto por funil. */
  counts: Record<string, number>;
  canManage: boolean;
  onChange: (funnelId: string) => void;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Seletor de funil do CRM: botão em destaque com a lista de todos os funis e quantas negociações abertas cada um tem. */
export default function FunnelPicker({ funnels, value, counts, canManage, onChange }: FunnelPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const current = funnels.find((item) => item._id === value);
  const visible = useMemo(() => {
    const term = normalize(search.trim());
    return term ? funnels.filter((item) => normalize(item.name).includes(term)) : funnels;
  }, [funnels, search]);

  function close() {
    setAnchor(null);
    setSearch("");
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        className="group flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-charcoal/10 bg-surface py-2 pl-3 pr-3 text-left shadow-soft transition hover:border-tan/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tan/10 text-tan">
          <HiOutlineFunnel className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/45">
            Funil · {funnels.length} {funnels.length === 1 ? "funil" : "funis"}
          </span>
          <span className="block truncate text-[15px] font-semibold text-charcoal">{current?.name || "Escolha o funil"}</span>
        </span>
        <HiChevronDown className={`h-4 w-4 shrink-0 text-charcoal/45 transition ${anchor ? "rotate-180" : ""}`} />
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 460, mt: 0.75 } }, list: { sx: { py: 0 } } }}
        autoFocus={false}
      >
        {funnels.length > 5 ? (
          <div className="border-b border-charcoal/[0.06] p-2" onKeyDown={(event) => event.stopPropagation()}>
            <label className="relative block">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
              <input
                className="input-search !py-2 pl-9 text-sm"
                placeholder="Buscar funil"
                value={search}
                autoFocus
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        ) : null}
        <ul role="listbox" className="py-1">
          {visible.map((item) => {
            const active = item._id === value;
            return (
              <li key={item._id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-beige ${active ? "bg-tan/[0.06]" : ""}`}
                  onClick={() => {
                    onChange(item._id);
                    close();
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${active ? "font-semibold text-tan" : "font-medium text-charcoal"}`}>{item.name}</span>
                    <span className="block text-xs text-charcoal/50">
                      {counts[item._id] || 0} em aberto · {item.stages.length} etapas
                    </span>
                  </span>
                  {active ? <HiCheck className="h-4 w-4 shrink-0 text-tan" /> : null}
                </button>
              </li>
            );
          })}
          {!visible.length ? <li className="px-4 py-3 text-sm text-charcoal/50">Nenhum funil encontrado.</li> : null}
        </ul>
        {canManage ? (
          <div className="border-t border-charcoal/[0.06] p-1">
            <Link
              href="/configuracoes/funis"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-charcoal/70 hover:bg-beige hover:text-charcoal"
              onClick={close}
            >
              <HiOutlineCog6Tooth className="h-4 w-4" /> Gerenciar funis
            </Link>
          </div>
        ) : null}
      </Menu>
    </>
  );
}
