import { api } from "@/lib/api";

/* Rastreio de visualização do link público: conta só o tempo com a aba visível. */

const HEARTBEAT_MS = 15_000;
/** Recarregar a página dentro desse intervalo continua a mesma sessão. */
const RESUME_MS = 30 * 60_000;

interface StoredSession {
  id: string;
  key: string;
  seconds: number;
  at: number;
}

function baseUrl() {
  return String(api.defaults.baseURL || "").replace(/\/+$/, "");
}

function readStored(storageKey: string): StoredSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || "null") as StoredSession | null;
    return value && value.id && value.key && Date.now() - value.at < RESUME_MS ? value : null;
  } catch {
    return null;
  }
}

/** Inicia o rastreio e devolve a função que o encerra. */
export function trackProposalView(token: string): () => void {
  const root = `${baseUrl()}/public/proposals/${encodeURIComponent(token)}/views`;
  const storageKey = `noma:proposal-view:${token}`;
  const stored = readStored(storageKey);
  let session: { id: string; key: string } | null = stored ? { id: stored.id, key: stored.key } : null;
  let visibleMs = stored ? stored.seconds * 1000 : 0;
  let visibleSince: number | null = null;
  let timer: number | undefined;
  let starting = false;

  const seconds = () => Math.floor((visibleMs + (visibleSince !== null ? Date.now() - visibleSince : 0)) / 1000);

  function persist() {
    if (!session) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ ...session, seconds: seconds(), at: Date.now() }));
    } catch {
      // sessionStorage indisponível (aba anônima restrita): segue sem retomar.
    }
  }

  function send(beacon: boolean) {
    if (!session) return;
    const url = `${root}/${session.id}`;
    // Texto puro não dispara preflight de CORS; o backend lê o JSON do corpo.
    const body = JSON.stringify({ key: session.key, seconds: seconds() });
    persist();
    if (beacon && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, body)) return;
    void fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => undefined);
  }

  async function ensureSession() {
    if (session || starting) return;
    starting = true;
    try {
      const response = await fetch(root, { method: "POST" });
      if (response.ok) {
        const { data } = (await response.json()) as { data: { id: string; key: string } };
        session = data;
        persist();
      }
    } catch {
      // Sem rede: a proposta continua aberta, só não registra.
    } finally {
      starting = false;
    }
  }

  function onVisible() {
    if (visibleSince !== null) return;
    visibleSince = Date.now();
    void ensureSession();
    window.clearInterval(timer);
    timer = window.setInterval(() => send(false), HEARTBEAT_MS);
  }

  function onHidden() {
    if (visibleSince === null) return;
    visibleMs += Date.now() - visibleSince;
    visibleSince = null;
    window.clearInterval(timer);
    send(true);
  }

  const onVisibility = () => (document.visibilityState === "visible" ? onVisible() : onHidden());
  window.addEventListener("pagehide", onHidden);
  document.addEventListener("visibilitychange", onVisibility);
  if (document.visibilityState === "visible") onVisible();

  return () => {
    onHidden();
    window.removeEventListener("pagehide", onHidden);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
