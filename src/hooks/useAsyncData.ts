import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncData<T>(
  loader: () => Promise<T | null>,
  deps: ReadonlyArray<unknown> = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (loadError) {
      const message =
        (loadError as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "Não foi possível carregar os dados.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload, setData };
}
