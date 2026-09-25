import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { resources } from "@/lib/resources";
import type { AppSettings, CustomField, CustomFieldEntity, Funnel, OptionItem } from "@/types";

type Part = "settings" | "options" | "customFields" | "funnels";

interface WorkspaceValue {
  settings: AppSettings | null;
  options: OptionItem[];
  customFields: CustomField[];
  funnels: Funnel[];
  isReady: boolean;
  optionsOf: (list: string) => OptionItem[];
  /** Texto de exibição de um valor gravado (cai no próprio valor se a opção foi apagada). */
  labelOf: (list: string, value: string) => string;
  fieldsOf: (entity: CustomFieldEntity) => CustomField[];
  reload: (...parts: Part[]) => Promise<void>;
  upsertOption: (item: OptionItem) => void;
  dropOption: (id: string) => void;
  setSettings: (settings: AppSettings) => void;
  setFunnels: (funnels: Funnel[]) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | undefined>(undefined);

/** Dados de configuração usados em todo o app: listas de opções, campos personalizados, funis e identidade. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async (...parts: Part[]) => {
    const all = parts.length === 0;
    const jobs: Promise<unknown>[] = [];
    if (all || parts.includes("settings")) jobs.push(resources.settings.get().then(setSettings));
    if (all || parts.includes("options")) jobs.push(resources.options.list().then(setOptions));
    if (all || parts.includes("customFields")) jobs.push(resources.customFields.list().then(setCustomFields));
    if (all || parts.includes("funnels")) jobs.push(resources.funnels.list().then(setFunnels));
    await Promise.allSettled(jobs);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsReady(false);
      return;
    }
    void reload().finally(() => setIsReady(true));
  }, [isAuthenticated, reload]);

  const optionsOf = useCallback(
    (list: string) => options.filter((item) => item.list === list).sort((a, b) => a.order - b.order),
    [options],
  );

  const labelOf = useCallback(
    (list: string, value: string) => options.find((item) => item.list === list && item.value === value)?.label || value,
    [options],
  );

  const fieldsOf = useCallback(
    (entity: CustomFieldEntity) => customFields.filter((field) => field.entity === entity).sort((a, b) => a.order - b.order),
    [customFields],
  );

  const upsertOption = useCallback((item: OptionItem) => {
    setOptions((current) =>
      current.some((option) => option._id === item._id)
        ? current.map((option) => (option._id === item._id ? item : option))
        : [...current, item],
    );
  }, []);

  const dropOption = useCallback((id: string) => {
    setOptions((current) => current.filter((option) => option._id !== id));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      options,
      customFields,
      funnels,
      isReady,
      optionsOf,
      labelOf,
      fieldsOf,
      reload,
      upsertOption,
      dropOption,
      setSettings,
      setFunnels,
    }),
    [settings, options, customFields, funnels, isReady, optionsOf, labelOf, fieldsOf, reload, upsertOption, dropOption],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}

/** Nome da produtora configurado (usado nas mensagens e documentos). */
export function useCompanyName() {
  return useWorkspace().settings?.companyName || "Produtora Noma";
}
