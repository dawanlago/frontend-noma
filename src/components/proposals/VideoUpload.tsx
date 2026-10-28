import { useEffect, useRef, useState } from "react";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import {
  UploadCanceledError,
  VIDEO_ACCEPT,
  VIDEO_MAX_LABEL,
  formatBytes,
  uploadVideo,
  validateVideoFile,
  type UploadedVideo,
} from "@/lib/proposals/video";
import { apiError } from "@/lib/errors";

interface VideoUploadProps {
  onUploaded: (video: UploadedVideo, file: File) => void;
  /** Texto do botão (ex.: "Enviar vídeo", "Trocar vídeo"). */
  label?: string;
  /** Avisa o pai enquanto envia (ex.: travar a remoção do item). */
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}

/** Botão "Enviar vídeo" com barra de progresso e cancelar; o arquivo vai direto ao Cloudinary. */
export default function VideoUpload({ onUploaded, label = "Enviar vídeo", onBusyChange, className = "" }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const busyRef = useRef(onBusyChange);
  busyRef.current = onBusyChange;

  // Saiu da tela (item removido, trocou de etapa): cancela o envio.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(selected?: File) {
    if (inputRef.current) inputRef.current.value = "";
    if (!selected) return;
    const invalid = validateVideoFile(selected);
    if (invalid) {
      setError(invalid);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setFile(selected);
    setProgress(0);
    busyRef.current?.(true);
    try {
      const video = await uploadVideo(selected, { signal: controller.signal, onProgress: setProgress });
      if (!controller.signal.aborted) onUploaded(video, selected);
    } catch (err) {
      if (!(err instanceof UploadCanceledError) && !controller.signal.aborted) {
        // Erro da assinatura (nosso servidor) vem no formato da API; os do Cloudinary já vêm traduzidos.
        const fromApi = typeof err === "object" && err !== null && "isAxiosError" in err;
        setError(
          fromApi || !(err instanceof Error)
            ? apiError(err, "Não foi possível autorizar o envio do vídeo. Tente de novo.")
            : err.message,
        );
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setFile(null);
        busyRef.current?.(false);
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const percent = Math.round(progress * 100);

  return (
    <div className={className}>
      {file ? (
        <div className="rounded-lg border border-charcoal/10 bg-beige/60 px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-charcoal/70">
              Enviando <strong className="text-charcoal">{file.name}</strong> · {formatBytes(file.size)}
            </span>
            <button type="button" className="flex-none font-semibold text-burgundy hover:underline" onClick={cancel}>
              Cancelar
            </button>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-charcoal/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Progresso do envio do vídeo"
          >
            <div className="h-full rounded-full bg-tan transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-charcoal/50">
            {percent < 100 ? `${percent}% — não feche esta página até terminar.` : "Finalizando…"}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-tan hover:underline"
            onClick={() => inputRef.current?.click()}
          >
            <CloudUploadRounded sx={{ fontSize: 16 }} />
            {label}
          </button>
          <span className="text-[11px] text-charcoal/45">MP4, MOV ou WEBM · até {VIDEO_MAX_LABEL}</span>
        </div>
      )}
      {error ? <p className="mt-1 text-xs text-burgundy">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
