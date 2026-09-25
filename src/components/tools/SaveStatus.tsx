import type { SaveState } from "@/hooks/useToolDocument";

const labels: Record<SaveState, string> = {
  idle: "Salvo",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Erro ao salvar",
};

export default function SaveStatus({ state, local }: { state: SaveState; local?: boolean }) {
  const tone = state === "error" ? "bg-burgundy/10 text-burgundy" : "bg-sage/10 text-sage";
  return (
    <span className={`chip ${tone}`}>{local && state !== "error" ? "Salvo neste navegador" : labels[state]}</span>
  );
}
