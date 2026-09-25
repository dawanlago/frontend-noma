export type UserRole = "admin" | "manager" | "seller";
export type TransactionType = "income" | "expense";
export type FinanceStatus = "received" | "pending" | "paid" | "planned";
export type ToolKey = "proposal" | "contract" | "budget" | "briefing";
export type LeadStage =
  | "new"
  | "first_contact"
  | "meeting"
  | "proposal_sent"
  | "awaiting"
  | "negotiation"
  | "won";

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

export interface Product {
  _id: string;
  name: string;
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

export interface Lead extends Owned {
  _id: string;
  name: string;
  company: string;
  service: string;
  value: number;
  stage: LeadStage;
  nextActionDate?: string;
  source: string;
  notes: string;
  wonAt?: string;
  createdAt: string;
  updatedAt: string;
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
  recurringId?: string;
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

export interface LibraryCategory {
  _id: string;
  key: string;
  title: string;
  description: string;
  url: string;
  order: number;
}
