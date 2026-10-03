import { useEffect, useState } from "react";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { NotificationPrefs } from "@/types";

const OPTIONS = [
  { value: "0", label: "Não avisar" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
];

/** Quando lembrar dos compromissos e se os lembretes também vão por e-mail. */
export default function NotificationPrefsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    resources.notifications.prefs().then(setPrefs).catch(() => setPrefs({ reminderMinutes: 60, emailReminders: true, dailyDigest: true }));
  }, [open]);

  async function save() {
    if (!prefs) return;
    setBusy(true);
    try {
      await resources.notifications.updatePrefs(prefs);
      onClose();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lembretes e avisos"
      description="Vale para você, em todas as empresas."
      footer={
        <button type="button" className="btn-primary" disabled={busy || !prefs} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar"}
        </button>
      }
    >
      {prefs ? (
        <div className="grid gap-4 pt-1">
          <Field label="Lembrar dos compromissos com hora">
            <Select value={String(prefs.reminderMinutes)} onChange={(value) => setPrefs({ ...prefs, reminderMinutes: Number(value) })} options={OPTIONS} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-charcoal">
            <input type="checkbox" className="mt-0.5" checked={prefs.dailyDigest} onChange={(e) => setPrefs({ ...prefs, dailyDigest: e.target.checked })} />
            <span>
              <strong>Resumo do dia</strong>
              <span className="block text-xs text-charcoal/55">De manhã, as atividades de hoje e as atrasadas.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-charcoal">
            <input type="checkbox" className="mt-0.5" checked={prefs.emailReminders} onChange={(e) => setPrefs({ ...prefs, emailReminders: e.target.checked })} />
            <span>
              <strong>Também por e-mail</strong>
              <span className="block text-xs text-charcoal/55">Além do sino no topo do sistema.</span>
            </span>
          </label>
          {error ? <p className="text-sm text-burgundy">{error}</p> : null}
        </div>
      ) : (
        <div className="skeleton h-24" />
      )}
    </Modal>
  );
}
