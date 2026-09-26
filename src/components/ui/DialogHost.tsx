import { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import { HiOutlineExclamationTriangle, HiOutlineInformationCircle, HiOutlineTrash } from "react-icons/hi2";

/*
 * Modais de decisão no lugar de window.confirm/alert. Use em qualquer lugar:
 *   if (!(await confirmDialog({ title: "Excluir?", danger: true }))) return;
 *   await alertDialog({ title: "Não foi possível salvar", message: "..." });
 * O <DialogHost /> fica montado uma vez em _app.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva (excluir, limpar): botão vermelho. */
  danger?: boolean;
}

export interface AlertOptions {
  title: string;
  message?: string;
  okLabel?: string;
}

type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "alert"; options: AlertOptions; resolve: (value: boolean) => void };

let queue: Request[] = [];
let notify: (() => void) | null = null;

function enqueue(request: Request) {
  queue = [...queue, request];
  if (notify) notify();
  // Sem host montado (ex.: página pública), cai no diálogo do navegador.
  else if (typeof window !== "undefined") {
    queue = queue.filter((item) => item !== request);
    const text = [request.options.title, request.options.message].filter(Boolean).join("\n\n");
    request.resolve(request.kind === "confirm" ? window.confirm(text) : (window.alert(text), true));
  }
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => enqueue({ kind: "confirm", options, resolve }));
}

export function alertDialog(options: AlertOptions): Promise<void> {
  return new Promise((resolve) => enqueue({ kind: "alert", options, resolve: () => resolve() }));
}

export default function DialogHost() {
  const [, setVersion] = useState(0);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    notify = () => setVersion((value) => value + 1);
    return () => {
      notify = null;
    };
  }, []);

  const current = queue[0];

  useEffect(() => {
    if (current) window.setTimeout(() => confirmRef.current?.focus(), 50);
  }, [current]);

  function close(value: boolean) {
    if (!current) return;
    queue = queue.slice(1);
    current.resolve(value);
    setVersion((version) => version + 1);
  }

  const isConfirm = current?.kind === "confirm";
  const danger = isConfirm && (current.options as ConfirmOptions).danger;
  const Icon = danger ? HiOutlineTrash : isConfirm ? HiOutlineExclamationTriangle : HiOutlineInformationCircle;

  return (
    <Dialog
      open={Boolean(current)}
      onClose={() => close(false)}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: "16px" } } }}
    >
      {current ? (
        <div className="p-6">
          <div className="flex gap-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                danger ? "bg-burgundy/10 text-burgundy" : isConfirm ? "bg-gold/15 text-gold" : "bg-tan/10 text-tan"
              }`}
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-1">
              <h2 className="text-base font-semibold text-charcoal">{current.options.title}</h2>
              {current.options.message ? (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-charcoal/60">{current.options.message}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            {isConfirm ? (
              <button type="button" className="btn-secondary" onClick={() => close(false)}>
                {(current.options as ConfirmOptions).cancelLabel || "Cancelar"}
              </button>
            ) : null}
            <button
              ref={confirmRef}
              type="button"
              className={danger ? "btn-danger" : "btn-primary"}
              onClick={() => close(true)}
            >
              {isConfirm ? (current.options as ConfirmOptions).confirmLabel || "Confirmar" : (current.options as AlertOptions).okLabel || "Entendi"}
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
