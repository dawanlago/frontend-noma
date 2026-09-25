import type { ReactNode } from "react";
import Modal from "@/components/ui/Modal";

interface QuickAddDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Atalho de cadastro aberto por cima do formulário atual. Ao salvar, fecha e o
 * formulário de trás continua com tudo o que já estava preenchido.
 */
export default function QuickAddDialog({ open, title, description, onClose, children, footer }: QuickAddDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description || "Ao salvar, você volta para o formulário com as informações já digitadas."}
      footer={footer}
    >
      {children}
    </Modal>
  );
}
