import { HiCheck, HiOutlineComputerDesktop, HiOutlineMoon, HiOutlineSun } from "react-icons/hi2";
import { useEffect, useState } from "react";
import { useAppearance } from "@/contexts/AppearanceContext";
import { ACCENTS, accentFromHex, CUSTOM_ACCENT, hslOf, normalizeHex, type ThemeMode } from "@/theme/appearance";

const MODES: { value: ThemeMode; label: string; icon: typeof HiOutlineSun }[] = [
  { value: "light", label: "Claro", icon: HiOutlineSun },
  { value: "dark", label: "Escuro", icon: HiOutlineMoon },
  { value: "system", label: "Automático", icon: HiOutlineComputerDesktop },
];

/** Tema claro/escuro e cor de destaque (vale para quem está usando este navegador). */
export default function AppearancePicker() {
  const { appearance, mode, setAppearance } = useAppearance();
  const [hex, setHex] = useState(appearance.custom || "");
  useEffect(() => setHex(appearance.custom || ""), [appearance.custom]);
  const customActive = appearance.accent === CUSTOM_ACCENT;
  const validHex = normalizeHex(hex);

  function applyHex(value: string) {
    const next = normalizeHex(value);
    if (next) setAppearance({ accent: CUSTOM_ACCENT, custom: next });
  }
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-charcoal/55">Aparência</p>
      <div role="radiogroup" aria-label="Tema" className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-beige p-0.5">
        {MODES.map((item) => {
          const active = appearance.mode === item.value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAppearance({ mode: item.value })}
              className={`flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-semibold transition ${
                active ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-charcoal/55">Cor</p>
      <div role="radiogroup" aria-label="Cor de destaque" className="mt-2 flex flex-wrap gap-2">
        {ACCENTS.map((item) => {
          const active = appearance.accent === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={item.label}
              title={item.label}
              onClick={() => setAppearance({ accent: item.key })}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:scale-110 ${
                active ? "ring-2 ring-charcoal/30 ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ backgroundColor: hslOf(mode === "dark" ? item.dark : item.light) }}
            >
              {active ? <HiCheck className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold text-charcoal/55">Cor personalizada</p>
      <div className="mt-2 flex items-center gap-2">
        <label
          className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-charcoal/15 ${
            customActive ? "ring-2 ring-charcoal/30 ring-offset-2 ring-offset-surface" : ""
          }`}
          title="Escolher no seletor de cores"
          style={{ backgroundColor: validHex ? hslOf(mode === "dark" ? accentFromHex(validHex).dark : accentFromHex(validHex).light) : undefined }}
        >
          <input
            type="color"
            aria-label="Seletor de cor"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={validHex || "#3b82f6"}
            onChange={(event) => {
              setHex(event.target.value);
              applyHex(event.target.value);
            }}
          />
          {!validHex ? <span className="text-xs text-charcoal/45">+</span> : null}
        </label>
        <input
          className="input-search !h-8 !py-1 font-mono text-xs uppercase"
          value={hex}
          placeholder="#C8102E"
          maxLength={7}
          aria-label="Cor em hexadecimal"
          aria-invalid={Boolean(hex) && !validHex}
          onChange={(event) => {
            setHex(event.target.value);
            applyHex(event.target.value);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </div>
      {hex && !validHex ? <p className="mt-1 text-[11px] text-burgundy">Use o formato #RRGGBB (ex.: #C8102E).</p> : null}
    </div>
  );
}
