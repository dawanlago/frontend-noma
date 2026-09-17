export type UserRole = "admin" | "manager" | "seller";
export type DealTemperature = "cold" | "warm" | "hot";
export type StageType = "agenda" | "closure" | "general";
export type TransactionType = "income" | "expense";
export type DealSource = "whatsapp" | "instagram" | "landing_page" | "manual";
export type TaskStatus = "todo" | "doing" | "done";
export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "select"
  | "multiselect"
  | "boolean";
export type NotificationType =
  | "deal_assigned"
  | "owner_changed"
  | "task_created"
  | "deal_stage_changed"
  | "form_submitted"
  | "finance_reverted";
export type NotePermission = "view" | "edit";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  _id: string;
  name: string;
  taxId: string;
  isActive: boolean;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  _id: string;
  name: string;
  order: number;
  type: StageType;
}

export interface Funnel {
  _id: string;
  name: string;
  stages: FunnelStage[];
  createdAt: string;
  updatedAt: string;
}

export interface DealNote {
  _id: string;
  stageId: string;
  date: string;
  text: string;
  userId: string;
}

export interface DealDossier {
  manualNotes: string;
  aiSummary: string;
  aiGeneratedAt?: string;
  aiModel?: string;
}

export interface Deal {
  _id: string;
  title: string;
  contactId: string;
  companyId?: string;
  funnelId: string;
  currentStageId: string;
  value: number;
  temperature: DealTemperature;
  productIds: string[];
  creatorUserId: string;
  ownerUserId?: string;
  closedTransactionId?: string;
  files: string[];
  notes: DealNote[];
  taskIds: string[];
  labelIds: string[];
  source: DealSource;
  dossier?: DealDossier;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  operationalCost: number;
  profit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCalculation {
  operational: number;
  marketing10: number;
  tax8: number;
  equipment7: number;
  cash5: number;
  profit25: number;
}

export interface TransactionDistribution {
  categoryId?: string;
  categoryName: string;
  percentage: number;
  value: number;
}

export interface Transaction {
  _id: string;
  type: TransactionType;
  dealId?: string;
  value: number;
  description?: string;
  category?: string;
  productCalculation?: ProductCalculation;
  distribution?: TransactionDistribution[];
  date: string;
  userId: string;
  deal?: { title: string; funnelId: string };
  createdAt: string;
  updatedAt: string;
}

export interface FinancialCategory {
  _id: string;
  name: string;
  percentage: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  dealId?: string;
  title: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
  isCompleted: boolean;
  googleEventId?: string;
  googleSyncedAt?: string;
  userId: string;
  deal?: { title: string; funnelId: string };
  createdAt: string;
  updatedAt: string;
}

export interface NPSSurvey {
  _id: string;
  name: string;
  question: string;
  commentPrompt?: string;
  thankYouMessage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NPSInvite {
  _id: string;
  token: string;
  url: string;
  status: "pending" | "answered";
  survey: { _id: string; name: string };
  contact: { _id: string; name: string };
}

export interface NPSPublicInvite {
  status: "pending" | "answered";
  contactFirstName: string;
  survey: {
    name: string;
    question: string;
    commentPrompt: string;
    thankYouMessage: string;
  };
}

export interface NPSRating {
  _id: string;
  surveyId?: string;
  inviteId?: string;
  contactId: string;
  companyId?: string;
  dealId?: string;
  rating: number;
  comment?: string;
  date: string;
  contact?: { name: string };
  survey?: { name: string };
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  order: number;
}

export interface Form {
  _id: string;
  name: string;
  funnelId?: string;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FormAnswer {
  key: string;
  label: string;
  type: FormFieldType;
  value: unknown;
}

export interface FormResponse {
  _id: string;
  formId: string;
  dealId: string;
  contactId: string;
  answers: FormAnswer[];
  submittedAt: string;
}

export type FormInviteStatus = "pending" | "submitted";

export interface FormInvite {
  _id: string;
  code: string;
  formId: string;
  formName: string;
  dealId: string;
  contactId: string;
  status: FormInviteStatus;
  url: string;
  sentAt: string;
  submittedAt?: string;
  response?: FormResponse | null;
  emailed?: boolean;
}

export interface PublicFormInvite {
  code: string;
  status: FormInviteStatus;
  form: Pick<Form, "_id" | "name" | "fields">;
  contactFirstName: string;
  prefill: Record<string, string>;
  answers: FormAnswer[];
}

export interface Label {
  _id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  dealId?: string;
  taskId?: string;
  readAt?: string;
  createdAt: string;
}

export interface NoteGroup {
  _id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteShare {
  userId: string | User;
  permission: NotePermission;
}

export interface Note {
  _id: string;
  userId: string;
  groupId?: string;
  title: string;
  content: string;
  shares: NoteShare[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceDashboard {
  totalSold: number;
  totalMoved: number;
  totalExpense: number;
  balance: number;
  salesCount: number;
  byCategory: Array<{ name: string; value: number }>;
  evolution: Array<{ period: string; sold: number; moved: number; sales: number }>;
  transactions: Transaction[];
}
