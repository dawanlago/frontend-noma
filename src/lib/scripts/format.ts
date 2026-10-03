import { escapeHtml } from "@/utils/document";
import { titleOf, totalDuration, type ScriptData } from "./model";

/* Exportação do roteiro: texto para copiar e HTML para imprimir/PDF. */

export function scriptToText(data: ScriptData, briefingTitle = ""): string {
  const lines = ["ROTEIRO", titleOf(data)];
  if (data.client.trim()) lines.push(`Cliente: ${data.client.trim()}`);
  if (data.format.trim()) lines.push(`Formato: ${data.format.trim()}`);
  if (briefingTitle) lines.push(`Briefing: ${briefingTitle}`);
  lines.push(`Duração total: ${totalDuration(data.scenes).label}`, "");
  data.scenes.forEach((scene, index) => {
    lines.push(`CENA ${index + 1}${scene.duration.trim() ? ` (${scene.duration.trim()})` : ""}`);
    if (scene.description.trim()) lines.push(`Ação: ${scene.description.trim()}`);
    if (scene.audio.trim()) lines.push(`Áudio/fala: ${scene.audio.trim()}`);
    if (scene.notes.trim()) lines.push(`Obs.: ${scene.notes.trim()}`);
    lines.push("");
  });
  if (data.notes.trim()) lines.push("OBSERVAÇÕES GERAIS", data.notes.trim());
  return lines.join("\n").trim();
}

export function scriptToHtml(data: ScriptData, briefingTitle = ""): string {
  const text = (value: string) => escapeHtml(value.trim()).replace(/\n/g, "<br />");
  const meta = [
    data.client.trim() ? `Cliente: ${escapeHtml(data.client.trim())}` : "",
    data.format.trim() ? `Formato: ${escapeHtml(data.format.trim())}` : "",
    briefingTitle ? `Briefing: ${escapeHtml(briefingTitle)}` : "",
    `Duração total: ${totalDuration(data.scenes).label}`,
  ].filter(Boolean);
  return `
    <header>
      <p class="eyebrow">Roteiro</p>
      <h1>${escapeHtml(titleOf(data))}</h1>
      <p class="meta">${meta.join(" · ")}</p>
    </header>
    <table>
      <thead><tr><th class="n">#</th><th>Ação / cena</th><th>Áudio / fala</th><th class="d">Duração</th><th>Observações</th></tr></thead>
      <tbody>
        ${data.scenes
          .map(
            (scene, index) =>
              `<tr><td class="n">${index + 1}</td><td>${text(scene.description)}</td><td>${text(scene.audio)}</td><td class="d">${text(scene.duration)}</td><td>${text(scene.notes)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
    ${data.notes.trim() ? `<h2>Observações gerais</h2><p>${text(data.notes)}</p>` : ""}`;
}

export const SCRIPT_PRINT_CSS = `
  @page { size: A4 landscape; }
  header { border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 4px; text-align: left; }
  h1 { text-align: left; font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #555; margin: 0; text-align: left; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 7px 8px; border: 1px solid #dfe2e6; font-size: 11.5px; }
  th { background: #f4f5f7; font-weight: 700; }
  tr { break-inside: avoid; }
  .n { width: 28px; text-align: center; }
  .d { width: 70px; white-space: nowrap; }
`;
