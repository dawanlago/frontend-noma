import { useEffect, type ReactNode } from "react";
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
  size?: "md" | "lg";
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
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={size === "lg" ? "md" : "sm"}
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
      <DialogContent>{children}</DialogContent>
      {footer ? <DialogActions sx={{ px: 3, pb: 2.5 }}>{footer}</DialogActions> : null}
    </Dialog>
  );
}
