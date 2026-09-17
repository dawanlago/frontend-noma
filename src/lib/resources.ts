import { api, publicApi } from "./api";
import type {
  AppNotification,
  Company,
  Contact,
  Deal,
  DealDossier,
  FinanceDashboard,
  FinancialCategory,
  Form,
  FormInvite,
  FormResponse,
  Funnel,
  Label,
  Note,
  NoteGroup,
  NPSInvite,
  NPSPublicInvite,
  NPSRating,
  NPSSurvey,
  Product,
  PublicFormInvite,
  Task,
  Transaction,
  User,
} from "@/types";

export interface ApiListResponse<T> {
  data: T[];
  meta?: Record<string, unknown>;
}

export interface ApiItemResponse<T> {
  data: T;
  meta?: {
    financeRemoved?: boolean;
    message?: string;
  };
}

export interface DashboardData {
  openDeals: number;
  pipelineValue: number;
  activeCompanies: number;
  averageNps: number | null;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  monthlyBalance: number | null;
  funnelsCount: number;
  recentDeals: Deal[];
  canViewFinance: boolean;
}

export interface KanbanStage {
  _id: string;
  name: string;
  order: number;
  type: string;
  deals: Deal[];
  totalValue: number;
}

export interface KanbanData {
  funnel: Funnel;
  stages: KanbanStage[];
  totalValue: number;
}

export interface DealDetail extends Deal {
  contact?: Contact;
  company?: Company;
  funnel?: Funnel;
  tasks?: Task[];
  creator?: User;
  owner?: User | null;
  formResponses?: FormResponse[];
  formInvites?: FormInvite[];
  notesDetailed?: Array<{
    _id: string;
    stageId: string;
    date: string;
    text: string;
    userId: string;
    user?: User | null;
    stage?: { name: string } | null;
  }>;
}

async function list<T>(path: string, params?: Record<string, string>) {
  const { data } = await api.get<ApiListResponse<T>>(path, { params });
  return data;
}

async function listData<T>(path: string, params?: Record<string, string>) {
  const { data } = await api.get<ApiListResponse<T>>(path, { params });
  return data.data;
}

async function getOne<T>(path: string) {
  const { data } = await api.get<ApiItemResponse<T>>(path);
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

async function remove(path: string) {
  await api.delete(path);
}

export const resources = {
  dashboard: () => getOne<DashboardData>("/dashboard"),
  contacts: {
    list: () => listData<Contact>("/contacts"),
    create: (payload: Partial<Contact>) => create<Contact>("/contacts", payload),
    update: (id: string, payload: Partial<Contact>) => update<Contact>(`/contacts/${id}`, payload),
    remove: (id: string) => remove(`/contacts/${id}`),
  },
  companies: {
    list: () => listData<Company>("/companies"),
    create: (payload: Partial<Company>) => create<Company>("/companies", payload),
    update: (id: string, payload: Partial<Company>) => update<Company>(`/companies/${id}`, payload),
    remove: (id: string) => remove(`/companies/${id}`),
  },
  products: {
    list: () => listData<Product>("/products"),
    create: (payload: Partial<Product>) => create<Product>("/products", payload),
    update: (id: string, payload: Partial<Product>) => update<Product>(`/products/${id}`, payload),
    remove: (id: string) => remove(`/products/${id}`),
  },
  users: {
    list: () => listData<User>("/users"),
    create: (payload: Partial<User> & { password?: string }) => create<User>("/users", payload),
    update: (id: string, payload: Partial<User> & { password?: string }) =>
      update<User>(`/users/${id}`, payload),
    remove: (id: string) => remove(`/users/${id}`),
  },
  funnels: {
    list: () => listData<Funnel>("/funnels"),
    create: (payload: Partial<Funnel>) => create<Funnel>("/funnels", payload),
    update: (id: string, payload: Partial<Funnel>) => update<Funnel>(`/funnels/${id}`, payload),
    remove: (id: string) => remove(`/funnels/${id}`),
    kanban: (funnelId: string) => getOne<KanbanData>(`/funnels/${funnelId}/kanban`),
  },
  deals: {
    list: (funnelId?: string) => listData<Deal>("/deals", funnelId ? { funnelId } : undefined),
    create: (payload: Record<string, unknown>) => create<Deal>("/deals", payload),
    get: (id: string) => getOne<DealDetail>(`/deals/${id}`),
    update: (id: string, payload: Partial<Deal>) => update<Deal>(`/deals/${id}`, payload),
    remove: (id: string) => remove(`/deals/${id}`),
    moveStage: async (id: string, stageId: string, extra?: { movementDate?: string }) => {
      const { data } = await api.patch<ApiItemResponse<Deal>>(`/deals/${id}/stage`, { stageId, ...extra });
      return data;
    },
    addNote: (id: string, text: string) => create<{ _id: string }>(`/deals/${id}/notes`, { text }),
    addFile: (id: string, payload: { fileName: string; contentBase64: string } | { url: string }) =>
      create<string[]>(`/deals/${id}/files`, payload),
    removeFile: (id: string, fileRef: string) =>
      api.delete<ApiItemResponse<string[]>>(`/deals/${id}/files/${encodeURIComponent(fileRef)}`).then((r) => r.data.data),
    sendForm: (id: string, formId: string) => create<FormInvite>(`/deals/${id}/form-invites`, { formId }),
    dossier: {
      get: (id: string) =>
        getOne<{
          dossier: DealDossier;
          contact: Contact | null;
          company: Company | null;
          notes: Deal["notes"];
          formResponses: FormResponse[];
          aiConfigured: boolean;
        }>(`/deals/${id}/dossier`),
      update: (id: string, payload: { manualNotes: string }) =>
        update<DealDossier>(`/deals/${id}/dossier`, payload),
      generate: (id: string) => create<DealDossier>(`/deals/${id}/dossier/generate`, {}),
    },
  },
  transactions: {
    list: () => listData<Transaction>("/transactions"),
    create: (payload: Partial<Transaction>) => create<Transaction>("/transactions", payload),
    update: (id: string, payload: Partial<Transaction>) => update<Transaction>(`/transactions/${id}`, payload),
    remove: (id: string) => remove(`/transactions/${id}`),
  },
  finance: {
    categories: {
      list: async () => {
        const response = await list<FinancialCategory>("/finance/categories");
        return {
          data: response.data,
          meta: (response.meta || { activeSum: 0, readyForDistribution: false }) as {
            activeSum: number;
            readyForDistribution: boolean;
          },
        };
      },
      create: (payload: Partial<FinancialCategory>) =>
        create<FinancialCategory>("/finance/categories", payload),
      update: (id: string, payload: Partial<FinancialCategory>) =>
        update<FinancialCategory>(`/finance/categories/${id}`, payload),
      remove: (id: string) => remove(`/finance/categories/${id}`),
    },
    dashboard: (params?: Record<string, string>) =>
      getOne<FinanceDashboard>("/finance/dashboard" + (params ? `?${new URLSearchParams(params)}` : "")),
  },
  tasks: {
    list: (params?: { dealId?: string; status?: string }) =>
      listData<Task>(
        "/tasks",
        Object.fromEntries(Object.entries(params || {}).filter(([, value]) => Boolean(value))) as Record<string, string>,
      ),
    create: (payload: Partial<Task>) => create<Task>("/tasks", payload),
    update: (id: string, payload: Partial<Task>) => update<Task>(`/tasks/${id}`, payload),
    toggle: (id: string) => update<Task>(`/tasks/${id}/toggle`, {}),
    setStatus: (id: string, status: string) => update<Task>(`/tasks/${id}/status`, { status }),
    remove: (id: string) => remove(`/tasks/${id}`),
  },
  nps: {
    list: () => listData<NPSRating>("/nps"),
    remove: (id: string) => remove(`/nps/${id}`),
    surveys: {
      list: () => listData<NPSSurvey>("/nps/surveys"),
      create: (payload: Partial<NPSSurvey>) => create<NPSSurvey>("/nps/surveys", payload),
      update: (id: string, payload: Partial<NPSSurvey>) => update<NPSSurvey>(`/nps/surveys/${id}`, payload),
      remove: (id: string) => remove(`/nps/${id}`),
    },
    createInvite: (payload: { surveyId: string; contactId: string }) =>
      create<NPSInvite>("/nps/invites", payload),
    public: {
      get: async (token: string) => {
        const { data } = await publicApi.get<ApiItemResponse<NPSPublicInvite>>(`/nps/invites/${token}`);
        return data.data;
      },
      respond: async (token: string, payload: { rating: number; comment?: string }) => {
        const { data } = await publicApi.post<ApiItemResponse<{ ok: boolean }>>(
          `/nps/invites/${token}/respond`,
          payload,
        );
        return data.data;
      },
    },
  },
  forms: {
    list: () => listData<Form>("/forms"),
    create: (payload: Partial<Form>) => create<Form>("/forms", payload),
    update: (id: string, payload: Partial<Form>) => update<Form>(`/forms/${id}`, payload),
    remove: (id: string) => remove(`/forms/${id}`),
    public: {
      get: async (id: string) => {
        const { data } = await publicApi.get<ApiItemResponse<Pick<Form, "_id" | "name" | "fields">>>(`/forms/${id}/public`);
        return data.data;
      },
      submit: async (id: string, responses: Record<string, unknown>) => {
        const { data } = await publicApi.post<ApiItemResponse<{ ok?: boolean }>>(`/forms/${id}/submit`, { responses });
        return data.data;
      },
    },
    invites: {
      public: {
        get: async (code: string) => {
          const { data } = await publicApi.get<ApiItemResponse<PublicFormInvite>>(`/form-invites/${code}`);
          return data.data;
        },
        submit: async (code: string, responses: Record<string, unknown>) => {
          const { data } = await publicApi.post<ApiItemResponse<{ ok?: boolean }>>(
            `/form-invites/${code}/submit`,
            { responses },
          );
          return data.data;
        },
      },
    },
  },
  labels: {
    list: () => listData<Label>("/labels"),
    create: (payload: Partial<Label>) => create<Label>("/labels", payload),
    update: (id: string, payload: Partial<Label>) => update<Label>(`/labels/${id}`, payload),
    remove: (id: string) => remove(`/labels/${id}`),
  },
  notifications: {
    list: async () => {
      const { data } = await api.get<ApiListResponse<AppNotification> & { meta?: { unreadCount: number } }>(
        "/notifications",
      );
      return { data: data.data, unreadCount: data.meta?.unreadCount || 0 };
    },
    markRead: (id: string) => update<AppNotification>(`/notifications/${id}/read`, {}),
    markAllRead: () => create<{ ok: boolean }>("/notifications/read-all", {}),
  },
  notes: {
    groups: {
      list: () => listData<NoteGroup>("/note-groups"),
      create: (payload: Partial<NoteGroup>) => create<NoteGroup>("/note-groups", payload),
      update: (id: string, payload: Partial<NoteGroup>) => update<NoteGroup>(`/note-groups/${id}`, payload),
      remove: (id: string) => remove(`/note-groups/${id}`),
    },
    list: () => listData<Note>("/notes"),
    get: (id: string) => getOne<Note>(`/notes/${id}`),
    create: (payload: Partial<Note>) => create<Note>("/notes", payload),
    update: (id: string, payload: Partial<Note>) => update<Note>(`/notes/${id}`, payload),
    remove: (id: string) => remove(`/notes/${id}`),
    share: (id: string, payload: { userId: string; permission?: string }) =>
      create<Note>(`/notes/${id}/share`, payload),
    unshare: (id: string, userId: string) => remove(`/notes/${id}/share/${userId}`),
  },
  google: {
    status: () =>
      getOne<{
        configured: boolean;
        connected: boolean;
        calendarId: string;
        connectedEmail: string;
        connectedAt: string | null;
        source: string;
      }>("/integrations/google/status"),
    connectUrl: () => getOne<{ url: string }>("/integrations/google/connect"),
    disconnect: () => create<{ ok: boolean }>("/integrations/google/disconnect", {}),
  },
};
