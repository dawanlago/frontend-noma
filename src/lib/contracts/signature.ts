import { api } from "@/lib/api";
import { BLANK, contractAccent, type ContractDocument } from "./clauses";

/* Assinatura eletrônica (Assinafy): chamadas ao backend e geração do PDF do contrato. */

export type SignatureStatus = "processing" | "pending" | "finishing" | "signed" | "rejected" | "expired" | "failed" | "cancelled";
export type SignerStatus = "pending" | "signed" | "rejected";

export interface SignatureSigner {
  name: string;
  email: string;
  governmentId: string;
  role: string;
  status: SignerStatus;
  signingUrl: string;
  viewedAt?: string;
  signedAt?: string;
  rejectedAt?: string;
}

export interface ContractSignatureInfo {
  _id: string;
  status: SignatureStatus;
  assinafyStatus: string;
  environment: "production" | "sandbox";
  message: string;
  error: string;
  sentAt?: string;
  completedAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  hasSignedFile: boolean;
  signers: SignatureSigner[];
}

export interface SignatureIntegrationState {
  configured: boolean;
  enabled: boolean;
  environment: "production" | "sandbox";
}

export interface SignerInput {
  name: string;
  email: string;
  governmentId: string;
  role: string;
}

export const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  processing: "Preparando envio",
  pending: "Aguardando assinaturas",
  finishing: "Todos assinaram — gerando PDF",
  signed: "Assinado",
  rejected: "Recusado",
  expired: "Expirado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

/** Envios que ainda estão em andamento (bloqueiam um novo envio). */
export const ACTIVE_STATUSES: SignatureStatus[] = ["processing", "pending", "finishing"];

const path = (id: string) => `/contracts/${id}/signature`;

export const signatureApi = {
  get: async (id: string) =>
    (await api.get<{ data: { integration: SignatureIntegrationState; signature: ContractSignatureInfo | null } }>(path(id))).data.data,
  send: async (id: string, payload: { pdf: string; fileName: string; signers: SignerInput[]; message?: string }) =>
    (await api.post<{ data: ContractSignatureInfo }>(path(id), payload)).data.data,
  refresh: async (id: string) => (await api.post<{ data: ContractSignatureInfo }>(`${path(id)}/refresh`)).data.data,
  cancel: async (id: string) => (await api.delete<{ data: ContractSignatureInfo }>(path(id))).data.data,
  /** Baixa o PDF assinado (passa pelo backend, que usa a chave da Assinafy). */
  download: async (id: string, fileName: string) => {
    const response = await api.get<Blob>(`${path(id)}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/* ------------------------------------------------------------------ */
/* PDF do contrato (texto vetorial, A4)                                 */
/* ------------------------------------------------------------------ */

const PAGE = { width: 210, height: 297, top: 18, bottom: 20, left: 18, right: 18 };
const BODY_SIZE = 10;
const LINE = 5; // mm entre linhas do corpo
const TEXT_COLOR = "#111111";
const MUTED_COLOR = "#555555";

/** As fontes padrão do PDF só têm o alfabeto latino: troca o que ficaria ilegível. */
function pdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[   ]/g, " ")
    .replace(/[^\n\x20-\x7E¡-ÿ]/g, "");
}

interface Word {
  text: string;
  bold: boolean;
}

/** Quebra o parágrafo em palavras, marcando o negrito (`<b>`) e o número da cláusula. */
function words(text: string): Word[] {
  const result: Word[] = [];
  const numbered = text.match(/^(\d+\.\d+\.)\s([\s\S]*)$/);
  const source = numbered ? `<b>${numbered[1]}</b> ${numbered[2]}` : text;
  source.split(/(<b>[\s\S]*?<\/b>)/g).forEach((chunk) => {
    const bold = chunk.startsWith("<b>");
    const plain = pdfText(bold ? chunk.slice(3, -4) : chunk);
    plain
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => result.push({ text: word, bold }));
  });
  return result;
}

/** Converte o logo (URL ou data URL) em PNG para o PDF; falha silenciosa sem logo. */
async function logoImage(src: string): Promise<{ data: string; width: number; height: number } | null> {
  if (!src) return null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.crossOrigin = "anonymous";
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = src;
    });
    const scale = Math.min(1, 600 / (image.naturalWidth || 600));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 600) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 200) * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

/**
 * Gera o PDF do contrato no navegador (mesmo conteúdo da pré-visualização), com a cor
 * da marca nos títulos e filetes. Devolve o arquivo em base64 (sem o prefixo data:).
 */
export async function contractPdfBase64(doc: ContractDocument, options: { logo?: string; accent?: string; title?: string } = {}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const accent = contractAccent(options.accent);
  const width = PAGE.width - PAGE.left - PAGE.right;
  const limit = PAGE.height - PAGE.bottom;
  let y = PAGE.top;

  pdf.setProperties({ title: pdfText(options.title || doc.title), creator: "Noma" });

  const ensure = (height: number) => {
    if (y + height > limit) {
      pdf.addPage();
      y = PAGE.top;
    }
  };

  const font = (bold: boolean, size = BODY_SIZE) => {
    pdf.setFont("times", bold ? "bold" : "normal");
    pdf.setFontSize(size);
  };

  /** Parágrafo justificado com trechos em negrito. */
  const paragraph = (text: string, align: "justify" | "right" = "justify", gap = 2) => {
    const list = words(text);
    font(false);
    const space = pdf.getTextWidth(" ");
    const measure = (word: Word) => {
      font(word.bold);
      return pdf.getTextWidth(word.text);
    };
    const lines: { items: Word[]; widths: number[]; total: number }[] = [];
    let current: { items: Word[]; widths: number[]; total: number } = { items: [], widths: [], total: 0 };
    for (const word of list) {
      const size = measure(word);
      const next = current.items.length ? current.total + space + size : size;
      if (current.items.length && next > width) {
        lines.push(current);
        current = { items: [], widths: [], total: 0 };
      }
      current.total = current.items.length ? current.total + space + size : size;
      current.items.push(word);
      current.widths.push(size);
    }
    if (current.items.length) lines.push(current);

    pdf.setTextColor(TEXT_COLOR);
    lines.forEach((line, index) => {
      ensure(LINE);
      const last = index === lines.length - 1;
      const gaps = line.items.length - 1;
      const extra = align === "justify" && !last && gaps > 0 ? (width - line.total) / gaps : 0;
      let x = align === "right" ? PAGE.left + width - line.total : PAGE.left;
      line.items.forEach((word, wordIndex) => {
        font(word.bold);
        pdf.text(word.text, x, y + 3.6);
        x += line.widths[wordIndex] + space + extra;
      });
      y += LINE;
    });
    y += gap;
  };

  // Logo e título, com filete na cor da marca.
  const logo = await logoImage(options.logo || "");
  if (logo) {
    const maxW = 55;
    const maxH = 16;
    const ratio = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    pdf.addImage(logo.data, "PNG", (PAGE.width - w) / 2, y, w, h);
    y += h + 6;
  }
  font(true, 13);
  pdf.setTextColor(accent);
  const titleLines: string[] = pdf.splitTextToSize(pdfText(doc.title), width);
  titleLines.forEach((line) => {
    pdf.text(line, PAGE.width / 2, y + 5, { align: "center" });
    y += 6;
  });
  y += 2;
  pdf.setDrawColor(accent);
  pdf.setLineWidth(0.5);
  pdf.line(PAGE.left, y, PAGE.left + width, y);
  y += 7;

  doc.preamble.forEach((text) => paragraph(text));

  doc.sections.forEach((section) => {
    // Título da cláusula não fica sozinho no fim da página.
    ensure(LINE * 3 + 4);
    y += 3;
    font(true, BODY_SIZE);
    pdf.setTextColor(accent);
    pdf.text(pdfText(section.heading.toUpperCase()), PAGE.left, y + 3.6);
    y += LINE + 1;
    section.paragraphs.forEach((text) => paragraph(text));
  });

  y += 3;
  paragraph(doc.closing);
  y += 2;
  paragraph(doc.placeDate, "right", 6);

  /** Bloco de assinaturas em duas colunas. */
  const signatureRow = (items: { title: string; lines: string[] }[]) => {
    ensure(30);
    y += 14;
    const columnWidth = (width - 12) / 2;
    items.forEach((item, index) => {
      const x = PAGE.left + index * (columnWidth + 12);
      let lineY = y;
      pdf.setDrawColor(accent);
      pdf.setLineWidth(0.3);
      pdf.line(x, lineY, x + columnWidth, lineY);
      lineY += 4.5;
      font(true, 9.5);
      pdf.setTextColor(TEXT_COLOR);
      pdf.text(pdfText(item.title), x, lineY);
      font(false, 8.5);
      pdf.setTextColor(MUTED_COLOR);
      item.lines.forEach((line) => {
        lineY += 4;
        pdf.text(pdfText(line), x, lineY);
      });
    });
    y += 18;
  };

  signatureRow(
    doc.signers.map((signer) => ({
      title: signer.name || BLANK,
      lines: [signer.role, ...(signer.document ? [`CPF/CNPJ: ${signer.document}`] : [])],
    })),
  );
  if (doc.witnesses) {
    signatureRow([1, 2].map((n) => ({ title: `Testemunha ${n}`, lines: ["Nome:", "CPF:"] })));
  }

  // Rodapé com a numeração das páginas.
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    font(false, 8);
    pdf.setTextColor(MUTED_COLOR);
    pdf.text(`Página ${page} de ${pages}`, PAGE.width / 2, PAGE.height - 10, { align: "center" });
  }

  return pdf.output("datauristring").split(",")[1] || "";
}

/** Tamanho aproximado, em bytes, do PDF em base64. */
export function base64Size(base64: string) {
  return Math.floor((base64.length * 3) / 4);
}
