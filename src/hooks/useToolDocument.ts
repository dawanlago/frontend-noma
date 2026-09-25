import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolDocument } from "@/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface ToolDocumentApi<T> {
  get: (id: string) => Promise<ToolDocument<T>>;
  update: (id: string, payload: { title?: string; data?: T }) => Promise<ToolDocument<T>>;
}

interface Options<T> {
  api: ToolDocumentApi<T>;
  id: string | null;
  /** Preenche campos novos em documentos salvos antes deles existirem. */
  normalize: (data: Partial<T>) => T;
  titleOf: (data: T) => string;
  delay?: number;
}

/**
 * Carrega um documento de ferramenta e salva automaticamente cada alteração
 * (com debounce), como no Box: não existe botão "salvar" obrigatório.
 */
export function useToolDocument<T>({ api, id, normalize, titleOf, delay = 700 }: Options<T>) {
  const [data, setDataState] = useState<T | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<number>();
  const pending = useRef<T | null>(null);
  const refs = useRef({ api, titleOf, normalize });
  refs.current = { api, titleOf, normalize };

  useEffect(() => {
    if (!id) {
      setDataState(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    refs.current.api
      .get(id)
      .then((doc) => {
        if (cancelled) return;
        setDataState(refs.current.normalize(doc.data || {}));
        setOwnerName(doc.ownerName || "");
        setSaveState("idle");
      })
      .catch(() => !cancelled && setError("Não foi possível abrir este documento."))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    if (!id || !next) return;
    pending.current = null;
    setSaveState("saving");
    try {
      await refs.current.api.update(id, { title: refs.current.titleOf(next), data: next });
      setSaveState(pending.current ? "saving" : "saved");
    } catch {
      setSaveState("error");
    }
  }, [id]);

  const setData = useCallback(
    (updater: T | ((current: T) => T)) => {
      setDataState((current) => {
        if (current === null) return current;
        const next = typeof updater === "function" ? (updater as (c: T) => T)(current) : updater;
        pending.current = next;
        setSaveState("saving");
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), delay);
        return next;
      });
    },
    [delay, flush],
  );

  // Salva o que estiver pendente ao sair da página.
  useEffect(() => () => void flush(), [flush]);

  return { data, setData, isLoading, error, saveState, ownerName, flush };
}
