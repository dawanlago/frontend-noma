import { HiOutlineFire } from "react-icons/hi2";
import { LEAD_TEMPERATURES } from "@/lib/constants";
import type { LeadTemperature } from "@/types";

export function TemperatureBadge({ value }: { value: LeadTemperature }) {
  const item = LEAD_TEMPERATURES.find((option) => option.value === value) || LEAD_TEMPERATURES[1];
  return (
    <span className={`chip ${item.tone}`} title="Termômetro da negociação">
      <HiOutlineFire className="h-3 w-3" /> {item.label}
    </span>
  );
}

/** Termômetro: frio, morno ou quente. */
export function TemperaturePicker({ value, onChange }: { value: LeadTemperature; onChange: (value: LeadTemperature) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-beige p-1" role="radiogroup" aria-label="Termômetro">
      {LEAD_TEMPERATURES.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${active ? `${item.tone} shadow-soft` : "text-charcoal/55 hover:text-charcoal"}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
