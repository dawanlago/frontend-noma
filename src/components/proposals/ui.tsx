import { useEffect, useRef, useState, type ReactNode } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { ProposalData } from "@/lib/proposals/model";

export type SetProposal = (updater: (current: ProposalData) => ProposalData) => void;

export interface StepProps {
  data: ProposalData;
  setData: SetProposal;
}

type ObjectKeys = { [K in keyof ProposalData]: ProposalData[K] extends unknown[] ? never : K }[keyof ProposalData];

/** Atualiza parcialmente uma seção do documento (company, client, ...). */
export function patchSection<K extends ObjectKeys>(setData: SetProposal, key: K, patch: Partial<ProposalData[K]>) {
  setData((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      className="input-search"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className="input-search resize-y leading-6"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${
        checked ? "border-tan/40 bg-tan/[0.05]" : "border-charcoal/10 bg-beige/60"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-charcoal">{label}</span>
        {description ? <span className="mt-0.5 block text-[13px] text-charcoal/55">{description}</span> : null}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition ${
          checked ? "bg-tan" : "bg-charcoal/20"
        }`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-surface shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function SmallIconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-charcoal/10 bg-surface transition disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === "danger" ? "text-burgundy hover:bg-burgundy/10" : "text-charcoal/60 hover:bg-beige hover:text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}

export function MoveControls({
  index,
  length,
  onMove,
  onRemove,
  removeLabel = "Remover",
}: {
  index: number;
  length: number;
  onMove: (to: number) => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex flex-none gap-1">
      <SmallIconButton label="Mover para cima" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUpwardRounded sx={{ fontSize: 17 }} />
      </SmallIconButton>
      <SmallIconButton label="Mover para baixo" disabled={index === length - 1} onClick={() => onMove(index + 1)}>
        <ArrowDownwardRounded sx={{ fontSize: 17 }} />
      </SmallIconButton>
      {onRemove ? (
        <SmallIconButton label={removeLabel} tone="danger" onClick={onRemove}>
          <CloseRounded sx={{ fontSize: 17 }} />
        </SmallIconButton>
      ) : null}
    </div>
  );
}

export function AddButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-tan/40 px-3.5 py-2 text-sm font-semibold text-tan transition hover:bg-tan/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <AddRounded sx={{ fontSize: 18 }} />
      {children}
    </button>
  );
}

/** Lista editável de textos curtos (itens, objetivos...). Enter cria um novo item abaixo. */
export function StringListEditor({
  items,
  onChange,
  placeholder = "Novo item",
  addLabel = "Adicionar item",
  max = 20,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  max?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex === null) return;
    refs.current[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex, items.length]);

  function insertAt(index: number) {
    if (items.length >= max) return;
    const next = items.slice();
    next.splice(index, 0, "");
    onChange(next);
    setFocusIndex(index);
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-6 flex-none text-right text-xs font-semibold tabular-nums text-charcoal/35">
            {String(index + 1).padStart(2, "0")}
          </span>
          <input
            ref={(el) => {
              refs.current[index] = el;
            }}
            className="input-search"
            value={item}
            placeholder={placeholder}
            onChange={(event) => onChange(items.map((current, i) => (i === index ? event.target.value : current)))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertAt(index + 1);
              } else if (event.key === "Backspace" && !item && items.length > 1) {
                event.preventDefault();
                onChange(items.filter((_, i) => i !== index));
                setFocusIndex(Math.max(0, index - 1));
              }
            }}
          />
          <MoveControls
            index={index}
            length={items.length}
            onMove={(to) => onChange(move(items, index, to))}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <div className="pl-8">
        <AddButton onClick={() => insertAt(items.length)} disabled={items.length >= max}>
          {addLabel}
        </AddButton>
      </div>
    </div>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "warning" | "success"; children: ReactNode }) {
  const styles = {
    info: "border-tan/20 bg-tan/[0.05] text-charcoal/75",
    warning: "border-gold/30 bg-gold/10 text-charcoal/80",
    success: "border-sage/30 bg-sage/10 text-charcoal/80",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-[13px] leading-5 ${styles}`}>{children}</div>;
}
