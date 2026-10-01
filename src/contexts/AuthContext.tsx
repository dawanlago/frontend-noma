import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, AUTH_TOKEN_KEY, ORG_KEY } from "@/lib/api";
import type { ModuleKey, User, OrgSummary } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** O usuário tem acesso a pelo menos um dos módulos? */
  can: (...modules: ModuleKey[]) => boolean;
  /** Vê os registros de todos no módulo (nível "todos")? */
  seesAll: (module: ModuleKey) => boolean;
  /** Empresa ativa. */
  org: OrgSummary | null;
  switchOrg: (orgId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      // O servidor confirma a empresa ativa (a salva pode ter sido desativada ou o acesso removido).
      if (data.user.orgId) localStorage.setItem(ORG_KEY, data.user.orgId);
      setUser(data.user);
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: User }>("/auth/login", {
      email,
      password,
    });

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    if (data.user.orgId) localStorage.setItem(ORG_KEY, data.user.orgId);
    setUser(data.user);
  }, []);

  /** Troca a empresa ativa e recarrega o sistema já dentro dela. */
  const switchOrg = useCallback((orgId: string) => {
    localStorage.setItem(ORG_KEY, orgId);
    window.location.assign("/");
  }, []);

  /** O usuário vê os registros de todos neste módulo (e não só os que criou)? */
  const seesAll = useCallback(
    (module: ModuleKey) => user?.role === "admin" || user?.access?.[module] === "all",
    [user],
  );

  const can = useCallback(
    (...modules: ModuleKey[]) =>
      user?.role === "admin" || modules.some((key) => (user?.permissions || []).includes(key)),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      can,
      seesAll,
      org: user?.orgs?.find((item) => item._id === user.orgId) || null,
      switchOrg,
      login,
      logout,
    }),
    [user, isLoading, can, seesAll, switchOrg, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
