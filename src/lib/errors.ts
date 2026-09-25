/** Mensagem de erro da API (campo `error`) ou o texto padrão. */
export function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}
