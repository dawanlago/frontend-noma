import { resources } from "@/lib/resources";
import type { StoredFile } from "@/types";

/** Mesmo limite do servidor: cada parte até 2 MB (a hospedagem limita o tamanho das requisições). */
const CHUNK_BYTES = 2 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}

/** Envia o arquivo em partes e devolve o registro salvo. */
export async function uploadFile(
  file: File,
  meta: Partial<StoredFile>,
  onProgress?: (fraction: number) => void,
): Promise<StoredFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error("O arquivo precisa ter até 25 MB.");
  const chunkCount = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const stored = await resources.files.start({
    ...meta,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    chunkCount,
  });
  for (let n = 0; n < chunkCount; n += 1) {
    const data = await blobToBase64(file.slice(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES));
    await resources.files.putChunk(stored._id, n, data);
    onProgress?.((n + 1) / chunkCount);
  }
  return resources.files.complete(stored._id);
}

/** Baixa as partes, junta e entrega o arquivo ao navegador. */
export async function downloadStoredFile(file: StoredFile) {
  const parts: BlobPart[] = [];
  for (let n = 0; n < file.chunkCount; n += 1) {
    const base64 = await resources.files.getChunk(file._id, n);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    parts.push(bytes);
  }
  const url = URL.createObjectURL(new Blob(parts, { type: file.mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
