export type UserRole = "admin" | "manager" | "seller";
export type TransactionType = "income" | "expense";
export type FinanceStatus = "received" | "pending" | "paid" | "planned";
export type ToolKey = "proposal" | "contract" | "budget" | "briefing" | "script";
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

/** Janela semanal de atendimento (0 = domingo). */
export interface WeeklyWindow {
  weekday: number;
  start: string;
  end: string;
}

/** Link de agendamento externo (o lead escolhe um horário livre). */
export interface SchedulingLink extends Owned {
  _id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  windows: WeeklyWindow[];
  blocks: { _id?: string; start: string; end: string; note: string }[];
  confirmationMessage: string;
  isActive: boolean;
}

export interface Booking extends Owned {
  _id: string;
  linkId: string;
  start: string;
  end: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: "confirmed" | "cancelled";
  taskId?: string;
  leadId?: string;
}

/** Item ocupado na agenda (compromisso, reunião marcada, bloqueio ou Google Agenda). */
export interface BusyItem {
  start: string;
  end: string;
  source: "noma" | "reserva" | "bloqueio" | "google";
  title: string;
}

export interface PublicSchedule {
  title: string;
  description: string;
  location: string;
  durationMinutes: number;
  horizonDays: number;
  ownerName: string;
  brand: { companyName: string; logo: string; color: string };
  from: string;
  slots: string[];
}

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPrefs {
  reminderMinutes: number;
  emailReminders: boolean;
  dailyDigest: boolean;
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
  /** Etapa para onde vai a negociação aberta quando o contato responde um formulário de novo. */
  qualifiedStageId?: string;
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
  /** Data do evento (do formulário) e se caiu num período sem atendimento. */
  eventDate?: string;
  eventUnavailable?: boolean;
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
  /** Markdown. */
  content: string;
  /** Revisão do título/texto (trava contra edição simultânea). */
  rev?: number;
  order: number;
  shares: NoteShare[];
  updatedAt: string;
}

export type NotePermission = "view" | "edit";

export interface NoteShare {
  userId: string;
  name: string;
  permission: NotePermission;
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
  | "checkbox"
  /** A data do evento: mostra a antecedência e confere a regra de disponibilidade. */
  | "eventDate";
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
  /** Link de agendamento oferecido ao terminar. */
  schedulingLinkId?: string;
  /** Aparência própria do link (vazio = identidade da produtora). */
  logo?: string;
  accentColor?: string;
  createLead: boolean;
  funnelId?: string;
  stageId?: string;
  /** Regra da pergunta "Data do evento". */
  availability?: FormAvailability;
  responsesCount?: number;
  /** Preenchimentos que pararam no meio. */
  partialCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormAvailability {
  /** Antecedência mínima em dias (0 = sem limite). */
  minNoticeDays: number;
  /** Datas/períodos sem atendimento (YYYY-MM-DD, `to` inclusive). */
  blockedDates: { from: string; to: string }[];
  message: string;
}

export interface FormResponse {
  _id: string;
  formId: string;
  answers: Record<string, string | string[] | boolean>;
  contactId?: string;
  leadId?: string;
  /** partial = parou no meio (salvo a cada pergunta). Sem campo = completa. */
  status?: "partial" | "complete";
  lastStep?: number;
  stepsAnswered?: number;
  /** Histórico do preenchimento: cada pergunta respondida. */
  events?: { at: string; fieldKey: string; value: string }[];
  completedAt?: string;
  eventDate?: string;
  daysUntilEvent?: number;
  unavailable?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  /** Data em que foi recebida/paga (YYYY-MM-DD); `date` é o vencimento. */
  paidAt?: string;
  /** Juros/multa cobrados por receber depois do vencimento (somam no recebido). */
  lateCharge?: LateCharge;
  /** Atraso perdoado: recebida depois do vencimento sem juros/multa. */
  lateChargeWaived?: boolean;
  /** A receber vencida: juros/multa se for paga hoje (só na listagem do mês). */
  projectedLateCharge?: LateCharge;
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
  acceptedAt?: string | null;
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

export type ProposalEventType = "link_created" | "link_enabled" | "link_disabled" | "link_regenerated" | "viewed" | "accepted";

/** Item do histórico do link público (ações da equipe, aberturas e aceite do cliente). */
export interface ProposalEvent {
  _id: string;
  type: ProposalEventType;
  at: string;
  actorName: string;
  comment: string;
  device: ProposalViewSession["device"] | "";
  os: string;
  browser: string;
}

export interface ProposalAcceptance {
  at: string;
  name: string;
  comment?: string;
}

export interface ProposalShare {
  link: { token: string; isActive: boolean; createdAt: string } | null;
  stats: { views: number; totalSeconds: number; firstViewedAt: string | null; lastViewedAt: string | null };
  sessions: ProposalViewSession[];
  accepted?: ProposalAcceptance | null;
  events?: ProposalEvent[];
}

export interface BrandColor {
  name: string;
  hex: string;
}

export interface LateCharge {
  days: number;
  fee: number;
  interest: number;
  total: number;
}

/** Juros/multa por atraso de recebimentos (0 = não cobra). */
export interface LateChargeRules {
  /** Multa em % do valor. */
  lateFee: number;
  /** Juros ao mês em % (pro rata die). */
  monthlyInterest: number;
  graceDays: number;
}

export interface WeeklyReportSettings {
  enabled: boolean;
  recipients: string[];
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
  /** Hora de Brasília (0–23). */
  hour: number;
  lastSentAt?: string;
}

export interface AppSettings {
  finance?: LateChargeRules;
  weeklyReport?: WeeklyReportSettings;
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
  /** Link de agendamento oferecido no fim (vazio = não oferece). */
  schedulingSlug?: string;
  /** Identidade da produtora (logo e nome) no topo do formulário. */
  brand?: { logo: string; companyName: string; color: string };
  name: string;
  description: string;
  fields: FormField[];
  successMessage: string;
  /** Só nos formulários enviados pela negociação. */
  status?: "pending" | "submitted";
  contactFirstName?: string;
  prefill?: Record<string, string | string[] | boolean>;
  /** Pergunta em que a pessoa parou (progresso salvo). */
  lastStep?: number;
  availability?: FormAvailability;
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
