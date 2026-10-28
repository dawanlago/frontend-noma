import { api } from "@/lib/api";

/** Vídeos enviados ao servidor (Cloudinary) para o portfólio da proposta. */

export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
export const VIDEO_MAX_LABEL = "500 MB";
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

/** Acima disso o envio vai em partes (o Cloudinary exige partes para arquivos > 100 MB). */
const CHUNK_THRESHOLD = 20 * 1024 * 1024;
/** Cada parte (menos a última) precisa ter mais de 5 MB. */
const CHUNK_SIZE = 10 * 1024 * 1024;
/** A assinatura do Cloudinary vale 1 hora; renova antes disso em envios longos. */
const SIGNATURE_TTL_MS = 40 * 60 * 1000;
const CHUNK_RETRIES = 2;

/**
 * Versões geradas logo após o envio (eager). Precisam ser idênticas às do servidor
 * (backend src/routes/media.ts → VIDEO_EAGER), senão o Cloudinary gera de novo na hora.
 */
const VIDEO_PLAYBACK = "c_limit,q_auto,vc_h264,w_1920";
const VIDEO_POSTER = "q_auto,so_1";

/** Link de um vídeo da nossa conta no Cloudinary (o que é salvo no item do portfólio). */
const CLOUDINARY_VIDEO = /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/video\/upload\/[^\s"'<>\\]+$/i;

export function isUploadedVideoUrl(url: string) {
  return CLOUDINARY_VIDEO.test((url || "").trim());
}

/** Troca a transformação/extensão de um link do Cloudinary (remove a versão "v123/"). */
function transformUrl(url: string, transformation: string, extension: string) {
  const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(?:v\d+\/)?(.+?)(\.[a-z0-9]+)?$/i);
  if (!match) return url;
  return `${match[1]}${transformation}/${match[2]}.${extension}`;
}

/** mp4 otimizado (H.264, toca em todos os navegadores, inclusive .mov enviados). */
export function videoPlaybackUrl(url: string) {
  return transformUrl(url, VIDEO_PLAYBACK, "mp4");
}

/** Miniatura: quadro de 1 segundo do vídeo. */
export function videoPosterUrl(url: string) {
  return transformUrl(url, VIDEO_POSTER, "jpg");
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1).replace(".", ",")} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Valida o arquivo antes de enviar; devolve a mensagem de erro (ou ""). */
export function validateVideoFile(file: File) {
  const okType = /^video\/(mp4|quicktime|webm)$/.test(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);
  if (!okType) return "Formato não suportado. Envie um vídeo MP4, MOV ou WEBM.";
  if (file.size > VIDEO_MAX_BYTES) {
    return `O vídeo tem ${formatBytes(file.size)}; o limite é ${VIDEO_MAX_LABEL}. Exporte uma versão menor ou use um link do Google Drive.`;
  }
  return "";
}

interface VideoSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  eager: string;
  eagerAsync: string;
  signature: string;
}

export interface UploadedVideo {
  url: string;
  publicId: string;
  bytes: number;
}

export class UploadCanceledError extends Error {
  constructor() {
    super("Envio cancelado.");
    this.name = "UploadCanceledError";
  }
}

async function signVideo() {
  const { data } = await api.post<{ data: VideoSignature }>("/uploads/sign-video", {});
  return { sign: data.data, at: Date.now() };
}

/** Converte o erro do Cloudinary numa mensagem amigável. */
function friendlyError(message: string, status: number) {
  if (/file size too large|too large/i.test(message)) {
    return "O vídeo passa do limite de tamanho da conta do Cloudinary. Exporte uma versão menor ou use um link do Google Drive.";
  }
  if (/missing permissions|forbidden/i.test(message)) {
    return "A chave do Cloudinary não tem permissão para enviar arquivos. Ajuste a chave nas configurações do Cloudinary.";
  }
  if (/invalid signature|stale request/i.test(message)) return "A autorização de envio expirou. Tente de novo.";
  if (/unsupported video format|invalid video|unknown file format/i.test(message)) {
    return "O Cloudinary não reconheceu este arquivo como vídeo. Envie um MP4, MOV ou WEBM.";
  }
  if (status === 420 || /rate limit/i.test(message)) return "Limite de envios do Cloudinary atingido. Tente mais tarde.";
  return message ? `Não foi possível enviar o vídeo (${message}).` : "Não foi possível enviar o vídeo. Tente de novo.";
}

class NetworkError extends Error {}

/** Envia um pedaço (ou o arquivo inteiro) ao Cloudinary. */
function sendPart(
  sign: VideoSignature,
  blob: Blob,
  fileName: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<Record<string, unknown>> {
  const body = new FormData();
  body.append("file", blob, fileName);
  body.append("api_key", sign.apiKey);
  body.append("timestamp", String(sign.timestamp));
  body.append("folder", sign.folder);
  body.append("eager", sign.eager);
  body.append("eager_async", sign.eagerAsync);
  body.append("signature", sign.signature);

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadCanceledError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onabort = () => reject(new UploadCanceledError());
    xhr.onerror = () => reject(new NetworkError("Falha de conexão ao enviar o vídeo. Verifique a internet e tente de novo."));
    xhr.onload = () => {
      signal.removeEventListener("abort", abort);
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // resposta vazia/HTML
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json);
      else {
        const error = (json.error || {}) as { message?: string };
        reject(new Error(friendlyError(error.message || "", xhr.status)));
      }
    };
    xhr.send(body);
  });
}

/**
 * Envia o vídeo direto do navegador ao Cloudinary (o servidor só assina).
 * Até 20 MB vai numa requisição; acima disso, em partes de 10 MB com
 * X-Unique-Upload-Id + Content-Range (cada parte tenta de novo se a conexão cair).
 */
export async function uploadVideo(
  file: File,
  options: { signal: AbortSignal; onProgress?: (fraction: number) => void },
): Promise<UploadedVideo> {
  const invalid = validateVideoFile(file);
  if (invalid) throw new Error(invalid);
  const { signal, onProgress } = options;
  let signed = await signVideo();
  const report = (sent: number) => onProgress?.(Math.min(1, sent / file.size));

  let result: Record<string, unknown>;
  if (file.size <= CHUNK_THRESHOLD) {
    result = await sendPart(signed.sign, file, file.name, {}, signal, report);
  } else {
    const uploadId = `noma-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    result = {};
    for (let start = 0; start < file.size; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const headers = {
        "X-Unique-Upload-Id": uploadId,
        "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
      };
      for (let attempt = 0; ; attempt += 1) {
        if (Date.now() - signed.at > SIGNATURE_TTL_MS) signed = await signVideo();
        try {
          result = await sendPart(signed.sign, file.slice(start, end), file.name, headers, signal, (loaded) =>
            report(start + loaded),
          );
          break;
        } catch (error) {
          if (!(error instanceof NetworkError) || attempt >= CHUNK_RETRIES) throw error;
          await new Promise((resolve) => window.setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    }
  }

  const url = typeof result.secure_url === "string" ? result.secure_url : "";
  if (!url || !isUploadedVideoUrl(url)) throw new Error("O Cloudinary não devolveu o link do vídeo. Tente de novo.");
  report(file.size);
  return { url, publicId: String(result.public_id || ""), bytes: Number(result.bytes) || file.size };
}
