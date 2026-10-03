import { maskCurrencyBRL, todayISO } from "@/utils/format";

export type ProposalTemplate = "dark" | "light" | "editorial" | "studio" | "bold";
export type InvestmentMode = "single" | "packages";
export type PackagesLayout = "grid" | "separate";
export type Billing = "mensal" | "único" | "por projeto" | "por diária" | "trimestral";

export interface Metric {
  value: string;
  label: string;
}

export interface PortfolioItem {
  id: string;
  url: string;
  title: string;
  description: string;
}

export interface ProposalPackage {
  id: string;
  name: string;
  title: string;
  description: string;
  items: string[];
  value: string;
  payment: string;
  note: string;
}

export interface ProposalData {
  company: {
    name: string;
    logo: string;
    site: string;
    instagram: string;
    whatsapp: string;
    tagline: string;
    metrics: Metric[];
  };
  client: { name: string; company: string; title: string; date: string; validity: string };
  structure: { enabled: boolean; title: string; images: string[] };
  experience: { enabled: boolean; number: string; description: string; title: string; text: string };
  objectives: { title: string; items: string[] };
  portfolioIntro: { eyebrow: string; title: string; text: string };
  portfolio: PortfolioItem[];
  investment: {
    mode: InvestmentMode;
    packagesLayout: PackagesLayout;
    single: {
      name: string;
      description: string;
      items: string[];
      value: string;
      billing: Billing;
      payment: string;
      note: string;
    };
    packages: ProposalPackage[];
  };
  closing: { call: string; company: string; site: string; contact: string };
  identity: { template: ProposalTemplate; color: string; titleFont: string; bodyFont: string };
  /** Negociação do CRM de onde a proposta saiu (vazio = avulsa). */
  leadId: string;
}

export const MAX_STRUCTURE_IMAGES = 6;
export const LOGO_MAX_WIDTH = 600;
export const STRUCTURE_MAX_WIDTH = 1400;
export const IMAGE_QUALITY = 0.8;
/** Acima disso o documento salvo fica pesado para o servidor. */
export const SIZE_WARNING_BYTES = 3.5 * 1024 * 1024;

export const BILLING_OPTIONS: { value: Billing; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "único", label: "Pagamento único" },
  { value: "por projeto", label: "Por projeto" },
  { value: "por diária", label: "Por diária" },
  { value: "trimestral", label: "Trimestral" },
];

export const BILLING_SUFFIX: Record<Billing, string> = {
  mensal: "/ mês",
  único: "pagamento único",
  "por projeto": "por projeto",
  "por diária": "por diária",
  trimestral: "/ trimestre",
};

export const TEMPLATE_OPTIONS: { value: ProposalTemplate; title: string; description: string; badge?: string }[] = [
  { value: "dark", title: "01 — Dark Premium", description: "Premium, alto contraste.", badge: "Principal" },
  { value: "light", title: "02 — Minimal Light", description: "Claro, muito espaço negativo." },
  { value: "editorial", title: "03 — Editorial", description: "Assimétrico, tipográfico." },
  { value: "studio", title: "04 — Studio", description: "Técnico, modular." },
  { value: "bold", title: "05 — Bold", description: "Blocos de cor, tipografia forte." },
];

export const TEMPLATE_NAMES: Record<ProposalTemplate, string> = {
  dark: "Dark Premium",
  light: "Minimal Light",
  editorial: "Editorial",
  studio: "Studio",
  bold: "Bold",
};

interface FontSpec {
  /** Pesos disponíveis no Google Fonts (pedir um peso inexistente quebra o CSS inteiro). */
  weights: number[];
  kind: "sans" | "serif" | "display-serif";
  fallback: string;
}

export const TITLE_FONTS: Record<string, FontSpec> = {
  Manrope: { weights: [400, 500, 600, 700, 800], kind: "sans", fallback: "sans-serif" },
  Montserrat: { weights: [400, 500, 600, 700, 800, 900], kind: "sans", fallback: "sans-serif" },
  "Playfair Display": { weights: [400, 500, 600, 700, 800, 900], kind: "display-serif", fallback: "serif" },
  "Space Grotesk": { weights: [400, 500, 600, 700], kind: "sans", fallback: "sans-serif" },
  "DM Serif Display": { weights: [400], kind: "display-serif", fallback: "serif" },
};

export const BODY_FONTS: Record<string, FontSpec> = {
  Inter: { weights: [400, 500, 600, 700], kind: "sans", fallback: "sans-serif" },
  "DM Sans": { weights: [400, 500, 600, 700], kind: "sans", fallback: "sans-serif" },
  Lora: { weights: [400, 500, 600, 700], kind: "serif", fallback: "serif" },
  "IBM Plex Sans": { weights: [400, 500, 600, 700], kind: "sans", fallback: "sans-serif" },
};

/** Pares legíveis: título serifado de display pede texto sem serifa. */
export function bodyFontsFor(titleFont: string): string[] {
  const title = TITLE_FONTS[titleFont];
  return Object.keys(BODY_FONTS).filter((body) => !(title?.kind === "display-serif" && BODY_FONTS[body].kind === "serif"));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Converte um valor numérico em texto "R$ 4.233,60" (sem espaço não separável). */
export function moneyText(value: number) {
  return `R$ ${maskCurrencyBRL(value)}`;
}

/** "R$ 4.233,60" → "4.233,60" (o formato do MoneyInput). */
export function moneyInputValue(text: string) {
  return (text || "").replace(/^R\$\s*/, "").trim();
}

export function moneyFromInput(masked: string) {
  return masked ? `R$ ${masked}` : "R$ 0,00";
}

export function defaultPackages(): ProposalPackage[] {
  return [
    {
      id: uid(),
      name: "Plano 01",
      title: "4 Reels",
      description: "Meia diária de produção.",
      items: ["Planejamento", "Captação", "Edição"],
      value: "R$ 0,00",
      payment: "",
      note: "",
    },
    {
      id: uid(),
      name: "Plano 02",
      title: "8 Reels",
      description: "Uma diária completa de produção.",
      items: ["Planejamento", "Captação", "Edição", "Roteiro dos vídeos"],
      value: "R$ 0,00",
      payment: "",
      note: "",
    },
  ];
}

export function defaultData(): ProposalData {
  return {
    company: {
      name: "",
      logo: "",
      site: "",
      instagram: "",
      whatsapp: "",
      tagline: "Focados em criação de conteúdo para as redes sociais.",
      metrics: [
        { value: "4 anos", label: "no mercado" },
        { value: "+10 anos", label: "de experiência na área" },
      ],
    },
    client: { name: "", company: "", title: "Proposta Comercial", date: todayISO(), validity: "7 dias" },
    structure: { enabled: true, title: "Nosso escritório", images: [] },
    experience: {
      enabled: true,
      number: "+30",
      description: "parceiros ativos.",
      title: "Empresas que confiam no nosso trabalho.",
      text: "",
    },
    objectives: {
      title: "Implementar o nosso método na sua empresa para:",
      items: [
        "Gerar autoridade.",
        "Atrair novos clientes.",
        "Valorizar os atuais.",
        "Criar constância.",
        "Melhorar a comunicação.",
        "Produzir sem improviso.",
      ],
    },
    portfolioIntro: {
      eyebrow: "Trabalhos selecionados",
      title: "Produção audiovisual",
      text: "Uma seleção de trabalhos que representam nossa entrega.",
    },
    portfolio: [],
    investment: {
      mode: "single",
      packagesLayout: "grid",
      single: {
        name: "Produção de Conteúdo",
        description: "",
        items: ["Planejamento e alinhamento", "Captação de vídeo", "Edição e entrega"],
        value: "R$ 0,00",
        billing: "mensal",
        payment: "",
        note: "",
      },
      packages: defaultPackages(),
    },
    closing: {
      call: "Vamos produzir conteúdos que façam a empresa ser lembrada?",
      company: "",
      site: "",
      contact: "",
    },
    identity: { template: "dark", color: "#F43700", titleFont: "Manrope", bodyFont: "Inter" },
    leadId: "",
  };
}

type Loose = Record<string, unknown>;

function obj(value: unknown): Loose {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : {};
}

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function strList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Mescla um documento salvo (talvez antigo/incompleto) com os valores padrão. */
export function normalize(partial: Partial<ProposalData>): ProposalData {
  const d = defaultData();
  const p = obj(partial);
  const company = obj(p.company);
  const client = obj(p.client);
  const structure = obj(p.structure);
  const experience = obj(p.experience);
  const objectives = obj(p.objectives);
  const intro = obj(p.portfolioIntro);
  const investment = obj(p.investment);
  const single = obj(investment.single);
  const closing = obj(p.closing);
  const identity = obj(p.identity);

  const titleFont = oneOf(identity.titleFont, Object.keys(TITLE_FONTS), d.identity.titleFont);
  const allowedBody = bodyFontsFor(titleFont);
  const bodyFont = oneOf(identity.bodyFont, allowedBody, allowedBody[0]);

  return {
    company: {
      name: str(company.name, d.company.name),
      logo: str(company.logo, ""),
      site: str(company.site, ""),
      instagram: str(company.instagram, ""),
      whatsapp: str(company.whatsapp, ""),
      tagline: str(company.tagline, d.company.tagline),
      metrics: Array.isArray(company.metrics)
        ? company.metrics.map((m) => ({ value: str(obj(m).value, ""), label: str(obj(m).label, "") }))
        : d.company.metrics,
    },
    client: {
      name: str(client.name, ""),
      company: str(client.company, ""),
      title: str(client.title, d.client.title),
      date: str(client.date, d.client.date),
      validity: str(client.validity, d.client.validity),
    },
    structure: {
      enabled: bool(structure.enabled, true),
      title: str(structure.title, d.structure.title),
      images: strList(structure.images, []).slice(0, MAX_STRUCTURE_IMAGES),
    },
    experience: {
      enabled: bool(experience.enabled, true),
      number: str(experience.number, d.experience.number),
      description: str(experience.description, d.experience.description),
      title: str(experience.title, d.experience.title),
      text: str(experience.text, ""),
    },
    objectives: {
      title: str(objectives.title, d.objectives.title),
      items: strList(objectives.items, d.objectives.items),
    },
    portfolioIntro: {
      eyebrow: str(intro.eyebrow, d.portfolioIntro.eyebrow),
      title: str(intro.title, d.portfolioIntro.title),
      text: str(intro.text, d.portfolioIntro.text),
    },
    portfolio: Array.isArray(p.portfolio)
      ? p.portfolio.map((raw) => {
          const item = obj(raw);
          return {
            id: str(item.id, "") || uid(),
            url: str(item.url, ""),
            title: str(item.title, ""),
            description: str(item.description, ""),
          };
        })
      : [],
    investment: {
      mode: oneOf(investment.mode, ["single", "packages"] as const, "single"),
      packagesLayout: oneOf(investment.packagesLayout, ["grid", "separate"] as const, "grid"),
      single: {
        name: str(single.name, d.investment.single.name),
        description: str(single.description, ""),
        items: strList(single.items, d.investment.single.items),
        value: str(single.value, d.investment.single.value),
        billing: oneOf(single.billing, BILLING_OPTIONS.map((o) => o.value), "mensal"),
        payment: str(single.payment, ""),
        note: str(single.note, ""),
      },
      packages: Array.isArray(investment.packages)
        ? investment.packages.map((raw, index) => {
            const pkg = obj(raw);
            return {
              id: str(pkg.id, "") || uid(),
              name: str(pkg.name, `Plano ${String(index + 1).padStart(2, "0")}`),
              title: str(pkg.title, ""),
              description: str(pkg.description, ""),
              items: strList(pkg.items, []),
              value: str(pkg.value, "R$ 0,00"),
              payment: str(pkg.payment, ""),
              note: str(pkg.note, ""),
            };
          })
        : d.investment.packages,
    },
    closing: {
      call: str(closing.call, d.closing.call),
      company: str(closing.company, ""),
      site: str(closing.site, ""),
      contact: str(closing.contact, ""),
    },
    identity: {
      template: oneOf(identity.template, TEMPLATE_OPTIONS.map((o) => o.value), "dark"),
      color: /^#[0-9a-f]{6}$/i.test(str(identity.color, "")) ? str(identity.color, "") : d.identity.color,
      titleFont,
      bodyFont,
    },
    leadId: /^[a-f0-9]{24}$/.test(str(p.leadId, "")) ? str(p.leadId, "") : "",
  };
}

export function titleOf(data: ProposalData) {
  return data.client.company.trim() || data.client.name.trim() || "Proposta sem nome";
}

/** Tamanho aproximado do documento salvo, em bytes. */
export function approximateSize(data: ProposalData) {
  return JSON.stringify(data).length;
}
