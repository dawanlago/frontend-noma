import { FormEvent, useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";

interface ClosureModalProps {
  open: boolean;
  dealTitle?: string;
  onClose: () => void;
  onConfirm: (movementDate: string) => Promise<void>;
}

export default function ClosureModal({ open, dealTitle, onClose, onConfirm }: ClosureModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onConfirm(movementDate);
      onClose();
    } catch (submitError) {
      setError(
        (submitError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível registrar o fechamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Fechar venda"
      description={
        isAdmin
          ? dealTitle
            ? `Informe a data da movimentação financeira de "${dealTitle}".`
            : "A data define quando o valor aparece no financeiro."
          : dealTitle
            ? `Informe a data de fechamento de "${dealTitle}".`
            : "A data registra quando a venda foi fechada."
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" form="closure-form" className="btn-gold" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Confirmar fechamento"}
          </button>
        </>
      }
    >
      <form id="closure-form" onSubmit={handleSubmit}>
        <FormField
          label={isAdmin ? "Data da movimentação financeira" : "Data de fechamento"}
          hint={isAdmin ? "Não precisa ser a data do fechamento comercial." : undefined}
        >
          <input
            className="input-search"
            type="date"
            value={movementDate}
            onChange={(event) => setMovementDate(event.target.value)}
            required
          />
        </FormField>
        {error ? <p className="text-sm text-burgundy">{error}</p> : null}
      </form>
    </Modal>
  );
}
