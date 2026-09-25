import type { StageKind } from "@/types";

const tones: Record<StageKind, string> = {
  open: "bg-tan/10 text-tan",
  won: "bg-sage/15 text-sage",
  lost: "bg-burgundy/10 text-burgundy",
};

export default function StageChip({ kind, label }: { kind: StageKind; label: string }) {
  return <span className={`chip whitespace-nowrap ${tones[kind]}`}>{label}</span>;
}
