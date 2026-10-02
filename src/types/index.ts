export type UserRole = "admin" | "manager" | "seller";
export type TransactionType = "income" | "expense";
export type FinanceStatus = "received" | "pending" | "paid" | "planned";
export type ToolKey = "proposal" | "contract" | "budget" | "briefing";
export type StageKind = "open" | "won" | "lost";
export type LeadStatus = StageKind;
export type LeadTemperature = "cold" | "warm" | "hot";

export type ModuleKey =
  | "crm"
  | "atividades"
  | "agenda"
  | "nps"
  | "anotacoes"
  | "formularios"
  | "prospeccao"
  | "followup"
  | "propostas"
  | "orcamento"
  | "contratos"
  | "briefing"
  | "financeiro"
  | "base"
  | "produtos"
  | "configuracoes";

/** Registros com dono. `ownerName` vem preenchido pela API. */
export interface Owned {
  ownerId: string;
  ownerName?: string;
}

/** Até onde o usuário enxerga num módulo: nada, só o que criou, ou tudo da empresa. */
export type AccessLevel = "none" | "own" | "all";

/** Empresa do grupo (Noma, Brava...) que o usuário pode abrir. */
export interface OrgSummary {
  _id: string;
  name: string;
  logo: string;
  color: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserMembership {
  orgId: string;
  role: UserRole;
  access: Record<ModuleKey, AccessLevel>;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  /** Papel na empresa ativa. */
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  /** Módulos liberados na empresa ativa. */
  permissions: ModuleKey[];
  /** Nível de acesso por módulo na empresa ativa. */
  access?: Record<ModuleKey, AccessLevel>;
  /** Em /auth/me: empresa ativa e as que o usuário pode abrir. */
  orgId?: string;
  orgs?: OrgSummary[];
  /** Administrador geral: cria empresas e é admin em todas. */
  isSuperAdmin?: boolean;
  /** Na tela de usuários: acesso da pessoa em cada empresa que o administrador gerencia. */
  memberships?: UserMembership[];
  createdAt: string;
  updatedAt: string;
}

export type CustomValues = Record<string, string | string[]>;

export interface Company {
  _id: string;
  name: string;
  taxId: string;
  logo: string;
  niche: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  affinity: number;
  kinds: string[];
  supplierCategory: string;
  pixKey: string;
  notes: string;
  custom: CustomValues;
  isActive: boolean;
  contactsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  /** YYYY-MM-DD */
  birthDate: string;
  photo: string;
  niche: string;
  jobRole: string;
  instagram: string;
  /** Nome de exibição é `name`; estes são o nome completo e o apelido. */
  fullName?: string;
  nickname?: string;
  /** Cidade/UF. */
  location?: string;
  /** Origem do lead (lista `leadSource`). */
  leadSource?: string;
  /** Empresa principal (a primeira de `companyIds`). */
  companyId?: string;
  companyIds?: string[];
  affinity: number;
  kinds: string[];
  supplierCategory: string;
  pixKey: string;
  notes: string;
  custom: CustomValues;
  createdAt: string;
  updatedAt: string;
}

/** Contato já cadastrado com o mesmo telefone/e-mail (resposta 409 ao salvar). */
export type ContactDuplicate = Pick<Contact, "_id" | "name" | "phone" | "email"> & { field?: "phone" | "email" };

export interface DuplicateGroup {
  key: string;
  fields: ("phone" | "email")[];
  contacts: (Pick<Contact, "_id" | "name" | "fullName" | "phone" | "email" | "companyId" | "kinds" | "createdAt"> & { leadsCount: number })[];
}

export type RelationKind = "contact" | "company" | "lead";

/** Relação de um registro com outro, vista a partir do registro aberto. */
export interface RelationItem {
  _id: string;
  type: string;
  note: string;
  /** "out": este registro é [tipo] do outro; "in": o outro é [tipo] deste. */
  direction: "out" | "in";
  other: { kind: RelationKind; id: string; name: string; image: string };
  createdAt: string;
}

/** Linha de custo do produto (a soma das linhas é o custo operacional). */
export interface ProductCost {
  label: string;
  value: number;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  /** Categoria (lista "productCategory"). */
  category?: string;
  costs?: ProductCost[];
  operationalCost: number;
  profit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** Microetapa: subdivisão de uma etapa do funil. */
export interface FunnelSubStage {
  _id: string;
  name: string;
}

export interface FunnelStage {
  _id: string;
  name: string;
  kind: StageKind;
  color: string;
  subStages?: FunnelSubStage[];
}

export interface Funnel {
  _id: string;
  name: string;
  order: number;
  stages: FunnelStage[];
}

export interface LeadProduct {
  productId?: string;
  name: string;
  /** Descrição só desta negociação. */
  description?: string;
  price: number;
}

export interface LeadComment {
  _id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  editedAt?: string;
}

export interface LeadHistory {
  at: string;
  text: string;
  userName: string;
}

export interface Lead extends Owned {
  _id: string;
  /** Quem criou a negociação (`ownerId` é o responsável). */
  createdBy?: string;
  createdByName?: string;
  /** Motivo da perda (lista "lostReason") e observação. */
  lostReason?: string;
  lostNote?: string;
  name: string;
  contactId?: string;
  companyId?: string;
  contactName: string;
  company: string;
  funnelId: string;
  stageId: string;
  status: LeadStatus;
  service: string;
  products: LeadProduct[];
  customValue: number;
  value: number;
  temperature: LeadTemperature;
  nextActionDate?: string;
  source: string;
  notes: string;
  custom: CustomValues;
  /** Só no detalhe da negociação. */
  comments?: LeadComment[];
  history?: LeadHistory[];
  /** Só na listagem. */
  commentsCount?: number;
  wonAt?: string;
  lostAt?: string;
  /** Quando entrou no funil atual e na etapa atual. */
  funnelEnteredAt?: string;
  stageEnteredAt?: string;
  /** Microetapa atual e desde quando está nela. */
  subStageId?: string;
  subStageEnteredAt?: string;
  /** Último parecer ou atividade concluída. */
  lastContactAt?: string;
  /** Fechamento: valor oferecido e valor fechado (a diferença é o desconto). */
  offeredValue?: number;
  closedValue?: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface Task extends Owned {
  _id: string;
  title: string;
  /** Valor da lista `taskType` (reunião, ligação...). */
  type?: string;
  /** YYYY-MM-DD ou vazio. */
  dueDate: string;
  /** HH:MM ou vazio. */
  time: string;
  status: TaskStatus;
  done: boolean;
  doneAt?: string;
  leadId?: string;
  leadName?: string;
  notes: string;
  /** Duração em minutos (compromissos com hora). */
  duration?: number;
  /** Evento no Google Agenda do responsável, quando sincronizado. */
  googleEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteGroup {
  _id: string;
  name: string;
  order: number;
}

export interface Note {
  _id: string;
  ownerId: string;
  ownerName: string;
  groupId?: string;
  title: string;
  content: string;
  order: number;
  shares: { userId: string; name: string }[];
  updatedAt: string;
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox";
export type FormFieldTarget = "" | "name" | "email" | "phone" | "company" | "instagram";

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  target: FormFieldTarget;
}

export interface CaptureForm extends Owned {
  _id: string;
  name: string;
  description: string;
  publicId: string;
  isActive: boolean;
  fields: FormField[];
  successMessage: string;
  /** Aparência própria do link (vazio = identidade da produtora). */
  logo?: string;
  accentColor?: string;
  createLead: boolean;
  funnelId?: string;
  stageId?: string;
  responsesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponse {
  _id: string;
  formId: string;
  answers: Record<string, string | string[] | boolean>;
  contactId?: string;
  leadId?: string;
  createdAt: string;
}

export interface FinanceEntry extends Owned {
  _id: string;
  type: TransactionType;
  description: string;
  client: string;
  category: string;
  value: number;
  /** YYYY-MM-DD */
  date: string;
  status: FinanceStatus;
  payment: string;
  cashbox: string;
  bank: string;
  notes: string;
  installment?: { number: number; total: number };
  recurringId?: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  /** Já distribuída nas caixas de distribuição (só na listagem do mês). */
  distributed?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Caixa de distribuição (Operacional, Imposto, Lucro...) com o saldo acumulado. */
export interface DistributionBucket {
  _id: string;
  name: string;
  percentage: number;
  color: string;
  order: number;
  received?: number;
  withdrawn?: number;
  balance?: number;
}

export interface BucketMovement extends Owned {
  _id: string;
  kind: "in" | "out";
  bucketId: string;
  bucketName: string;
  value: number;
  percentage?: number;
  date: string;
  description: string;
  groupId?: string;
  entryId?: string;
  cashbox: string;
  createdAt: string;
}

export interface FinanceMonthSummary {
  month: string;
  received: number;
  expenses: number;
  result: number;
  pending: number;
}

export interface ToolDocument<T = Record<string, unknown>> extends Owned {
  _id: string;
  tool: ToolKey;
  title: string;
  data: T;
  createdAt: string;
  updatedAt: string;
  /** Só na listagem de propostas: resumo do link público. */
  share?: ProposalShareSummary | null;
}

export interface ProposalShareSummary {
  isActive: boolean;
  viewsCount: number;
  lastViewedAt: string | null;
}

/** Sessão de visualização do link público de uma proposta. */
export interface ProposalViewSession {
  _id: string;
  openedAt: string;
  lastSeenAt: string;
  durationSeconds: number;
  device: "mobile" | "tablet" | "desktop" | "unknown";
  os: string;
  browser: string;
}

export interface ProposalShare {
  link: { token: string; isActive: boolean; createdAt: string } | null;
  stats: { views: number; totalSeconds: number; firstViewedAt: string | null; lastViewedAt: string | null };
  sessions: ProposalViewSession[];
}

export interface BrandColor {
  name: string;
  hex: string;
}

export interface AppSettings {
  companyName: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeText: string;
  brand: {
    logo: string;
    colors: BrandColor[];
    defaultColor: string;
  };
}

export interface OptionItem {
  _id: string;
  list: string;
  value: string;
  label: string;
  order: number;
  color: string;
  meta: Record<string, unknown>;
}

export type CustomFieldEntity = "lead" | "contact" | "company" | "prospecting";
export type CustomFieldType = "text" | "textarea" | "number" | "date" | "select" | "multiselect";

export interface CustomField {
  _id: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  order: number;
  /** Só em negociações: vazio = todos os funis. */
  funnelId?: string;
}

export interface StoredFile extends Owned {
  _id: string;
  category: string;
  title: string;
  name: string;
  mimeType: string;
  size: number;
  /** Link do arquivo no Cloudinary. */
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  contactId?: string;
  companyId?: string;
  leadId?: string;
  notes: string;
  createdAt: string;
}

export interface ContractTemplate {
  _id: string;
  name: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface ProfileTotals {
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
  received: number;
}

export interface ProfileComment extends LeadComment {
  leadId: string;
  leadName: string;
}

export interface ProfileHistory {
  nps: Pick<NPSRating, "_id" | "rating" | "comment" | "date" | "contactId">[];
  leads: Lead[];
  comments: ProfileComment[];
  entries: FinanceEntry[];
  files: StoredFile[];
  totals: ProfileTotals;
  /** Datas calculadas pelo sistema. */
  system?: { firstLeadAt: string | null; lastInteractionAt: string | null };
}

export interface ContactProfile extends ProfileHistory {
  contact: Contact;
  company: Pick<Company, "_id" | "name" | "logo"> | null;
  /** Todas as empresas vinculadas (a primeira é a principal). */
  companies?: Pick<Company, "_id" | "name" | "logo">[];
}

export interface CompanyProfile extends ProfileHistory {
  company: Company;
  contacts: Contact[];
}

export interface NPSSurvey {
  _id: string;
  name: string;
  question: string;
  commentPrompt: string;
  thankYouMessage: string;
  /** Mensagem enviada ao cliente; aceita {nome}, {link} e {pesquisa}. */
  messageTemplate?: string;
  /** Aparência da página de resposta. */
  logo?: string;
  accentColor?: string;
  isActive: boolean;
  createdAt: string;
}

export interface NPSRating {
  _id: string;
  surveyId: string;
  contactId: string;
  companyId?: string;
  leadId?: string;
  rating: number;
  comment: string;
  date: string;
  contactName?: string;
  surveyName?: string;
  companyName?: string;
}

export interface NPSSummary {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface NPSInvite {
  _id: string;
  token: string;
  status: "pending" | "answered";
  surveyName: string;
  contactName: string;
  phone: string;
}

/** Formulário enviado numa negociação (código de 6 dígitos). */
export interface FormInvite {
  _id: string;
  code: string;
  formId: string;
  formName: string;
  status: "pending" | "submitted";
  sentAt: string;
  submittedAt?: string;
  answers: { label: string; value: string }[];
}

export interface PublicFormData {
  /** Identidade da produtora (logo e nome) no topo do formulário. */
  brand?: { logo: string; companyName: string; color: string };
  name: string;
  description: string;
  fields: FormField[];
  successMessage: string;
  /** Só nos formulários enviados pela negociação. */
  status?: "pending" | "submitted";
  contactFirstName?: string;
  prefill?: Record<string, string>;
  answers?: { label: string; value: string }[];
}

export interface Birthday {
  _id: string;
  name: string;
  birthDate: string;
  phone?: string;
  photo?: string;
  /** Data do próximo aniversário (YYYY-MM-DD). */
  date: string;
  daysUntil: number;
  age: number;
}
