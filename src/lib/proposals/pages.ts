import { extractDriveId } from "./drive";
import { sectionVisible, type CustomBlock, type PortfolioItem, type ProposalData, type ProposalPackage, type SectionKey } from "./model";
import { isUploadedVideoUrl } from "./video";

export const VIDEOS_PER_PAGE = 3;
export const PACKAGES_PER_PAGE = 3;

export interface PortfolioVideo extends PortfolioItem {
  driveId: string;
  number: number;
}

export type ProposalPage =
  | { kind: "cover" }
  | { kind: "company" }
  | { kind: "structure" }
  | { kind: "experience" }
  | { kind: "objectives" }
  | { kind: "portfolioIntro"; total: number }
  | { kind: "portfolio"; videos: PortfolioVideo[]; part: number; parts: number; total: number }
  | { kind: "investmentSingle" }
  | { kind: "packagesGrid"; packages: (ProposalPackage & { number: number })[]; part: number; parts: number }
  | { kind: "package"; pkg: ProposalPackage; number: number; total: number }
  | { kind: "custom"; block: CustomBlock }
  | { kind: "closing" };

export type PageKind = ProposalPage["kind"];

/** Etapa do editor (1–11) responsável por cada tipo de página. */
export const PAGE_STEP: Record<PageKind, number> = {
  cover: 1,
  company: 2,
  structure: 3,
  experience: 4,
  objectives: 5,
  portfolioIntro: 6,
  portfolio: 6,
  investmentSingle: 7,
  packagesGrid: 7,
  package: 7,
  closing: 8,
  custom: 9,
};

export const PAGE_LABELS: Record<PageKind, string> = {
  cover: "Capa",
  company: "Sua empresa",
  structure: "Estrutura",
  experience: "Experiência",
  objectives: "Objetivo",
  portfolioIntro: "Portfólio",
  portfolio: "Trabalhos",
  investmentSingle: "Investimento",
  packagesGrid: "Pacotes",
  package: "Pacote",
  custom: "Bloco livre",
  closing: "Fechamento",
};

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export function validVideos(data: ProposalData): PortfolioVideo[] {
  const out: PortfolioVideo[] = [];
  data.portfolio.forEach((item) => {
    // Vídeo enviado ao servidor não tem driveId (fica "").
    const driveId = extractDriveId(item.url);
    if (driveId || isUploadedVideoUrl(item.url)) out.push({ ...item, driveId: driveId || "", number: out.length + 1 });
  });
  return out;
}

/** Sequência de páginas (slides) da proposta: a capa e depois a ordem escolhida em "Páginas e blocos". */
export function buildPages(data: ProposalData): ProposalPage[] {
  const pages: ProposalPage[] = [{ kind: "cover" }];
  const blocks = new Map(data.customBlocks.map((block) => [`custom:${block.id}`, block]));

  const addSection = (key: SectionKey) => {
    if (!sectionVisible(data, key)) return;
    if (key === "company" || key === "structure" || key === "experience" || key === "objectives" || key === "closing") {
      pages.push({ kind: key });
      return;
    }
    if (key === "portfolio") {
      const videos = validVideos(data);
      pages.push({ kind: "portfolioIntro", total: videos.length });
      const videoChunks = chunk(videos, VIDEOS_PER_PAGE);
      videoChunks.forEach((group, index) =>
        pages.push({ kind: "portfolio", videos: group, part: index + 1, parts: videoChunks.length, total: videos.length }),
      );
      return;
    }
    const packages = data.investment.packages;
    if (data.investment.mode === "single" || packages.length === 0) {
      pages.push({ kind: "investmentSingle" });
    } else if (data.investment.packagesLayout === "separate") {
      packages.forEach((pkg, index) => pages.push({ kind: "package", pkg, number: index + 1, total: packages.length }));
    } else {
      const numbered = packages.map((pkg, index) => ({ ...pkg, number: index + 1 }));
      const groups = chunk(numbered, PACKAGES_PER_PAGE);
      groups.forEach((group, index) =>
        pages.push({ kind: "packagesGrid", packages: group, part: index + 1, parts: groups.length }),
      );
    }
  };

  data.layout.order.forEach((key) => {
    const block = blocks.get(key);
    if (block) pages.push({ kind: "custom", block });
    else addSection(key as SectionKey);
  });
  return pages;
}

/** Primeira página que corresponde à etapa; se a etapa não gera página, a anterior mais próxima. */
export function pageIndexForStep(pages: ProposalPage[], step: number): number | null {
  if (step >= 10) return null;
  const exact = pages.findIndex((page) => PAGE_STEP[page.kind] === step);
  if (exact >= 0) return exact;
  let best = 0;
  pages.forEach((page, index) => {
    if (PAGE_STEP[page.kind] < step) best = index;
  });
  return best;
}

/** Seção do layout ("company", "portfolio", "custom:<id>"...) a que a página pertence. */
export function layoutKeyOf(page: ProposalPage): string {
  if (page.kind === "custom") return `custom:${page.block.id}`;
  if (page.kind === "portfolioIntro" || page.kind === "portfolio") return "portfolio";
  if (page.kind === "investmentSingle" || page.kind === "packagesGrid" || page.kind === "package") return "investment";
  return page.kind;
}
