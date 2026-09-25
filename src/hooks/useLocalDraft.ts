import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Rascunho salvo no navegador, separado por usuário. Usado pelos geradores de
 * mensagens (Follow-up e Prospecção), que não precisam de histórico no servidor.
 */
export function useLocalDraft<T>(key: string, initial: T) {
  const { user } = useAuth();
  const storageKey = `noma:${key}:${user?._id || "anon"}`;
  const [value, setValue] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setValue(raw ? { ...initial, ...JSON.parse(raw) } : initial);
    } catch {
      setValue(initial);
    }
    setLoadedKey(storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, [loadedKey, storageKey, value]);

  function reset() {
    setValue(initial);
  }

  return [value, setValue, reset] as const;
}
