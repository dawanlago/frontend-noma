/** Modelo de dados da Calculadora de Orçamento (documento salvo no servidor). */

/** Tipos iniciais; a lista real é configurável (Configurações → Listas de opções). */
export const PROJECT_TYPES = [
  "Conteúdo para redes sociais",
  "Evento",
  "Vídeo institucional",
  "Captação avulsa",
  "Edição",
  "Outro",
] as const;

export type ProjectType = string;

export const OPERATIONAL_OPTIONS = [0, 5, 10, 15, 20] as const;
export const MARGIN_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const MARGIN_SHORTCUTS = [20, 30, 50, 70, 100] as const;

/** Formato antigo dos custos externos (só nome + valor); convertido em `items` ao abrir. */
export interface ExternalCost {
  id: string;
  name: string;
  value: number;
}

/** Unidades sugeridas para os itens (o campo aceita qualquer texto salvo). */
export const BUDGET_UNITS = ["unidade", "diária", "hora", "vídeo", "foto", "mês", "km", "verba"] as const;

const UNIT_PLURALS: Record<string, string> = {
  unidade: "unidades",
  "diária": "diárias",
  hora: "horas",
  "vídeo": "vídeos",
  foto: "fotos",
  "mês": "meses",
  km: "km",
  verba: "verbas",
};

/** "1 diária", "2 diárias", "1,5 hora"... */
export function formatQuantity(quantity: number, unit: string) {
  const text = String(Math.round(quantity * 100) / 100).replace(".", ",");
  const label = quantity > 1 ? UNIT_PLURALS[unit] || unit : unit;
  return label ? `${text} ${label}` : text;
}

/** Linha livre do orçamento: profissional ou custo (quantidade × valor unitário). */
export interface BudgetItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitValue: number;
}

/** Campos fixos que podem ser removidos de um orçamento (os valores ficam guardados). */
export type FixedFieldKey = "production" | "shootingHours" | "prepHours" | "postProduction" | "reviewHours";

export const FIXED_FIELDS: { key: FixedFieldKey; label: string; hint: string }[] = [
  { key: "production", label: "Diárias de produção", hint: "Quantidade de diárias × valor da diária" },
  { key: "shootingHours", label: "Horas de captação", hint: "Entram nas horas totais" },
  { key: "prepHours", label: "Horas de preparação", hint: "Roteiro, visita técnica, equipamento" },
  { key: "postProduction", label: "Edição por vídeo", hint: "Vídeos × horas por vídeo × valor da hora" },
  { key: "reviewHours", label: "Horas de reunião/revisão", hint: "Entram nas horas totais" },
];

const FIXED_KEYS = FIXED_FIELDS.map((field) => field.key);

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
  /** Profissionais e custos (substitui os antigos custos externos) */
  items: BudgetItem[];
  /** Campos fixos removidos deste orçamento (ficam fora do cálculo) */
  hiddenFields: FixedFieldKey[];
  /** Operação e margem (percentuais inteiros) */
  operationalPercent: number;
  marginPercent: number;
}

export function newCostId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function newItem(changes: Partial<BudgetItem> = {}): BudgetItem {
  return { id: newCostId(), name: "", quantity: 1, unit: "unidade", unitValue: 0, ...changes };
}

export function defaultItems(): BudgetItem[] {
  return [
    newItem({ name: "Deslocamento", unitValue: 120 }),
    newItem({ name: "Assistente", unit: "diária", unitValue: 250 }),
    newItem({ name: "Aluguel de equipamento", unit: "diária", unitValue: 200 }),
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
    items: defaultItems(),
    hiddenFields: [],
    operationalPercent: 5,
    marginPercent: 40,
  };
}

function num(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

type StoredBudget = Partial<BudgetData> & { externalCosts?: Partial<ExternalCost>[] };

function normalizeItems(source: StoredBudget, fallback: BudgetItem[]): BudgetItem[] {
  if (Array.isArray(source.items)) {
    return source.items.map((item) => ({
      id: item?.id || newCostId(),
      name: typeof item?.name === "string" ? item.name : "",
      quantity: num(item?.quantity, 1),
      unit: typeof item?.unit === "string" ? item.unit : "unidade",
      unitValue: num(item?.unitValue, 0),
    }));
  }
  // Orçamentos antigos: cada custo externo vira 1 unidade × valor (mesmo total).
  if (Array.isArray(source.externalCosts)) {
    return source.externalCosts.map((cost) =>
      newItem({
        id: cost?.id || newCostId(),
        name: typeof cost?.name === "string" ? cost.name : "",
        unitValue: num(cost?.value, 0),
      }),
    );
  }
  return fallback;
}

/** Mescla um documento salvo (possivelmente antigo/incompleto) com os padrões. */
export function normalize(partial: Partial<BudgetData>): BudgetData {
  const base = defaultData();
  const source: StoredBudget = partial || {};
  const hiddenFields = Array.isArray(source.hiddenFields)
    ? FIXED_KEYS.filter((key) => source.hiddenFields!.includes(key))
    : [];

  return {
    projectType: typeof source.projectType === "string" && source.projectType.trim() ? source.projectType : base.projectType,
    projectName: typeof source.projectName === "string" ? source.projectName : "",
    days: num(source.days, base.days),
    dailyRate: num(source.dailyRate, base.dailyRate),
    shootingHours: num(source.shootingHours, base.shootingHours),
    prepHours: num(source.prepHours, base.prepHours),
    videos: num(source.videos, base.videos),
    editHoursPerVideo: num(source.editHoursPerVideo, base.editHoursPerVideo),
    editHourlyRate: num(source.editHourlyRate, base.editHourlyRate),
    reviewHours: num(source.reviewHours, base.reviewHours),
    items: normalizeItems(source, base.items),
    hiddenFields,
    operationalPercent: num(source.operationalPercent, base.operationalPercent),
    marginPercent: num(source.marginPercent, base.marginPercent),
  };
}

export function titleOf(data: BudgetData) {
  return data.projectName.trim() || data.projectType;
}
