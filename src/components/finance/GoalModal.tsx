import { useEffect, useState } from "react";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import MoneyInput from "@/components/ui/MoneyInput";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

interface GoalModalProps {
  open: boolean;
  label: string;
  goal: number;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}

export default function GoalModal({ open, label, goal, onClose, onSave }: GoalModalProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(goal ? maskCurrencyBRL(goal) : "");
    setError("");
  }, [open, goal]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave(parseCurrencyBRL(value));
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error || "Não foi possível salvar a meta.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meta do mês"
      description={`Quanto você quer faturar em ${label}?`}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "Salvando..." : "Salvar meta"}
          </button>
        </>
      }
    >
      <form
        className="pt-1"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label="Meta de faturamento" hint="Considera apenas as entradas já recebidas no mês.">
          <MoneyInput value={value} onChange={setValue} />
        </Field>
        {error ? <p className="mt-3 text-sm font-medium text-burgundy">{error}</p> : null}
      </form>
    </Modal>
  );
}
