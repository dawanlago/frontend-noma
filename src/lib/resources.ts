import { api } from "./api";
import type {
  AppSettings,
  CaptureForm,
  Company,
  CompanyProfile,
  Contact,
  ContactProfile,
  ContractTemplate,
  CustomField,
  FinanceEntry,
  FinanceMonthSummary,
  FormResponse,
  Funnel,
  Label,
  Lead,
  LeadStatus,
  LibraryCategory,
  Note,
  NoteGroup,
  OptionItem,
  Product,
  StoredFile,
  Task,
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
  /** null quando o usuário não tem acesso ao financeiro. */
  finance: {
    monthReceived: number;
    monthExpenses: number;
    monthResult: number;
    monthPending: number;
  } | null;
  documents: Partial<Record<ToolKey, number>>;
  tasks: {
    pending: number;
    overdue: number;
    preview: Task[];
  };
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
export type LeadPayload = Partial<Omit<Lead, "nextActionDate">> & { nextActionDate?: string | null };

export const resources = {
  dashboard: (params?: ListParams) => getOne<DashboardData>("/dashboard", params),
  settings: {
    get: () => getOne<AppSettings>("/settings"),
    update: (payload: Partial<AppSettings>) => update<AppSettings>("/settings", payload),
  },
  options: {
    list: (lists?: string[]) => listData<OptionItem>("/options", { lists: lists?.join(",") }),
    create: (payload: Pick<OptionItem, "list" | "label"> & Partial<Pick<OptionItem, "color" | "meta">>) =>
      create<OptionItem>("/options", payload),
    update: (id: string, payload: Partial<Pick<OptionItem, "label" | "color" | "meta">>) =>
      update<OptionItem>(`/options/${id}`, payload),
    remove: (id: string) => remove(`/options/${id}`),
    reorder: async (list: string, ids: string[]) => {
      await api.put("/options/reorder", { list, ids });
    },
  },
  customFields: crud<CustomField>("/custom-fields"),
  users: {
    ...crud<User>("/users"),
    create: (payload: Partial<User> & { password?: string }) => create<User>("/users", payload),
    update: (id: string, payload: Partial<User> & { password?: string }) => update<User>(`/users/${id}`, payload),
  },
  contacts: {
    ...crud<Contact>("/contacts"),
    profile: (id: string) => getOne<ContactProfile>(`/contacts/${id}/profile`),
  },
  companies: {
    ...crud<Company>("/companies"),
    profile: (id: string) => getOne<CompanyProfile>(`/companies/${id}/profile`),
  },
  products: crud<Product>("/products"),
  labels: crud<Label>("/labels"),
  funnels: crud<Funnel>("/funnels"),
  leads: {
    list: (params?: ListParams) => listData<Lead>("/leads", params),
    get: (id: string) => getOne<Lead>(`/leads/${id}`),
    create: (payload: LeadPayload) => create<Lead>("/leads", payload),
    update: (id: string, payload: LeadPayload) => update<Lead>(`/leads/${id}`, payload),
    remove: (id: string) => remove(`/leads/${id}`),
    setStatus: (id: string, status: LeadStatus) => create<Lead>(`/leads/${id}/status`, { status }),
    addComment: (id: string, text: string) => create<Lead>(`/leads/${id}/comments`, { text }),
    updateComment: (id: string, commentId: string, text: string) =>
      update<Lead>(`/leads/${id}/comments/${commentId}`, { text }),
    removeComment: async (id: string, commentId: string) => {
      const { data } = await api.delete<ApiItemResponse<Lead>>(`/leads/${id}/comments/${commentId}`);
      return data.data;
    },
  },
  tasks: crud<Task>("/tasks"),
  notes: {
    board: () => getOne<{ groups: NoteGroup[]; notes: Note[] }>("/notes/board"),
    create: (payload: Partial<Note>) => create<Note>("/notes", payload),
    update: (id: string, payload: Partial<Note>) => update<Note>(`/notes/${id}`, payload),
    remove: (id: string) => remove(`/notes/${id}`),
    move: async (noteId: string, groupId: string, orderedIds: string[]) => {
      await api.put("/notes/move", { noteId, groupId, orderedIds });
    },
    createGroup: (payload: Partial<NoteGroup>) => create<NoteGroup>("/note-groups", payload),
    updateGroup: (id: string, payload: Partial<NoteGroup>) => update<NoteGroup>(`/note-groups/${id}`, payload),
    removeGroup: (id: string) => remove(`/note-groups/${id}`),
    reorderGroups: async (ids: string[]) => {
      await api.put("/note-groups/reorder", { ids });
    },
  },
  forms: {
    ...crud<CaptureForm>("/forms"),
    responses: (id: string) => listData<FormResponse>(`/forms/${id}/responses`),
    removeResponse: (id: string, responseId: string) => remove(`/forms/${id}/responses/${responseId}`),
  },
  publicForms: {
    get: (publicId: string) =>
      getOne<Pick<CaptureForm, "name" | "description" | "fields" | "successMessage">>(`/public/forms/${publicId}`),
    submit: (publicId: string, answers: Record<string, unknown>, website = "") =>
      create<{ message: string }>(`/public/forms/${publicId}/responses`, { answers, website }),
  },
  finance: {
    entries: async (month: string, params?: ListParams) => {
      const { data } = await api.get<ApiListResponse<FinanceEntry>>("/finance/entries", {
        params: clean({ ...params, month }),
      });
      return { entries: data.data, goal: Number(data.meta?.goal) || 0 };
    },
    yearEntries: (year: string, params?: ListParams) => listData<FinanceEntry>("/finance/entries", { ...params, year }),
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
  contractTemplates: crud<ContractTemplate>("/contract-templates"),
  files: {
    list: (params?: ListParams) => listData<StoredFile>("/files", params),
    start: (payload: Partial<StoredFile>) => create<StoredFile>("/files", payload),
    putChunk: async (id: string, n: number, data: string) => {
      await api.put(`/files/${id}/chunks/${n}`, { data });
    },
    complete: (id: string) => create<StoredFile>(`/files/${id}/complete`, {}),
    getChunk: (id: string, n: number) => getOne<string>(`/files/${id}/chunks/${n}`),
    update: (id: string, payload: Partial<StoredFile>) => update<StoredFile>(`/files/${id}`, payload),
    remove: (id: string) => remove(`/files/${id}`),
  },
  library: {
    list: () => listData<LibraryCategory>("/library"),
    update: (id: string, payload: Partial<LibraryCategory>) => update<LibraryCategory>(`/library/${id}`, payload),
  },
};
