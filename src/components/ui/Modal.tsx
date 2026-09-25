import type { ReactNode } from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  // O Dialog já fecha com Esc só o modal do topo (importante nos atalhos abertos por cima de formulários).
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={size === "xl" ? "lg" : size === "lg" ? "md" : "sm"}
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 400 }}>
            {description}
          </Typography>
        ) : null}
        <IconButton
          onClick={onClose}
          aria-label="Fechar"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      {/*
        Os modais de atalho abrem por cima de outros formulários. No React o submit
        sobe pela árvore de componentes (mesmo em portal) e enviaria também o
        formulário de trás; aqui ele para no modal onde aconteceu.
      */}
      <DialogContent onSubmit={(event) => event.stopPropagation()}>{children}</DialogContent>
      {footer ? <DialogActions sx={{ px: 3, pb: 2.5 }}>{footer}</DialogActions> : null}
    </Dialog>
  );
}
