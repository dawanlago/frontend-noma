import { api } from "./api";
import type {
  Company,
  Contact,
  FinanceEntry,
  FinanceMonthSummary,
  Label,
  Lead,
  LibraryCategory,
  Product,
  ToolDocument,
  ToolKey,
  User,
} from "@/types";

export interface ApiListResponse<T> {
  data: T[];
  meta?: Record<string, unknown>;
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface DashboardData {
  leadsCount: number;
  openPipeline: number;
  wonValue: number;
  leadsDueToday: number;
  month: string;
  monthReceived: number;
  monthExpenses: number;
  monthResult: number;
  monthPending: number;
  documents: Partial<Record<ToolKey, number>>;
}

/** Parâmetros de listagem; o admin pode filtrar por `ownerId`. */
type ListParams = Record<string, string | undefined>;

function clean(params?: ListParams) {
  return Object.fromEntries(Object.entries(params || {}).filter(([, value]) => Boolean(value)));
}

async function listData<T>(path: string, params?: ListParams) {
  const { data } = await api.get<ApiListResponse<T>>(path, { params: clean(params) });
  return data.data;
}

async function getOne<T>(path: string, params?: ListParams) {
  const { data } = await api.get<ApiItemResponse<T>>(path, { params: clean(params) });
  return data.data;
}

async function create<T>(path: string, payload: unknown) {
  const { data } = await api.post<ApiItemResponse<T>>(path, payload);
  return data.data;
}

async function update<T>(path: string, payload: unknown) {
  const { data } = await api.patch<ApiItemResponse<T>>(path, payload);
  return data.data;
}

async function remove(path: string, params?: ListParams) {
  await api.delete(path, { params: clean(params) });
}

function crud<T>(path: string) {
  return {
    list: (params?: ListParams) => listData<T>(path, params),
    get: (id: string) => getOne<T>(`${path}/${id}`),
    create: (payload: Partial<T>) => create<T>(path, payload),
    update: (id: string, payload: Partial<T>) => update<T>(`${path}/${id}`, payload),
    remove: (id: string) => remove(`${path}/${id}`),
  };
}

function toolDocuments<T>(tool: ToolKey) {
  const path = `/tools/${tool}/documents`;
  return {
    /** A listagem não traz `data`. */
    list: (params?: ListParams) => listData<Omit<ToolDocument<T>, "data">>(path, params),
    get: (id: string) => getOne<ToolDocument<T>>(`${path}/${id}`),
    create: (payload: { title: string; data: T }) => create<ToolDocument<T>>(path, payload),
    update: (id: string, payload: { title?: string; data?: T }) => update<ToolDocument<T>>(`${path}/${id}`, payload),
    duplicate: (id: string) => create<ToolDocument<T>>(`${path}/${id}/duplicate`, {}),
    remove: (id: string) => remove(`${path}/${id}`),
  };
}

export type FinanceEntryPayload = Partial<FinanceEntry> & { recurring?: boolean };

export const resources = {
  dashboard: (params?: ListParams) => getOne<DashboardData>("/dashboard", params),
  users: {
    ...crud<User>("/users"),
    create: (payload: Partial<User> & { password?: string }) => create<User>("/users", payload),
    update: (id: string, payload: Partial<User> & { password?: string }) => update<User>(`/users/${id}`, payload),
  },
  contacts: crud<Contact>("/contacts"),
  companies: crud<Company>("/companies"),
  products: crud<Product>("/products"),
  labels: crud<Label>("/labels"),
  leads: crud<Lead>("/leads"),
  finance: {
    entries: async (month: string, params?: ListParams) => {
      const { data } = await api.get<ApiListResponse<FinanceEntry>>("/finance/entries", {
        params: clean({ ...params, month }),
      });
      return { entries: data.data, goal: Number(data.meta?.goal) || 0 };
    },
    createEntry: (payload: FinanceEntryPayload) => create<FinanceEntry>("/finance/entries", payload),
    updateEntry: (id: string, payload: FinanceEntryPayload) => update<FinanceEntry>(`/finance/entries/${id}`, payload),
    /** `scope: "series"` encerra a recorrência; sem ele, só pula o mês. */
    removeEntry: (id: string, scope?: "series") => remove(`/finance/entries/${id}`, { scope }),
    summary: (year: string, params?: ListParams) =>
      getOne<{ year: string; months: FinanceMonthSummary[] }>("/finance/summary", { ...params, year }),
    setGoal: async (month: string, value: number) => {
      const { data } = await api.put<ApiItemResponse<{ value: number }>>(`/finance/goals/${month}`, { value });
      return data.data;
    },
  },
  tools: {
    proposals: toolDocuments("proposal"),
    contracts: toolDocuments("contract"),
    budgets: toolDocuments("budget"),
    briefings: toolDocuments("briefing"),
  },
  library: {
    list: () => listData<LibraryCategory>("/library"),
    update: (id: string, payload: Partial<LibraryCategory>) => update<LibraryCategory>(`/library/${id}`, payload),
  },
};
