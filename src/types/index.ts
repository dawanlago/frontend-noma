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

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  /** Em /auth/me: módulos liberados. Na lista de usuários: o que foi salvo. */
  permissions: ModuleKey[];
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
  companyId?: string;
  affinity: number;
  kinds: string[];
  supplierCategory: string;
  pixKey: string;
  notes: string;
  custom: CustomValues;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
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

export interface FunnelStage {
  _id: string;
  name: string;
  kind: StageKind;
  color: string;
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
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface Task extends Owned {
  _id: string;
  title: string;
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
  createdAt: string;
  updatedAt: string;
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
}

export interface ContactProfile extends ProfileHistory {
  contact: Contact;
  company: Pick<Company, "_id" | "name" | "logo"> | null;
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
