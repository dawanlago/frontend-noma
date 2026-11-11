import { escapeHtml } from "@/utils/document";
import { parseDuration, titleOf, totalDuration, type ScriptData } from "./model";

/*
 * Exportação do roteiro: um documento completo (HTML) usado para imprimir/PDF, baixar em Word
 * e para a prévia, e o texto para copiar (normal ou formatado para o WhatsApp).
 */

/** Tabela = equipe de gravação; Cena a cena = leitura/aprovação do cliente; Teleprompter = só as falas, em letra grande. */
export type ScriptLayout = "table" | "cards" | "teleprompter";

export const SCRIPT_LAYOUTS: { value: ScriptLayout; title: string; description: string }[] = [
  { value: "table", title: "Tabela de gravação", description: "Cena, ação, fala, minutagem e observações lado a lado. Ideal para o set." },
  { value: "cards", title: "Cena a cena", description: "Uma cena embaixo da outra, fácil de ler e aprovar com o cliente." },
  { value: "teleprompter", title: "Teleprompter", description: "Só as falas, em letra grande, para quem grava ler." },
];

export interface ScriptExportOptions {
  layout: ScriptLayout;
  briefingTitle?: string;
  /** Nome e logo da produtora (Configurações → Geral). */
  brand?: { name: string; logo: string; color?: string };
  /** Observações das cenas e observações gerais. */
  includeNotes?: boolean;
  /** Campo de aprovação do cliente no fim do documento. */
  includeApproval?: boolean;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Minutagem acumulada de cada cena ("0:00–0:15"); vazio quando a duração não dá para somar. */
export function sceneTimecodes(data: ScriptData): string[] {
  let elapsed = 0;
  let known = true;
  return data.scenes.map((scene) => {
    const seconds = parseDuration(scene.duration);
    if (seconds === null || !known) {
      known = false;
      return "";
    }
    const label = `${clock(elapsed)}–${clock(elapsed + seconds)}`;
    elapsed += seconds;
    return label;
  });
}

function metaItems(data: ScriptData, briefingTitle = "") {
  return [
    data.client.trim() ? ["Cliente", data.client.trim()] : null,
    data.format.trim() ? ["Formato", data.format.trim()] : null,
    briefingTitle ? ["Briefing", briefingTitle] : null,
    ["Cenas", String(data.scenes.length)],
    ["Duração", totalDuration(data.scenes).label],
  ].filter((item): item is string[] => Boolean(item));
}

export function scriptToText(data: ScriptData, briefingTitle = "", whatsapp = false): string {
  const b = (value: string) => (whatsapp ? `*${value}*` : value);
  const times = sceneTimecodes(data);
  const lines = [b(`ROTEIRO · ${titleOf(data)}`)];
  metaItems(data, briefingTitle).forEach(([label, value]) => lines.push(`${label}: ${value}`));
  lines.push("");
  data.scenes.forEach((scene, index) => {
    const extra = [scene.duration.trim(), times[index]].filter(Boolean).join(" · ");
    lines.push(b(`CENA ${index + 1}${extra ? ` (${extra})` : ""}`));
    if (scene.description.trim()) lines.push(`${whatsapp ? "🎬 " : "Ação: "}${scene.description.trim()}`);
    if (scene.audio.trim()) lines.push(`${whatsapp ? "🎙️ " : "Fala: "}${scene.audio.trim()}`);
    if (scene.notes.trim()) lines.push(`${whatsapp ? "📝 " : "Obs.: "}${whatsapp ? `_${scene.notes.trim()}_` : scene.notes.trim()}`);
    lines.push("");
  });
  if (data.notes.trim()) lines.push(b("OBSERVAÇÕES GERAIS"), data.notes.trim());
  return lines.join("\n").trim();
}

const text = (value: string) => escapeHtml(value.trim()).replace(/\n/g, "<br />");
const safeColor = (value?: string) => (value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#111111");
const safeLogo = (value?: string) => (value && /^(https:\/\/|data:image\/)[^\s"'<>]+$/i.test(value) ? escapeHtml(value) : "");

function header(data: ScriptData, options: ScriptExportOptions) {
  const logo = safeLogo(options.brand?.logo);
  const name = options.brand?.name?.trim() || "";
  const meta = metaItems(data, options.briefingTitle)
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
  return `<header class="doc-head">
  <div class="brand">${logo ? `<img src="${logo}" alt="${escapeHtml(name || "Logo")}">` : name ? `<b>${escapeHtml(name)}</b>` : ""}<span>Roteiro</span></div>
  <h1>${escapeHtml(titleOf(data))}</h1>
  <div class="meta">${meta}</div>
</header>`;
}

function tableBody(data: ScriptData, options: ScriptExportOptions, times: string[]) {
  const notes = options.includeNotes !== false;
  return `<table class="scenes">
  <thead><tr><th class="n">#</th><th>Ação / imagem</th><th>Áudio / fala</th><th class="d">Tempo</th>${notes ? "<th>Observações</th>" : ""}</tr></thead>
  <tbody>${data.scenes
    .map(
      (scene, index) =>
        `<tr><td class="n">${index + 1}</td><td>${text(scene.description)}</td><td class="fala">${text(scene.audio)}</td><td class="d">${text(scene.duration)}${
          times[index] ? `<small>${times[index]}</small>` : ""
        }</td>${notes ? `<td class="obs">${text(scene.notes)}</td>` : ""}</tr>`,
    )
    .join("")}</tbody>
</table>`;
}

function cardsBody(data: ScriptData, options: ScriptExportOptions, times: string[]) {
  const notes = options.includeNotes !== false;
  return `<ol class="cards">${data.scenes
    .map((scene, index) => {
      const tag = [scene.duration.trim(), times[index]].filter(Boolean).join(" · ");
      return `<li><div class="card-head"><b>Cena ${index + 1}</b>${tag ? `<span>${escapeHtml(tag)}</span>` : ""}</div>${
        scene.description.trim() ? `<p><em>Imagem</em>${text(scene.description)}</p>` : ""
      }${scene.audio.trim() ? `<p class="fala"><em>Fala</em>${text(scene.audio)}</p>` : ""}${
        notes && scene.notes.trim() ? `<p class="obs"><em>Obs.</em>${text(scene.notes)}</p>` : ""
      }</li>`;
    })
    .join("")}</ol>`;
}

function teleprompterBody(data: ScriptData) {
  const lines = data.scenes
    .map((scene, index) => (scene.audio.trim() ? `<section><span>Cena ${index + 1}</span><p>${text(scene.audio)}</p></section>` : ""))
    .join("");
  return `<div class="prompter">${lines || "<p class='empty'>Nenhuma fala escrita nas cenas.</p>"}</div>`;
}

const DOC_CSS = (accent: string, layout: ScriptLayout) => `
@page { size: A4 ${layout === "table" ? "landscape" : "portrait"}; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, "Segoe UI", Arial, sans-serif; color: #15161a; font-size: 12.5px; line-height: 1.55; background: #fff; }
.page { max-width: ${layout === "table" ? "1100px" : "760px"}; margin: 0 auto; padding: 28px 24px 40px; }
.doc-head { border-bottom: 3px solid ${accent}; padding-bottom: 14px; margin-bottom: 18px; }
.brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.brand img { height: 30px; max-width: 180px; object-fit: contain; }
.brand b { font-size: 14px; }
.brand span { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: ${accent}; margin-left: auto; }
h1 { font-size: 24px; line-height: 1.2; margin: 0 0 12px; letter-spacing: -.01em; }
.meta { display: flex; flex-wrap: wrap; gap: 8px 22px; }
.meta span { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #777; }
.meta strong { font-size: 12.5px; }
table.scenes { width: 100%; border-collapse: collapse; }
.scenes th, .scenes td { text-align: left; vertical-align: top; padding: 9px 10px; border-bottom: 1px solid #e3e5e9; }
.scenes th { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #666; border-bottom: 2px solid #15161a; }
.scenes tr { break-inside: avoid; }
.scenes .n { width: 34px; font-weight: 700; color: ${accent}; }
.scenes .d { width: 84px; white-space: nowrap; font-weight: 600; }
.scenes .d small { display: block; font-weight: 500; color: #888; font-size: 10.5px; }
.scenes .fala { font-weight: 500; }
.scenes .obs { color: #666; font-size: 11.5px; }
.cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.cards li { border: 1px solid #e3e5e9; border-left: 4px solid ${accent}; border-radius: 8px; padding: 12px 16px; break-inside: avoid; }
.card-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.card-head b { font-size: 13px; }
.card-head span { font-size: 11px; color: #777; font-weight: 600; }
.cards p { margin: 4px 0 0; }
.cards em { display: block; font-style: normal; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #888; }
.cards .fala { font-size: 14px; font-weight: 500; }
.cards .obs { color: #666; font-size: 11.5px; }
.prompter section { margin: 0 0 26px; break-inside: avoid; }
.prompter span { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: ${accent}; }
.prompter p { font-size: 26px; line-height: 1.45; font-weight: 500; margin: 4px 0 0; }
.prompter .empty { font-size: 14px; color: #777; }
.general { margin-top: 22px; padding: 14px 16px; background: #f5f6f8; border-radius: 8px; break-inside: avoid; }
.general h2 { margin: 0 0 6px; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #666; }
.general p { margin: 0; }
.approval { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; break-inside: avoid; }
.approval div { border-top: 1px solid #15161a; padding-top: 6px; font-size: 10.5px; color: #666; }
.foot { margin-top: 28px; font-size: 10px; color: #999; text-align: right; }
@media print { .page { padding: 0; max-width: none; } }
`;

/** Documento completo (HTML) do roteiro no formato escolhido. */
export function scriptDocument(data: ScriptData, options: ScriptExportOptions): string {
  const times = sceneTimecodes(data);
  const accent = safeColor(options.brand?.color);
  const body =
    options.layout === "teleprompter" ? teleprompterBody(data) : options.layout === "cards" ? cardsBody(data, options, times) : tableBody(data, options, times);
  const general = options.includeNotes !== false && options.layout !== "teleprompter" && data.notes.trim()
    ? `<section class="general"><h2>Observações gerais</h2><p>${text(data.notes)}</p></section>`
    : "";
  const approval = options.includeApproval && options.layout !== "teleprompter"
    ? `<section class="approval"><div>Aprovado por (cliente)</div><div>Data</div></section>`
    : "";
  const today = new Date().toLocaleDateString("pt-BR");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(`Roteiro — ${titleOf(data)}`)}</title><style>${DOC_CSS(accent, options.layout)}</style></head>
<body><main class="page">${header(data, options)}${body}${general}${approval}<p class="foot">Gerado em ${today}${
    options.brand?.name ? ` · ${escapeHtml(options.brand.name)}` : ""
  }</p></main></body></html>`;
}
