import { resources } from "@/lib/resources";
import { MAX_UPLOAD_BYTES, uploadToCloudinary } from "@/lib/upload";
import type { StoredFile } from "@/types";

export const MAX_FILE_BYTES = MAX_UPLOAD_BYTES;

/** Envia o arquivo ao Cloudinary e registra no sistema. */
export async function uploadFile(file: File, meta: Partial<StoredFile>, onProgress?: (fraction: number) => void): Promise<StoredFile> {
  const asset = await uploadToCloudinary(file, "arquivos", { fileName: file.name, onProgress });
  return resources.files.register({
    ...meta,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    url: asset.url,
    publicId: asset.publicId,
    resourceType: asset.resourceType,
  });
}

/** Abre o arquivo (PDF e imagens abrem no navegador; outros formatos baixam). */
export function openStoredFile(file: StoredFile) {
  window.open(file.url, "_blank", "noopener");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
