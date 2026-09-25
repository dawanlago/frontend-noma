/** Modelo de dados da Calculadora de Orçamento (documento salvo no servidor). */

export const PROJECT_TYPES = [
  "Conteúdo para redes sociais",
  "Evento",
  "Vídeo institucional",
  "Captação avulsa",
  "Edição",
  "Outro",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const OPERATIONAL_OPTIONS = [0, 5, 10, 15, 20] as const;
export const MARGIN_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const MARGIN_SHORTCUTS = [20, 30, 50, 70, 100] as const;

export interface ExternalCost {
  id: string;
  name: string;
  value: number;
}

export interface BudgetData {
  projectType: ProjectType;
  projectName: string;
  /** Produção */
  days: number;
  dailyRate: number;
  shootingHours: number;
  prepHours: number;
  /** Pós-produção */
  videos: number;
  editHoursPerVideo: number;
  editHourlyRate: number;
  reviewHours: number;
  /** Custos externos */
  externalCosts: ExternalCost[];
  /** Operação e margem (percentuais inteiros) */
  operationalPercent: number;
  marginPercent: number;
}

export function newCostId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultExternalCosts(): ExternalCost[] {
  return [
    { id: newCostId(), name: "Deslocamento", value: 120 },
    { id: newCostId(), name: "Assistente", value: 250 },
    { id: newCostId(), name: "Aluguel de equipamento", value: 200 },
  ];
}

export function defaultData(): BudgetData {
  return {
    projectType: "Conteúdo para redes sociais",
    projectName: "",
    days: 1,
    dailyRate: 1000,
    shootingHours: 8,
    prepHours: 4,
    videos: 4,
    editHoursPerVideo: 3,
    editHourlyRate: 80,
    reviewHours: 2,
    externalCosts: defaultExternalCosts(),
    operationalPercent: 5,
    marginPercent: 40,
  };
}

function num(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Mescla um documento salvo (possivelmente antigo/incompleto) com os padrões. */
export function normalize(partial: Partial<BudgetData>): BudgetData {
  const base = defaultData();
  const source = partial || {};
  const costs = Array.isArray(source.externalCosts)
    ? source.externalCosts.map((cost) => ({
        id: cost?.id || newCostId(),
        name: typeof cost?.name === "string" ? cost.name : "",
        value: num(cost?.value, 0),
      }))
    : base.externalCosts;

  return {
    projectType: PROJECT_TYPES.includes(source.projectType as ProjectType)
      ? (source.projectType as ProjectType)
      : base.projectType,
    projectName: typeof source.projectName === "string" ? source.projectName : "",
    days: num(source.days, base.days),
    dailyRate: num(source.dailyRate, base.dailyRate),
    shootingHours: num(source.shootingHours, base.shootingHours),
    prepHours: num(source.prepHours, base.prepHours),
    videos: num(source.videos, base.videos),
    editHoursPerVideo: num(source.editHoursPerVideo, base.editHoursPerVideo),
    editHourlyRate: num(source.editHourlyRate, base.editHourlyRate),
    reviewHours: num(source.reviewHours, base.reviewHours),
    externalCosts: costs,
    operationalPercent: num(source.operationalPercent, base.operationalPercent),
    marginPercent: num(source.marginPercent, base.marginPercent),
  };
}

export function titleOf(data: BudgetData) {
  return data.projectName.trim() || data.projectType;
}
