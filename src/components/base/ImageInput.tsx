import { useRef, useState } from "react";
import { uploadImage, type UploadFolder } from "@/lib/upload";
import { getInitials } from "@/utils/format";

interface ImageInputProps {
  value: string;
  onChange: (dataUrl: string) => void;
  name: string;
  label: string;
  /** Pasta no Cloudinary. */
  folder: UploadFolder;
  rounded?: boolean;
}

/** Foto do contato ou logomarca da empresa, reduzida no navegador. */
export default function ImageInput({ value, onChange, name, label, folder, rounded = true }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem (PNG, JPG ou WEBP).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file, folder, 400, 0.85));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-charcoal/10 bg-tan/10 text-lg font-semibold text-tan ${
          rounded ? "rounded-full" : "rounded-xl"
        }`}
        aria-label={label}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`h-full w-full ${rounded ? "object-cover" : "object-contain"}`} />
        ) : (
          getInitials(name)
        )}
      </button>
      <div className="text-sm">
        <button type="button" className="font-semibold text-tan hover:underline" onClick={() => inputRef.current?.click()}>
          {busy ? "Enviando..." : value ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
        </button>
        {value ? (
          <button type="button" className="ml-3 font-semibold text-burgundy hover:underline" onClick={() => onChange("")}>
            Remover
          </button>
        ) : null}
        {error ? <p className="mt-1 text-xs text-burgundy">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
