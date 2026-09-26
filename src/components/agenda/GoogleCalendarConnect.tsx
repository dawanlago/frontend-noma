import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { alertDialog, confirmDialog } from "@/components/ui/DialogHost";
import { apiError } from "@/lib/errors";
import { resources, type GoogleStatus } from "@/lib/resources";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.33z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2 10 10 0 0 0 3.07 7.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z" />
    </svg>
  );
}

/** Conecta a agenda Google de quem está logado: compromissos com data e hora vão para lá. */
export default function GoogleCalendarConnect({ onChange }: { onChange?: (status: GoogleStatus) => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    resources.google
      .status()
      .then((data) => {
        setStatus(data);
        onChange?.(data);
      })
      .catch(() => setStatus(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Volta do Google: /agenda?google=conectado|erro|cancelado
  useEffect(() => {
    const result = router.query.google;
    if (!router.isReady || typeof result !== "string") return;
    void router.replace({ pathname: router.pathname }, undefined, { shallow: true });
    if (result === "conectado") {
      void alertDialog({
        title: "Google Agenda conectado",
        message: "Seus compromissos com data e hora (inclusive os próximos que já existiam) agora aparecem na sua agenda Google.",
      });
    } else if (result === "erro") {
      void alertDialog({ title: "Não foi possível conectar", message: "Tente de novo. Se continuar, avise quem administra o Noma." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.google]);

  if (!status?.configured) return null;

  async function connect() {
    setBusy(true);
    try {
      window.location.href = await resources.google.connectUrl();
    } catch (err) {
      setBusy(false);
      void alertDialog({ title: "Não foi possível conectar", message: apiError(err, "Tente de novo em instantes.") });
    }
  }

  async function disconnect() {
    const ok = await confirmDialog({
      title: "Desconectar o Google Agenda?",
      message: "Os compromissos novos deixam de ir para a sua agenda Google. Os eventos que já estão lá continuam.",
      confirmLabel: "Desconectar",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await resources.google.disconnect();
      const next = { ...status!, connected: false, email: "" };
      setStatus(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sage/30 bg-sage/[0.06] px-3 py-2 text-sm">
        <HiOutlineCheckCircle className="h-4 w-4 text-sage" />
        <span className="text-charcoal/75">
          Google Agenda{status.email ? <span className="text-charcoal/50"> · {status.email}</span> : null}
        </span>
        <button type="button" className="ml-1 text-xs font-semibold text-charcoal/50 hover:text-burgundy" disabled={busy} onClick={() => void disconnect()}>
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="btn-secondary" disabled={busy} onClick={() => void connect()}>
      <GoogleMark /> {busy ? "Abrindo o Google…" : "Conectar Google Agenda"}
    </button>
  );
}
