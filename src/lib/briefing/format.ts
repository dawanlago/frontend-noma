import { escapeHtml } from "@/utils/document";
import { formatDateOnly } from "@/utils/format";
import type { BriefingData } from "./model";
import { BRIEFING_TEMPLATES } from "./templates";

export const EMPTY_LABEL = "Não informado";

export interface BriefingItem {
  label: string;
  value: string;
  long?: boolean;
  /** Entra no contador de campos preenchidos. */
  counted?: boolean;
}

export interface BriefingBlock {
  title: string;
  items: BriefingItem[];
}

export interface BriefingSummary {
  title: string;
  typeLabel: string;
  blocks: BriefingBlock[];
  filled: number;
  total: number;
}

const item = (label: string, value: string, long = false): BriefingItem => ({ label, value: value.trim(), long, counted: true });

/** Organiza o briefing em blocos para o preview, o texto e o PDF. */
export function buildBriefing(data: BriefingData): BriefingSummary {
  const template = BRIEFING_TEMPLATES[data.type];
  const specific = data.specific[data.type] || {};

  const blocks: BriefingBlock[] = [
    {
      title: "Projeto",
      items: [
        { label: "Tipo de projeto", value: template.title, counted: false },
        item("Cliente", data.client.clientName),
        item("Projeto", data.client.projectName),
        item("Contato responsável", data.client.contact),
        item("WhatsApp / e-mail", data.client.channel),
      ],
    },
    {
      title: "Objetivo",
      items: [item("Objetivo principal", data.goal.mainGoal, true), item("Público que queremos atingir", data.goal.audience, true)],
    },
    {
      title: template.sectionTitle,
      items: template.fields.map((field) =>
        item(field.label, field.kind === "date" ? formatDateOnly(specific[field.key]) : specific[field.key] || "", field.kind === "textarea"),
      ),
    },
    {
      title: "Produção",
      items: [
        item("Data da gravação", formatDateOnly(data.production.date)),
        item("Horário", data.production.time),
        item("Local", data.production.location, true),
        item("Informações da gravação", data.production.notes, true),
      ],
    },
    {
      title: "Direção criativa",
      items: [
        item("Referências", data.creative.references, true),
        item("O que devemos evitar", data.creative.avoid, true),
        item("Observações importantes", data.creative.notes, true),
      ],
    },
    {
      title: "Entrega",
      items: [
        item("Formato principal", data.delivery.format),
        item("Prazo final", formatDateOnly(data.delivery.deadline)),
        item("Número de revisões", data.delivery.revisions),
        item("Canal de publicação", data.delivery.channel),
        {
          label: "Autorização de portfólio",
          value: data.delivery.portfolio ? "Confirmar autorização" : "Não solicitada",
          counted: false,
        },
      ],
    },
  ];

  const counted = blocks.flatMap((block) => block.items.filter((entry) => entry.counted));
  return {
    title: data.client.projectName.trim() || data.client.clientName.trim() || "Briefing de produção",
    typeLabel: template.title,
    blocks,
    filled: counted.filter((entry) => entry.value).length,
    total: counted.length,
  };
}

export function briefingToText(summary: BriefingSummary): string {
  const lines = ["BRIEFING DE PRODUÇÃO", summary.title, ""];
  summary.blocks.forEach((block) => {
    lines.push(block.title.toUpperCase());
    block.items.forEach((entry) => {
      const value = entry.value || EMPTY_LABEL;
      if (entry.long && value.includes("\n")) lines.push(`• ${entry.label}:`, ...value.split("\n").map((line) => `  ${line}`));
      else lines.push(`• ${entry.label}: ${value}`);
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}

export interface BriefingBrand {
  /** Cor principal (#RRGGBB). */
  color: string;
  /** Logo em data URL (vazio = sem logo). */
  logo: string;
  companyName: string;
}

export function briefingToHtml(summary: BriefingSummary, brand: BriefingBrand): string {
  const value = (text: string) =>
    text ? escapeHtml(text).replace(/\n/g, "<br />") : `<span class="empty">${EMPTY_LABEL}</span>`;

  return `
    <header>
      ${brand.logo ? `<img class="logo" src="${brand.logo}" alt="" />` : ""}
      <p class="eyebrow">Briefing de produção · ${escapeHtml(summary.typeLabel)}</p>
      <h1>${escapeHtml(summary.title)}</h1>
      <p class="progress">Campos preenchidos: ${summary.filled} / ${summary.total}</p>
    </header>
    ${summary.blocks
      .map(
        (block) => `
      <section>
        <h2>${escapeHtml(block.title)}</h2>
        <table>
          ${block.items
            .map((entry) => `<tr><th>${escapeHtml(entry.label)}</th><td>${value(entry.value)}</td></tr>`)
            .join("")}
        </table>
      </section>`,
      )
      .join("")}
    <footer>${escapeHtml(brand.companyName)} · documento de uso interno da produção.</footer>`;
}

/** CSS do PDF com a cor escolhida no briefing. */
export function briefingPrintCss(color: string) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111111";
  return `
  header { border-bottom: 3px solid ${safe}; padding-bottom: 12px; margin-bottom: 8px; }
  .logo { display: block; max-height: 48px; max-width: 180px; object-fit: contain; margin: 0 0 12px; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${safe}; margin: 0 0 4px; text-align: left; }
  h1 { text-align: left; font-size: 22px; margin: 0 0 4px; }
  .progress { font-size: 11px; color: #666; margin: 0; text-align: left; }
  section { break-inside: avoid; margin-top: 16px; }
  h2 { font-size: 11px; color: ${safe}; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 7px 10px; border-bottom: 1px solid #e6e8ec; font-size: 12px; }
  th { width: 34%; color: #555; font-weight: 600; background: #f7f8fa; }
  .empty { color: #aaa; font-style: italic; }
  footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; }
`;
}
