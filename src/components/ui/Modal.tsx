import type { ReactNode } from "react";
import CloseRounded from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
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
  /** "drawer": painel à direita ocupando toda a altura (formulários de cadastro/edição). */
  variant?: "dialog" | "drawer";
}

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  variant = "dialog",
}: ModalProps) {
  if (variant === "drawer") {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: size === "md" ? 480 : 640 },
              maxWidth: "100vw",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-charcoal/[0.08] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-charcoal/55">{description}</p> : null}
          </div>
          <IconButton onClick={onClose} aria-label="Fechar" sx={{ mr: -1, mt: -0.5 }}>
            <CloseRounded />
          </IconButton>
        </header>
        {/* Mesmo cuidado do Dialog: o submit não sobe para formulários de trás. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5" onSubmit={(event) => event.stopPropagation()}>
          {children}
        </div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-charcoal/[0.08] bg-white px-6 py-3.5">
            {footer}
          </footer>
        ) : null}
      </Drawer>
    );
  }

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
