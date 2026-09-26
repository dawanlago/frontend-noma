import { api } from "@/lib/api";

/** Pastas no Cloudinary (o servidor só assina estas). */
export type UploadFolder = "contatos" | "empresas" | "marca" | "contratos" | "propostas" | "arquivos";

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export interface UploadedAsset {
  url: string;
  publicId: string;
  bytes: number;
  resourceType: "image" | "raw";
}

/** Limite do plano gratuito do Cloudinary por arquivo. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Envia o arquivo direto do navegador para o Cloudinary, com assinatura gerada
 * pelo servidor. Imagens vão como "image"; PDFs e documentos, como "raw".
 */
export async function uploadToCloudinary(
  file: Blob,
  folder: UploadFolder,
  options: { fileName?: string; resourceType?: "image" | "raw"; onProgress?: (fraction: number) => void } = {},
): Promise<UploadedAsset> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("O arquivo precisa ter até 10 MB.");
  const resourceType = options.resourceType || (file.type.startsWith("image/") ? "image" : "raw");
  const { data } = await api.post<{ data: Signature }>("/uploads/sign", { folder });
  const sign = data.data;

  const body = new FormData();
  body.append("file", file, options.fileName || "arquivo");
  body.append("api_key", sign.apiKey);
  body.append("timestamp", String(sign.timestamp));
  body.append("folder", sign.folder);
  body.append("signature", sign.signature);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new Error("Falha de conexão ao enviar o arquivo."));
    xhr.onload = () => {
      const json = (() => {
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return {};
        }
      })();
      if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
        resolve({ url: json.secure_url, publicId: json.public_id, bytes: json.bytes, resourceType });
      } else {
        const message: string = json.error?.message || "";
        if (/missing permissions|forbidden/i.test(message)) {
          reject(new Error("A chave do Cloudinary não tem permissão para enviar arquivos. Ajuste a chave nas configurações do Cloudinary."));
        } else {
          reject(new Error(message ? `Cloudinary: ${message}` : "Não foi possível enviar o arquivo."));
        }
      }
    };
    xhr.send(body);
  });
}

/** Reduz a imagem no navegador e envia ao Cloudinary; devolve o link. */
export async function uploadImage(file: File, folder: UploadFolder, maxWidth: number, quality = 0.85) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem (PNG, JPG ou WEBP).");
  const { resizeImage } = await import("@/utils/image");
  const blob = await resizeImage(file, maxWidth, quality);
  const asset = await uploadToCloudinary(blob, folder, { fileName: file.name, resourceType: "image" });
  return asset.url;
}
