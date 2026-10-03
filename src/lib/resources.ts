import { api } from "./api";
import type {
  AppNotification,
  AppSettings,
  BucketMovement,
  Booking,
  BusyItem,
  PublicSchedule,
  SchedulingLink,
  DistributionBucket,
  NotificationPrefs,
  OrgSummary,
  Birthday,
  CaptureForm,
  Company,
  CompanyProfile,
  Contact,
  ContactDuplicate,
  ContactProfile,
  DuplicateGroup,
  RelationItem,
  RelationKind,
  ContractTemplate,
  CustomField,
  FinanceEntry,
  FinanceMonthSummary,
  FormInvite,
  FormResponse,
  Funnel,
  Label,
  Lead,
  LeadStatus,
  Note,
  NoteGroup,
  NotePermission,
  NPSInvite,
  NPSRating,
  NPSSummary,
  NPSSurvey,
  OptionItem,
  Product,
  ProposalAcceptance,
  ProposalShare,
  PublicFormData,
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
  birthdays: Birthday[];
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

export function isInviteCode(id: string) {
  return /^\d{6}$/.test(id);
}

export interface DistributionPayload {
  date: string;
  description: string;
  cashbox: string;
  entryId?: string;
  items: { bucketId: string; value: number; percentage?: number }[];
}

export type FinanceEntryPayload = Partial<FinanceEntry> & { recurring?: boolean };

export interface InstallmentsPayload {
  description: string;
  client?: string;
  category: string;
  payment: string;
  cashbox: string;
  bank: string;
  notes?: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  /** Primeira parcela (ou à vista) já recebida. */
  firstReceived?: boolean;
  installments: { value: number; date: string }[];
}
export interface GoogleStatus {
  /** Integração ligada no servidor. */
  configured: boolean;
  connected: boolean;
  email: string;
}

export type UserPayload = Partial<User> & { password?: string };

export type ContactPayload = Partial<Contact> & { allowDuplicate?: boolean };

/** Contato já existente informado pela API quando o cadastro esbarra em telefone/e-mail repetido (409). */
export function duplicateOf(err: unknown): ContactDuplicate | null {
  const response = (err as { response?: { status?: number; data?: { field?: "phone" | "email"; duplicate?: ContactDuplicate } } }).response;
  const duplicate = response?.status === 409 ? response.data?.duplicate : null;
  return duplicate ? { ...duplicate, field: response?.data?.field } : null;
}

export type LeadPayload = Partial<Omit<Lead, "nextActionDate" | "offeredValue" | "closedValue">> & {
  nextActionDate?: string | null;
  offeredValue?: number | null;
  closedValue?: number | null;
};

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
  orgs: {
    list: () => listData<OrgSummary>("/orgs"),
    create: (payload: { name: string; logo?: string; color?: string; copyFrom?: string }) => create<OrgSummary>("/orgs", payload),
    update: (id: string, payload: Partial<Pick<OrgSummary, "name" | "logo" | "color" | "isActive">>) => update<OrgSummary>(`/orgs/${id}`, payload),
  },
  customFields: crud<CustomField>("/custom-fields"),
  users: {
    ...crud<User>("/users"),
    create: (payload: UserPayload) => create<User>("/users", payload),
    update: (id: string, payload: UserPayload) => update<User>(`/users/${id}`, payload),
  },
  contacts: {
    ...crud<Contact>("/contacts"),
    /** `allowDuplicate` salva mesmo havendo outro contato com o mesmo telefone/e-mail (senão a API responde 409). */
    create: (payload: ContactPayload) => create<Contact>("/contacts", payload),
    update: (id: string, payload: ContactPayload) => update<Contact>(`/contacts/${id}`, payload),
    /** Cria o contato ou, se já existir um com o mesmo telefone/e-mail, devolve o que já existe. */
    createOrReuse: async (payload: ContactPayload) => {
      try {
        return await create<Contact>("/contacts", payload);
      } catch (err) {
        const existing = duplicateOf(err);
        if (!existing) throw err;
        return getOne<Contact>(`/contacts/${existing._id}`);
      }
    },
    profile: (id: string) => getOne<ContactProfile>(`/contacts/${id}/profile`),
    duplicates: () => listData<DuplicateGroup>("/contacts/duplicates"),
    /** Mescla `fromId` neste contato (o outro é excluído). */
    merge: (id: string, fromId: string) => create<Contact>(`/contacts/${id}/merge`, { fromId }),
  },
  relations: {
    list: (kind: RelationKind, id: string) => listData<RelationItem>("/relations", { kind, id }),
    create: (payload: { from: { kind: RelationKind; id: string }; to: { kind: RelationKind; id: string }; type: string; note?: string }) =>
      create<{ _id: string }>("/relations", payload),
    remove: (id: string) => remove(`/relations/${id}`),
  },
  companies: {
    ...crud<Company>("/companies"),
    profile: (id: string) => getOne<CompanyProfile>(`/companies/${id}/profile`),
  },
  products: crud<Product>("/products"),
  labels: crud<Label>("/labels"),
  funnels: {
    ...crud<Funnel>("/funnels"),
    reorder: async (ids: string[]) => {
      await api.put("/funnels/reorder", { ids });
    },
  },
  leads: {
    list: (params?: ListParams) => listData<Lead>("/leads", params),
    get: (id: string) => getOne<Lead>(`/leads/${id}`),
    create: (payload: LeadPayload) => create<Lead>("/leads", payload),
    update: (id: string, payload: LeadPayload) => update<Lead>(`/leads/${id}`, payload),
    remove: (id: string) => remove(`/leads/${id}`),
    /** Perder a negociação exige o motivo (`loss`). */
    setStatus: (id: string, status: LeadStatus, loss?: { lostReason: string; lostNote?: string }) =>
      create<Lead>(`/leads/${id}/status`, { status, ...loss }),
    addComment: (id: string, text: string) => create<Lead>(`/leads/${id}/comments`, { text }),
    updateComment: (id: string, commentId: string, text: string) =>
      update<Lead>(`/leads/${id}/comments/${commentId}`, { text }),
    formInvites: (id: string) => listData<FormInvite>(`/leads/${id}/form-invites`),
    sendForm: (id: string, formId: string) => create<FormInvite>(`/leads/${id}/form-invites`, { formId }),
    removeComment: async (id: string, commentId: string) => {
      const { data } = await api.delete<ApiItemResponse<Lead>>(`/leads/${id}/comments/${commentId}`);
      return data.data;
    },
  },
  tasks: crud<Task>("/tasks"),
  google: {
    status: () => getOne<GoogleStatus>("/google/status"),
    connectUrl: async () => (await getOne<{ url: string }>("/google/connect")).url,
    disconnect: () => remove("/google"),
  },
  notes: {
    list: () => listData<Note>("/notes"),
    create: (payload: Partial<Note>) => create<Note>("/notes", payload),
    update: (id: string, payload: Partial<Note>) => update<Note>(`/notes/${id}`, payload),
    remove: (id: string) => remove(`/notes/${id}`),
    /** Move para outro grupo (vazio = sem grupo). */
    move: async (id: string, groupId: string) => {
      const { data } = await api.put<ApiItemResponse<Note>>(`/notes/${id}/group`, { groupId });
      return data.data;
    },
    /** Adiciona ou troca a permissão de alguém. */
    share: (id: string, userId: string, permission: NotePermission = "view") => create<Note>(`/notes/${id}/share`, { userId, permission }),
    unshare: async (id: string, userId: string) => {
      await api.delete(`/notes/${id}/share/${userId}`);
    },
    groups: crud<NoteGroup>("/note-groups"),
  },
  nps: {
    surveys: crud<NPSSurvey>("/nps/surveys"),
    ratings: async (params?: ListParams) => {
      const { data } = await api.get<ApiListResponse<NPSRating>>("/nps/ratings", { params: clean(params) });
      return { ratings: data.data, summary: data.meta as unknown as NPSSummary };
    },
    removeRating: (id: string) => remove(`/nps/ratings/${id}`),
    invite: (payload: { surveyId: string; contactId: string; leadId?: string }) => create<NPSInvite>("/nps/invites", payload),
  },
  notifications: {
    list: () => getOne<{ items: AppNotification[]; unread: number }>("/notifications"),
    read: async (ids?: string[]) => {
      await api.post("/notifications/read", ids ? { ids } : {});
    },
    prefs: () => getOne<NotificationPrefs>("/notifications/prefs"),
    updatePrefs: (payload: Partial<NotificationPrefs>) => update<NotificationPrefs>("/notifications/prefs", payload),
  },
  weeklyReport: {
    /** Envia o relatório agora (para mim ou para os destinatários configurados). */
    test: async (toMe: boolean) => {
      await api.post("/settings/weekly-report/test", { toMe });
    },
  },
  scheduling: {
    links: () => listData<SchedulingLink>("/scheduling/links"),
    createLink: (payload: Partial<SchedulingLink>) => create<SchedulingLink>("/scheduling/links", payload),
    updateLink: (id: string, payload: Partial<SchedulingLink>) => update<SchedulingLink>(`/scheduling/links/${id}`, payload),
    removeLink: (id: string) => remove(`/scheduling/links/${id}`),
    bookings: () => listData<Booking>("/scheduling/bookings"),
    cancelBooking: (id: string) => create<Booking>(`/scheduling/bookings/${id}/cancel`, {}),
    /** O que já está ocupado na agenda de quem está logado (para escolher horário). */
    busy: (date: string, days = 1) => getOne<{ google: string; items: BusyItem[] }>("/scheduling/busy", { date, days: String(days) }),
  },
  publicSchedule: {
    get: (slug: string, from?: string, days = 14) => getOne<PublicSchedule>(`/public/schedule/${slug}`, { from, days: String(days) }),
    book: (slug: string, payload: { start: string; name: string; email: string; phone: string; notes: string }) =>
      create<{ start: string; end: string; title: string; location: string }>(`/public/schedule/${slug}/book`, payload),
  },
  publicNps: {
    get: (token: string) =>
      getOne<{ status: "pending" | "answered"; contactFirstName: string; survey: Pick<NPSSurvey, "name" | "question" | "commentPrompt" | "thankYouMessage" | "logo" | "accentColor"> }>(
        `/public/nps/${token}`,
      ),
    respond: (token: string, rating: number, comment: string) => create<{ ok: boolean }>(`/public/nps/${token}`, { rating, comment }),
  },
  forms: {
    ...crud<CaptureForm>("/forms"),
    responses: (id: string) => listData<FormResponse>(`/forms/${id}/responses`),
    removeResponse: (id: string, responseId: string) => remove(`/forms/${id}/responses/${responseId}`),
  },
  publicForms: {
    /** Código de 6 dígitos = formulário enviado pela negociação; senão, link público do formulário. */
    get: (id: string) => getOne<PublicFormData>(isInviteCode(id) ? `/public/form-invites/${id}` : `/public/forms/${id}`),
    submit: (id: string, answers: Record<string, unknown>, website = "", sessionId = "") =>
      create<{ message: string }>(isInviteCode(id) ? `/public/form-invites/${id}` : `/public/forms/${id}/responses`, {
        answers,
        website,
        sessionId,
      }),
    /** Salva o que já foi respondido (a cada pergunta); `step` = pergunta em que a pessoa está. */
    saveProgress: (id: string, payload: { sessionId: string; answers: Record<string, unknown>; step: number; website?: string }) =>
      create<{ status: string }>(isInviteCode(id) ? `/public/form-invites/${id}/progress` : `/public/forms/${id}/progress`, payload),
    /** Progresso salvo desta sessão do navegador (null = nada salvo). */
    progress: (id: string, sessionId: string) =>
      getOne<{ answers: Record<string, string | string[] | boolean>; lastStep: number; status: "partial" | "complete" } | null>(
        `/public/forms/${id}/progress/${sessionId}`,
      ),
  },
  finance: {
    entries: async (month: string, params?: ListParams) => {
      const { data } = await api.get<ApiListResponse<FinanceEntry>>("/finance/entries", {
        params: clean({ ...params, month }),
      });
      return { entries: data.data, goal: Number(data.meta?.goal) || 0 };
    },
    yearEntries: (year: string, params?: ListParams) => listData<FinanceEntry>("/finance/entries", { ...params, year }),
    /** Lançamentos (parcelas) ligados a uma negociação. */
    leadEntries: (leadId: string) => listData<FinanceEntry>("/finance/entries", { leadId }),
    createInstallments: (payload: InstallmentsPayload) => create<FinanceEntry[]>("/finance/installments", payload),
    createEntry: (payload: FinanceEntryPayload) => create<FinanceEntry>("/finance/entries", payload),
    updateEntry: (id: string, payload: FinanceEntryPayload) => update<FinanceEntry>(`/finance/entries/${id}`, payload),
    /** `scope: "series"` encerra a recorrência; sem ele, só pula o mês. */
    removeEntry: (id: string, scope?: "series") => remove(`/finance/entries/${id}`, { scope }),
    summary: (year: string, params?: ListParams) =>
      getOne<{ year: string; months: FinanceMonthSummary[] }>("/finance/summary", { ...params, year }),
    distribution: (params?: ListParams) =>
      getOne<{ buckets: DistributionBucket[]; movements: BucketMovement[] }>("/finance/distribution", params),
    saveBuckets: async (buckets: (Pick<DistributionBucket, "name" | "percentage" | "color"> & { _id?: string })[]) => {
      const { data } = await api.put<ApiItemResponse<DistributionBucket[]>>("/finance/distribution/buckets", { buckets });
      return data.data;
    },
    distribute: (payload: DistributionPayload) => create<BucketMovement[]>("/finance/distributions", payload),
    withdraw: (payload: { bucketId: string; value: number; date: string; description: string; cashbox: string }) =>
      create<BucketMovement>("/finance/bucket-movements", payload),
    removeMovement: (id: string) => remove(`/finance/bucket-movements/${id}`),
    setGoal: async (month: string, value: number, cashbox = "") => {
      const { data } = await api.put<ApiItemResponse<{ value: number }>>(`/finance/goals/${month}`, { value, cashbox });
      return data.data;
    },
  },
  tools: {
    proposals: toolDocuments("proposal"),
    contracts: toolDocuments("contract"),
    budgets: toolDocuments("budget"),
    briefings: toolDocuments("briefing"),
    scripts: toolDocuments("script"),
    /** Link público da proposta (/p/<token>) e as visualizações do cliente. */
    proposalShare: {
      get: (id: string) => getOne<ProposalShare>(`/tools/proposal/documents/${id}/share`),
      create: (id: string, regenerate = false) => create<ProposalShare>(`/tools/proposal/documents/${id}/share`, { regenerate }),
      disable: async (id: string) => {
        const { data } = await api.delete<ApiItemResponse<ProposalShare>>(`/tools/proposal/documents/${id}/share`);
        return data.data;
      },
    },
  },
  /** Proposta aberta pelo cliente no link público (sem login). */
  publicProposals: {
    get: (token: string) =>
      getOne<{ title: string; data: Record<string, unknown>; accepted: ProposalAcceptance | null }>(`/public/proposals/${token}`),
    accept: (token: string, payload: { name: string; comment?: string }) =>
      create<ProposalAcceptance>(`/public/proposals/${token}/accept`, payload),
  },
  contractTemplates: crud<ContractTemplate>("/contract-templates"),
  files: {
    list: (params?: ListParams) => listData<StoredFile>("/files", params),
    register: (payload: Partial<StoredFile>) => create<StoredFile>("/files", payload),
    update: (id: string, payload: Partial<StoredFile>) => update<StoredFile>(`/files/${id}`, payload),
    remove: (id: string) => remove(`/files/${id}`),
  },
};
